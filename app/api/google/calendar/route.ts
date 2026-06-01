import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { createClient } from "@/lib/supabase/server";
import { getAuthorizedClient } from "@/lib/google/oauth";

export const runtime = "nodejs";

/**
 * GET  /api/google/calendar  → pull upcoming Google Calendar events.
 * POST /api/google/calendar  → push a native event to Google Calendar and
 *                              store the returned google_event_id for two-way ref.
 * Both rely on getAuthorizedClient(), which silently refreshes the access token.
 */
export async function GET(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const auth = await getAuthorizedClient(user.id);
  const calendar = google.calendar({ version: "v3", auth });

  const { data } = await calendar.events.list({
    calendarId: "primary",
    timeMin: new Date().toISOString(),
    maxResults: 50,
    singleEvents: true,
    orderBy: "startTime",
  });

  return NextResponse.json({ events: data.items ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: profile } = await supabase
    .from("users")
    .select("family_id")
    .eq("id", user.id)
    .single();
  if (!profile?.family_id) return NextResponse.json({ error: "No family" }, { status: 400 });

  const body = (await req.json()) as {
    title: string;
    description?: string;
    startsAt: string;
    endsAt?: string;
  };

  const auth = await getAuthorizedClient(user.id);
  const calendar = google.calendar({ version: "v3", auth });

  const inserted = await calendar.events.insert({
    calendarId: "primary",
    requestBody: {
      summary: body.title,
      description: body.description,
      start: { dateTime: body.startsAt },
      end: { dateTime: body.endsAt ?? body.startsAt },
    },
  });

  // Mirror into our DB so it shows up for the partner without a Google round-trip.
  const { data: event, error } = await supabase
    .from("events")
    .insert({
      family_id: profile.family_id,
      author_id: user.id,
      title: body.title,
      description: body.description ?? null,
      starts_at: body.startsAt,
      ends_at: body.endsAt ?? null,
      google_event_id: inserted.data.id ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ event });
}
