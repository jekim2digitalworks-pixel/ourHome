"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  Link2,
  CalendarDays,
  Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { GlassCard } from "@/components/ui/GlassCard";

interface CalEvent {
  id: string;
  title: string;
  startsAt: string | null;
  endsAt: string | null;
  allDay: boolean;
}

interface Holiday {
  date: string; // YYYY-MM-DD
  title: string;
  isPublic: boolean; // true=법정공휴일/대체공휴일(빨간날), false=기념일
}

type ConnState = "loading" | "connected" | "disconnected";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const MONTHS = Array.from({ length: 12 }, (_, i) => `${i + 1}월`);

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}
function eventDayKey(ev: CalEvent) {
  if (!ev.startsAt) return "";
  return dayKey(new Date(ev.startsAt));
}
function fmtTime(iso: string | null, allDay: boolean) {
  if (!iso) return "";
  if (allDay) return "종일";
  return new Date(iso).toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit", hour12: true });
}

/** 연동 on/off 토글 스위치. */
function ConnectionToggle({
  state,
  onToggle,
}: {
  state: ConnState;
  onToggle: (next: boolean) => void;
}) {
  const on = state === "connected";
  const loading = state === "loading";
  return (
    <div className="flex items-center gap-2">
      <span className={`text-xs ${on ? "text-emerald-300" : "text-zinc-500"}`}>
        {loading ? "확인 중" : on ? "연동됨" : "연동 꺼짐"}
      </span>
      <button
        role="switch"
        aria-checked={on}
        disabled={loading}
        onClick={() => onToggle(!on)}
        className={[
          "relative h-6 w-11 shrink-0 rounded-full transition-all duration-300 ease-out-back disabled:opacity-50",
          on ? "bg-emerald-500/80" : "bg-white/10",
        ].join(" ")}
        title={on ? "클릭하면 연동 해제" : "클릭하면 Google 캘린더 연동"}
      >
        <span
          className={[
            "absolute top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow transition-all duration-300 ease-out-back",
            on ? "left-[22px]" : "left-0.5",
          ].join(" ")}
        >
          {loading && <Loader2 className="h-3 w-3 animate-spin text-zinc-500" />}
        </span>
      </button>
    </div>
  );
}

export function CalendarBoard() {
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [state, setState] = useState<ConnState>("loading");
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [selected, setSelected] = useState<string>(dayKey(today));
  const [busy, setBusy] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(today.getFullYear());

  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");

  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const load = useCallback(async () => {
    setState("loading");
    const timeMin = new Date(year, month, 1).toISOString();
    const timeMax = new Date(year, month + 1, 1).toISOString();
    try {
      const res = await fetch(`/api/google/calendar?timeMin=${timeMin}&timeMax=${timeMax}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (data.connected) {
        setEvents(data.events ?? []);
        setHolidays(data.holidays ?? []);
        setState("connected");
      } else {
        setEvents([]);
        setHolidays([]);
        setState("disconnected");
      }
    } catch {
      setState("disconnected");
    }
  }, [year, month]);

  useEffect(() => {
    load();
  }, [load]);

  const byDay = useMemo(() => {
    const map: Record<string, CalEvent[]> = {};
    for (const ev of events) {
      const k = eventDayKey(ev);
      if (!k) continue;
      (map[k] ??= []).push(ev);
    }
    return map;
  }, [events]);

  // 날짜별 공휴일/기념일 조회 (한 날에 여러 개일 수 있음)
  const holidayByDay = useMemo(() => {
    const map: Record<string, Holiday[]> = {};
    for (const h of holidays) (map[h.date] ??= []).push(h);
    return map;
  }, [holidays]);

  const cells = useMemo(() => {
    const firstDow = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const arr: (Date | null)[] = [];
    for (let i = 0; i < firstDow; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(new Date(year, month, d));
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [year, month]);

  const selectedEvents = byDay[selected] ?? [];

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

  async function handleToggle(next: boolean) {
    if (next) {
      // 연동 켜기 → Google 동의 화면으로 이동
      await connectGoogle();
    } else {
      // 연동 끄기 → 토큰 폐기
      if (!confirm("Google 캘린더 연동을 해제할까요? 다시 켤 때 재동의가 필요합니다.")) return;
      setState("loading");
      await fetch("/api/google/disconnect", { method: "POST" });
      await load();
    }
  }

  function pickMonth(m: number) {
    setCursor(new Date(pickerYear, m, 1));
    setPickerOpen(false);
  }

  async function addEvent() {
    if (!title.trim()) return;
    setBusy(true);
    const allDay = !time;
    let startsAt: string;
    let endsAt: string;
    if (allDay) {
      startsAt = selected;
      endsAt = selected;
    } else {
      const [hh, mm] = time.split(":").map(Number);
      const [y, mo, d] = selected.split("-").map(Number);
      const s = new Date(y, mo - 1, d, hh, mm);
      startsAt = s.toISOString();
      endsAt = new Date(s.getTime() + 60 * 60 * 1000).toISOString();
    }
    try {
      await fetch("/api/google/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), startsAt, endsAt, allDay }),
      });
      setTitle("");
      setTime("");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function removeEvent(id: string) {
    setBusy(true);
    try {
      await fetch(`/api/google/calendar?googleEventId=${encodeURIComponent(id)}`, { method: "DELETE" });
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <GlassCard className="flex flex-col gap-5 lg:flex-row">
      {/* ── 달력 ── */}
      <div className="min-w-0 flex-1">
        {/* 헤더 */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex items-center gap-1.5">
            <button
              onClick={() => {
                setPickerYear(year);
                setPickerOpen((v) => !v);
              }}
              className="flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-lg font-semibold tracking-tight text-zinc-100 transition-all duration-300 ease-out-back hover:bg-white/[0.06]"
            >
              {year}년 {month + 1}월
              <ChevronDown
                className={`h-4 w-4 text-zinc-400 transition-transform ${pickerOpen ? "rotate-180" : ""}`}
              />
            </button>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCursor(new Date(year, month - 1, 1))}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-zinc-300 transition-all duration-300 ease-out-back hover:scale-102 hover:bg-white/[0.08]"
                aria-label="이전 달"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  setCursor(new Date(today.getFullYear(), today.getMonth(), 1));
                  setSelected(dayKey(today));
                }}
                className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-zinc-300 transition-all duration-300 ease-out-back hover:scale-102 hover:bg-white/[0.08]"
              >
                오늘
              </button>
              <button
                onClick={() => setCursor(new Date(year, month + 1, 1))}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-zinc-300 transition-all duration-300 ease-out-back hover:scale-102 hover:bg-white/[0.08]"
                aria-label="다음 달"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* 연/월 피커 드롭다운 */}
            {pickerOpen && (
              <>
                <button
                  className="fixed inset-0 z-10 cursor-default"
                  onClick={() => setPickerOpen(false)}
                  aria-label="닫기"
                  tabIndex={-1}
                />
                <div className="absolute left-0 top-12 z-20 w-64 rounded-2xl border border-white/10 bg-ink-800 p-3 shadow-bezel-lg ring-1 ring-black/40">
                  <div className="mb-2 flex items-center justify-between">
                    <button
                      onClick={() => setPickerYear((y) => y - 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-white/10"
                      aria-label="이전 연도"
                    >
                      <ChevronLeft className="h-4 w-4 text-zinc-300" />
                    </button>
                    <span className="text-sm font-semibold text-zinc-100">{pickerYear}년</span>
                    <button
                      onClick={() => setPickerYear((y) => y + 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-white/10"
                      aria-label="다음 연도"
                    >
                      <ChevronRight className="h-4 w-4 text-zinc-300" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {MONTHS.map((label, m) => {
                      const isCurrent = pickerYear === year && m === month;
                      const isThisMonth =
                        pickerYear === today.getFullYear() && m === today.getMonth();
                      return (
                        <button
                          key={label}
                          onClick={() => pickMonth(m)}
                          className={[
                            "rounded-lg py-2 text-sm transition-all duration-300 ease-out-back hover:scale-102",
                            isCurrent
                              ? "bg-accent text-ink-900 font-semibold"
                              : isThisMonth
                              ? "bg-white/10 text-accent"
                              : "text-zinc-300 hover:bg-white/[0.06]",
                          ].join(" ")}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          <ConnectionToggle state={state} onToggle={handleToggle} />
        </div>

        {state === "disconnected" ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/5 bg-white/[0.02] py-16 text-center">
            <Link2 className="h-7 w-7 text-zinc-600" />
            <p className="prose-ko text-sm text-zinc-400">
              위 토글을 켜면 Google 캘린더가 연동되어
              <br />
              실제 일정이 달력에 표시됩니다.
            </p>
          </div>
        ) : (
          <div className="select-none">
            {/* 요일 */}
            <div className="mb-1.5 grid grid-cols-7">
              {WEEKDAYS.map((w, i) => (
                <div
                  key={w}
                  className={[
                    "py-1 text-center text-[11px] font-medium",
                    i === 0 ? "text-rose-300/80" : i === 6 ? "text-sky-300/80" : "text-zinc-500",
                  ].join(" ")}
                >
                  {w}
                </div>
              ))}
            </div>
            {/* 날짜 */}
            <div className="grid grid-cols-7 gap-1.5">
              {cells.map((d, i) => {
                if (!d) return <div key={`e${i}`} className="min-h-[64px] sm:min-h-[88px]" />;
                const k = dayKey(d);
                const isToday = k === dayKey(today);
                const isSelected = k === selected;
                const dayEvents = byDay[k] ?? [];
                const dayHols = holidayByDay[k] ?? [];
                const publicHol = dayHols.find((h) => h.isPublic);
                const dow = d.getDay();
                // 공휴일이거나 일요일이면 빨간 날짜
                const isRed = dow === 0 || !!publicHol;
                return (
                  <button
                    key={k}
                    onClick={() => setSelected(k)}
                    className={[
                      "flex min-h-[64px] flex-col gap-1 rounded-xl border p-1.5 text-left transition-all duration-300 ease-out-back sm:min-h-[88px]",
                      isSelected
                        ? "border-accent/50 bg-accent/10 shadow-bezel"
                        : publicHol
                        ? "border-rose-400/20 bg-rose-400/[0.04] hover:bg-rose-400/[0.08]"
                        : "border-white/[0.06] bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.05]",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "flex h-6 w-6 items-center justify-center rounded-full text-xs",
                        isToday
                          ? "bg-accent font-bold text-ink-900"
                          : isRed
                          ? "text-rose-300/90"
                          : dow === 6
                          ? "text-sky-300/90"
                          : "text-zinc-300",
                      ].join(" ")}
                    >
                      {d.getDate()}
                    </span>
                    <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden">
                      {/* 공휴일/기념일 칩 */}
                      {dayHols.map((h) => (
                        <span
                          key={h.title}
                          className={[
                            "truncate rounded-md px-1 py-px text-[10px] leading-tight",
                            h.isPublic
                              ? "bg-rose-400/20 text-rose-200"
                              : "bg-white/[0.06] text-zinc-400",
                          ].join(" ")}
                          title={h.title}
                        >
                          {h.title}
                        </span>
                      ))}
                      {dayEvents.slice(0, 3 - Math.min(dayHols.length, 2)).map((ev) => (
                        <span
                          key={ev.id}
                          className="truncate rounded-md bg-accent-cool/20 px-1 py-px text-[10px] leading-tight text-accent-cool"
                          title={ev.title}
                        >
                          {ev.allDay ? "" : "• "}
                          {ev.title}
                        </span>
                      ))}
                      {dayEvents.length > 3 - Math.min(dayHols.length, 2) && (
                        <span className="px-1 text-[10px] text-zinc-500">
                          +{dayEvents.length - (3 - Math.min(dayHols.length, 2))}건
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── 선택한 날짜 패널 ── */}
      {state === "connected" && (
        <div className="w-full shrink-0 border-t border-white/5 pt-5 lg:w-72 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
          <div className="mb-3 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-accent" />
            <h3 className="text-sm font-semibold text-zinc-100">
              {Number(selected.slice(5, 7))}월 {Number(selected.slice(8, 10))}일
            </h3>
            <span className="text-[11px] text-zinc-500">{selectedEvents.length}건</span>
          </div>

          {(holidayByDay[selected] ?? []).map((h) => (
            <div
              key={h.title}
              className={[
                "mb-2 flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs",
                h.isPublic
                  ? "border-rose-400/20 bg-rose-400/10 text-rose-200"
                  : "border-white/10 bg-white/[0.04] text-zinc-400",
              ].join(" ")}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${h.isPublic ? "bg-rose-400" : "bg-zinc-500"}`} />
              {h.title}
              {h.isPublic && <span className="text-rose-300/70">· 공휴일</span>}
            </div>
          ))}

          <ul className="mb-4 space-y-2">
            {selectedEvents.length === 0 && (
              <li className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-3 text-center text-xs text-zinc-500">
                일정이 없습니다.
              </li>
            )}
            {selectedEvents.map((ev) => (
              <li
                key={ev.id}
                className="group flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2"
              >
                <span className="h-7 w-1 rounded-full bg-accent-cool" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-zinc-100">{ev.title}</p>
                  <p className="text-[11px] text-zinc-500">{fmtTime(ev.startsAt, ev.allDay)}</p>
                </div>
                <button
                  onClick={() => removeEvent(ev.id)}
                  disabled={busy}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-zinc-500 opacity-0 transition-all duration-300 ease-out-back hover:bg-rose-400/10 hover:text-rose-300 group-hover:opacity-100 disabled:opacity-30"
                  aria-label="삭제"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>

          <div className="space-y-2 rounded-2xl border border-white/5 bg-white/[0.02] p-3">
            <p className="text-[11px] font-medium text-zinc-400">이 날에 일정 추가</p>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addEvent()}
              placeholder="일정 제목"
              className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-accent/40 focus:outline-none"
            />
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-zinc-100 focus:border-accent/40 focus:outline-none [color-scheme:dark]"
              />
              <button
                onClick={addEvent}
                disabled={busy || !title.trim()}
                className="flex items-center gap-1 rounded-lg bg-accent/90 px-3 py-2 text-sm font-medium text-ink-900 transition-all duration-300 ease-out-back hover:scale-102 hover:bg-accent disabled:opacity-40"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" strokeWidth={2.5} />}
                추가
              </button>
            </div>
            <p className="text-[10px] text-zinc-600">
              시간을 비우면 종일 일정. 추가·삭제는 실제 Google 캘린더에 반영됩니다.
            </p>
          </div>
        </div>
      )}
    </GlassCard>
  );
}
