"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Link2, ChevronRight, Check, RefreshCw, CalendarX } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { GlassCard, CardHeader } from "@/components/ui/GlassCard";

interface UpcomingEvent {
  id: string;
  title: string;
  startsAt: string | null;
  allDay: boolean;
}

type ConnState = "loading" | "connected" | "disconnected";

/** 구글 일정 시작시각을 한국어 상대 표기로 변환. */
function formatWhen(startsAt: string | null, allDay: boolean): string {
  if (!startsAt) return "";
  const d = new Date(startsAt);
  const today = new Date();
  const dayDiff = Math.round(
    (new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() -
      new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) /
      86400000
  );
  const dayLabel =
    dayDiff === 0 ? "오늘" : dayDiff === 1 ? "내일" : `${d.getMonth() + 1}월 ${d.getDate()}일`;
  if (allDay) return `${dayLabel} · 종일`;
  const time = d.toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit", hour12: true });
  return `${dayLabel} · ${time}`;
}

export function CalendarCard() {
  const [state, setState] = useState<ConnState>("loading");
  const [events, setEvents] = useState<UpcomingEvent[]>([]);

  async function load() {
    setState("loading");
    try {
      const res = await fetch("/api/google/calendar", { cache: "no-store" });
      const data = await res.json();
      if (data.connected) {
        setEvents(data.events ?? []);
        setState("connected");
      } else {
        setState("disconnected");
      }
    } catch {
      setState("disconnected");
    }
  }

  useEffect(() => {
    load();
  }, []);

  // 통합 로그인과 동일한 Google OAuth 흐름. 미연동 사용자가 캘린더/드라이브
  // 권한만 추가로 연결할 때 사용합니다.
  async function connectGoogle() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        scopes:
          "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/drive.file",
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
  }

  return (
    <GlassCard className="flex h-full flex-col">
      <CardHeader
        icon={<CalendarDays className="h-4.5 w-4.5" />}
        title="다가오는 일정"
        hint={state === "connected" ? "Google Calendar · 실시간" : "Google Calendar 연동"}
        action={
          state === "connected" ? (
            <div className="flex items-center gap-1.5">
              <span className="flex items-center gap-1 rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-[11px] text-emerald-300">
                <Check className="h-3 w-3" /> 연동됨
              </span>
              <button
                onClick={load}
                className="flex h-[26px] w-[26px] items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-zinc-400 transition-all duration-300 ease-out-back hover:scale-102 hover:bg-white/[0.08]"
                aria-label="새로고침"
              >
                <RefreshCw className="h-3 w-3" />
              </button>
            </div>
          ) : state === "disconnected" ? (
            <button
              onClick={connectGoogle}
              className="flex items-center gap-1 rounded-lg border border-accent/30 bg-accent/15 px-2 py-1 text-[11px] text-accent transition-all duration-300 ease-out-back hover:scale-102 hover:bg-accent/25"
            >
              <Link2 className="h-3 w-3" /> 연동하기
            </button>
          ) : (
            <span className="text-[11px] text-zinc-600">확인 중…</span>
          )
        }
      />

      {state === "loading" && (
        <div className="flex flex-1 items-center justify-center text-sm text-zinc-600">
          불러오는 중…
        </div>
      )}

      {state === "disconnected" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <Link2 className="h-7 w-7 text-zinc-600" />
          <p className="prose-ko text-sm text-zinc-400">
            Google 캘린더를 연동하면
            <br />
            실제 일정이 여기에 표시됩니다.
          </p>
          <button
            onClick={connectGoogle}
            className="rounded-xl bg-accent/90 px-4 py-2 text-sm font-medium text-ink-900 transition-all duration-300 ease-out-back hover:scale-102 hover:bg-accent"
          >
            Google 캘린더 연동
          </button>
        </div>
      )}

      {state === "connected" && events.length === 0 && (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-zinc-500">
          <CalendarX className="h-7 w-7 text-zinc-600" />
          <p className="text-sm">예정된 일정이 없습니다.</p>
        </div>
      )}

      {state === "connected" && events.length > 0 && (
        <ul className="flex-1 space-y-2.5">
          {events.map((e) => (
            <li
              key={e.id}
              className="group flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5 transition-all duration-300 ease-out-back hover:translate-x-0.5 hover:bg-white/[0.06]"
            >
              <span className="h-9 w-1 rounded-full bg-accent-cool" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-zinc-100">{e.title}</p>
                <p className="text-[11px] text-zinc-500">{formatWhen(e.startsAt, e.allDay)}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-zinc-600 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-400" />
            </li>
          ))}
        </ul>
      )}
    </GlassCard>
  );
}
