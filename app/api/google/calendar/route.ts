import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { createClient } from "@/lib/supabase/server";
import { getAuthorizedClient } from "@/lib/google/oauth";

export const runtime = "nodejs";

/**
 * 구글 기본 캘린더(primary)와 양방향 동기화하는 라우트.
 *  GET    ?timeMin&timeMax   → 기간 내 일정 조회 (미연동이면 connected:false)
 *  POST   {title,startsAt,…} → 일정 생성 (구글에 추가 + 가족 있으면 DB 미러)
 *  PATCH  {googleEventId,…}  → 일정 수정 (구글 반영)
 *  DELETE ?googleEventId      → 일정 삭제 (구글 반영 + DB 미러 정리)
 * 모든 호출은 getAuthorizedClient()가 access token을 자동 갱신합니다.
 */

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function GET(req: NextRequest) {
  const { user } = await requireUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let auth;
  try {
    auth = await getAuthorizedClient(user.id);
  } catch {
    return NextResponse.json({ connected: false, events: [] });
  }

  const url = new URL(req.url);
  const timeMin = url.searchParams.get("timeMin") ?? new Date().toISOString();
  const timeMax = url.searchParams.get("timeMax") ?? undefined;

  const calendar = google.calendar({ version: "v3", auth });
  const { data } = await calendar.events.list({
    calendarId: "primary",
    timeMin,
    timeMax,
    maxResults: 250,
    singleEvents: true,
    orderBy: "startTime",
  });

  const events = (data.items ?? []).map((e) => ({
    id: e.id,
    title: e.summary ?? "(제목 없음)",
    startsAt: e.start?.dateTime ?? e.start?.date ?? null,
    endsAt: e.end?.dateTime ?? e.end?.date ?? null,
    allDay: !e.start?.dateTime,
  }));

  // 대한민국 공휴일 캘린더(공개)도 함께 조회. description이 "공휴일"이면 법정공휴일/
  // 대체공휴일(빨간날), 그 외("기념일")는 어버이날 등 쉬는 날이 아닌 기념일.
  let holidays: { date: string; title: string; isPublic: boolean }[] = [];
  try {
    const holRes = await calendar.events.list({
      calendarId: "ko.south_korea#holiday@group.v.calendar.google.com",
      timeMin,
      timeMax,
      maxResults: 100,
      singleEvents: true,
      orderBy: "startTime",
    });
    holidays = (holRes.data.items ?? [])
      .filter((e) => e.start?.date)
      .map((e) => ({
        date: e.start!.date!,
        title: e.summary ?? "",
        isPublic: (e.description ?? "").startsWith("공휴일"),
      }));
  } catch {
    // 공휴일 캘린더 접근 불가 시 무시 (개인 일정은 정상 표시).
  }

  return NextResponse.json({ connected: true, events, holidays });
}

export async function POST(req: NextRequest) {
  const { supabase, user } = await requireUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = (await req.json()) as {
    title: string;
    description?: string;
    startsAt: string;
    endsAt?: string;
    allDay?: boolean;
  };
  if (!body.title || !body.startsAt) {
    return NextResponse.json({ error: "title과 startsAt은 필수입니다" }, { status: 400 });
  }

  let auth;
  try {
    auth = await getAuthorizedClient(user.id);
  } catch {
    return NextResponse.json({ error: "Google 캘린더가 연동되지 않았습니다" }, { status: 409 });
  }

  const calendar = google.calendar({ version: "v3", auth });
  // 종일 일정은 date, 시간 일정은 dateTime 사용.
  const start = body.allDay
    ? { date: body.startsAt.slice(0, 10) }
    : { dateTime: body.startsAt };
  const end = body.allDay
    ? { date: (body.endsAt ?? body.startsAt).slice(0, 10) }
    : { dateTime: body.endsAt ?? body.startsAt };

  const inserted = await calendar.events.insert({
    calendarId: "primary",
    requestBody: { summary: body.title, description: body.description, start, end },
  });

  // 가족 그룹이 있을 때만 DB에 미러(파트너 화면 공유용). 없으면 구글에만 생성.
  const { data: profile } = await supabase
    .from("users")
    .select("family_id")
    .eq("id", user.id)
    .single();
  if (profile?.family_id) {
    await supabase.from("events").insert({
      family_id: profile.family_id,
      author_id: user.id,
      title: body.title,
      description: body.description ?? null,
      starts_at: body.startsAt,
      ends_at: body.endsAt ?? null,
      google_event_id: inserted.data.id ?? null,
    });
  }

  return NextResponse.json({
    event: {
      id: inserted.data.id,
      title: body.title,
      startsAt: body.startsAt,
      endsAt: body.endsAt ?? null,
      allDay: !!body.allDay,
    },
  });
}

export async function PATCH(req: NextRequest) {
  const { supabase, user } = await requireUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = (await req.json()) as {
    googleEventId: string;
    title?: string;
    startsAt?: string;
    endsAt?: string;
    allDay?: boolean;
  };
  if (!body.googleEventId) {
    return NextResponse.json({ error: "googleEventId는 필수입니다" }, { status: 400 });
  }

  let auth;
  try {
    auth = await getAuthorizedClient(user.id);
  } catch {
    return NextResponse.json({ error: "Google 캘린더가 연동되지 않았습니다" }, { status: 409 });
  }

  const requestBody: Record<string, unknown> = {};
  if (body.title !== undefined) requestBody.summary = body.title;
  if (body.startsAt) {
    requestBody.start = body.allDay ? { date: body.startsAt.slice(0, 10) } : { dateTime: body.startsAt };
  }
  if (body.endsAt) {
    requestBody.end = body.allDay ? { date: body.endsAt.slice(0, 10) } : { dateTime: body.endsAt };
  }

  const calendar = google.calendar({ version: "v3", auth });
  await calendar.events.patch({ calendarId: "primary", eventId: body.googleEventId, requestBody });

  // DB 미러도 갱신(있으면).
  await supabase
    .from("events")
    .update({
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.startsAt ? { starts_at: body.startsAt } : {}),
      ...(body.endsAt ? { ends_at: body.endsAt } : {}),
    })
    .eq("google_event_id", body.googleEventId);

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { supabase, user } = await requireUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const googleEventId = new URL(req.url).searchParams.get("googleEventId");
  if (!googleEventId) {
    return NextResponse.json({ error: "googleEventId는 필수입니다" }, { status: 400 });
  }

  let auth;
  try {
    auth = await getAuthorizedClient(user.id);
  } catch {
    return NextResponse.json({ error: "Google 캘린더가 연동되지 않았습니다" }, { status: 409 });
  }

  const calendar = google.calendar({ version: "v3", auth });
  try {
    await calendar.events.delete({ calendarId: "primary", eventId: googleEventId });
  } catch (e: unknown) {
    // 이미 삭제된 경우(410)는 성공으로 간주.
    const code = (e as { code?: number })?.code;
    if (code !== 410 && code !== 404) throw e;
  }

  await supabase.from("events").delete().eq("google_event_id", googleEventId);

  return NextResponse.json({ ok: true });
}
