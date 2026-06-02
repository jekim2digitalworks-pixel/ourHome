"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  Pencil,
  X,
  Link2,
  CalendarDays,
  Loader2,
  Cake,
  PartyPopper,
  Trees,
  Plane,
  Tag,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { GlassCard } from "@/components/ui/GlassCard";

type CatKey = "birthday" | "event" | "outing" | "travel" | "etc" | "custom";

interface Category {
  key: CatKey;
  label: string;
  Icon: LucideIcon;
  text: string; // 칩 텍스트색
  bg: string; // 칩 배경
  border: string; // 선택 테두리
  soft: string; // 선택 배경
  solid: string; // 점/바 색
}

// 절제된 저채도 톤으로 카테고리 구분. 직접입력은 보라.
const CATEGORIES: Category[] = [
  { key: "birthday", label: "생일", Icon: Cake, text: "text-rose-200", bg: "bg-rose-400/15", border: "border-rose-400/45", soft: "bg-rose-400/10", solid: "bg-rose-400" },
  { key: "event", label: "행사", Icon: PartyPopper, text: "text-amber-200", bg: "bg-amber-400/15", border: "border-amber-400/45", soft: "bg-amber-400/10", solid: "bg-amber-400" },
  { key: "outing", label: "나들이", Icon: Trees, text: "text-emerald-200", bg: "bg-emerald-400/15", border: "border-emerald-400/45", soft: "bg-emerald-400/10", solid: "bg-emerald-400" },
  { key: "travel", label: "여행", Icon: Plane, text: "text-sky-200", bg: "bg-sky-400/15", border: "border-sky-400/45", soft: "bg-sky-400/10", solid: "bg-sky-400" },
  { key: "etc", label: "기타", Icon: Tag, text: "text-zinc-300", bg: "bg-zinc-400/15", border: "border-zinc-400/45", soft: "bg-zinc-400/10", solid: "bg-zinc-400" },
  { key: "custom", label: "직접입력", Icon: Pencil, text: "text-violet-200", bg: "bg-violet-400/15", border: "border-violet-400/45", soft: "bg-violet-400/10", solid: "bg-violet-400" },
];
const catOf = (k?: string | null): Category => CATEGORIES.find((c) => c.key === k) ?? CATEGORIES[4];

interface CalEvent {
  id: string;
  title: string;
  startsAt: string | null;
  endsAt: string | null;
  allDay: boolean;
  category?: string | null;
  categoryLabel?: string | null;
}

interface Holiday {
  date: string; // YYYY-MM-DD
  title: string;
  isPublic: boolean;
}

type ConnState = "loading" | "connected" | "disconnected";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const MONTHS = Array.from({ length: 12 }, (_, i) => `${i + 1}월`);

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}
function addDaysYMD(ymd: string, n: number) {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + n);
  return dayKey(dt);
}
function mdLabel(ymd: string) {
  return `${Number(ymd.slice(5, 7))}/${Number(ymd.slice(8, 10))}`;
}
function fmtTime(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit", hour12: true });
}
function toHHMM(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** 이벤트가 걸쳐 있는 [시작일, 마지막일] (둘 다 inclusive YYYY-MM-DD). */
function getSpan(ev: CalEvent): { startKey: string; endKey: string } {
  if (!ev.startsAt) return { startKey: "", endKey: "" };
  if (ev.allDay) {
    const startKey = ev.startsAt.slice(0, 10);
    let endKey = ev.endsAt ? ev.endsAt.slice(0, 10) : startKey; // 서버가 inclusive 로 보정해 줌
    if (endKey < startKey) endKey = startKey;
    return { startKey, endKey };
  }
  const s = new Date(ev.startsAt);
  const e = ev.endsAt ? new Date(ev.endsAt) : s;
  return { startKey: dayKey(s), endKey: dayKey(e) };
}

/** 일정의 시각/기간 표시 문자열. */
function fmtWhen(ev: CalEvent) {
  const { startKey, endKey } = getSpan(ev);
  const multi = startKey !== endKey;
  if (ev.allDay) return multi ? `${mdLabel(startKey)} ~ ${mdLabel(endKey)} · 종일` : "종일";
  const t = fmtTime(ev.startsAt);
  if (multi) return `${mdLabel(startKey)} ${t} ~ ${mdLabel(endKey)} ${fmtTime(ev.endsAt)}`;
  return ev.endsAt ? `${t} ~ ${fmtTime(ev.endsAt)}` : t;
}

/** 연동 on/off 토글 스위치. */
function ConnectionToggle({ state, onToggle }: { state: ConnState; onToggle: (next: boolean) => void }) {
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

interface FormState {
  editingId: string | null;
  title: string;
  category: CatKey;
  customCategory: string;
  allDay: boolean;
  startTime: string;
  endTime: string;
}
const addDefaults = (): FormState => ({
  editingId: null,
  title: "",
  category: "etc",
  customCategory: "",
  allDay: true,
  startTime: "",
  endTime: "",
});

export function CalendarBoard() {
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [state, setState] = useState<ConnState>("loading");
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [busy, setBusy] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(today.getFullYear());

  // 선택/생성 대상 기간 (inclusive). 단일 날짜면 start===end.
  const [rangeStart, setRangeStart] = useState(dayKey(today));
  const [rangeEnd, setRangeEnd] = useState(dayKey(today));
  const [form, setForm] = useState<FormState>(addDefaults());

  // 드래그 선택 상태(refs — window mouseup 핸들러에서 최신값 사용).
  const draggingRef = useRef(false);
  const anchorRef = useRef<string | null>(null);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const setRange = useCallback((a: string, b: string) => {
    const [s, e] = a <= b ? [a, b] : [b, a];
    setRangeStart(s);
    setRangeEnd(e);
  }, []);

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

  // 드래그 종료 → 새 선택을 추가 모드로 확정.
  useEffect(() => {
    const onUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      anchorRef.current = null;
      setForm(addDefaults());
    };
    window.addEventListener("mouseup", onUp);
    return () => window.removeEventListener("mouseup", onUp);
  }, []);

  // 이벤트를 걸친 모든 날짜에 배치(다일 일정은 여러 칸에 표시).
  const spanByDay = useMemo(() => {
    const map: Record<string, CalEvent[]> = {};
    for (const ev of events) {
      const { startKey, endKey } = getSpan(ev);
      if (!startKey) continue;
      let cur = startKey;
      let guard = 0;
      while (cur <= endKey && guard < 400) {
        (map[cur] ??= []).push(ev);
        cur = addDaysYMD(cur, 1);
        guard++;
      }
    }
    return map;
  }, [events]);

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

  // 선택 기간과 겹치는 일정 + 그 안의 공휴일.
  const panelEvents = useMemo(
    () =>
      events.filter((ev) => {
        const { startKey, endKey } = getSpan(ev);
        return startKey && startKey <= rangeEnd && endKey >= rangeStart;
      }),
    [events, rangeStart, rangeEnd]
  );
  const rangeHolidays = useMemo(
    () => holidays.filter((h) => h.date >= rangeStart && h.date <= rangeEnd),
    [holidays, rangeStart, rangeEnd]
  );
  const isMultiDay = rangeStart !== rangeEnd;

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
      await connectGoogle();
    } else {
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

  // ── 그리드 드래그/클릭 선택 ──
  function beginDrag(k: string, e: React.MouseEvent) {
    e.preventDefault();
    draggingRef.current = true;
    anchorRef.current = k;
    setRange(k, k);
  }
  function extendDrag(k: string) {
    if (!draggingRef.current || !anchorRef.current) return;
    setRange(anchorRef.current, k);
  }
  // 키보드 접근성: Enter/Space 로 단일 날짜 선택.
  function selectSingle(k: string) {
    setRange(k, k);
    setForm(addDefaults());
  }

  function resetForm() {
    setForm(addDefaults());
  }

  // 기존 일정 클릭 → 그 기간으로 선택 이동 + 폼 채우고 편집 모드.
  function startEdit(ev: CalEvent) {
    const { startKey, endKey } = getSpan(ev);
    setRange(startKey, endKey);
    setForm({
      editingId: ev.id,
      title: ev.title,
      category: (ev.category as CatKey) ?? "etc",
      customCategory: ev.category === "custom" ? ev.categoryLabel ?? "" : "",
      allDay: ev.allDay,
      startTime: ev.allDay ? "" : toHHMM(ev.startsAt),
      endTime: ev.allDay ? "" : toHHMM(ev.endsAt),
    });
  }

  function combine(dateYMD: string, time: string) {
    const [y, mo, d] = dateYMD.split("-").map(Number);
    const [hh, mm] = time.split(":").map(Number);
    return new Date(y, mo - 1, d, hh, mm).toISOString();
  }

  async function submitForm() {
    if (!form.title.trim()) return;
    setBusy(true);

    const allDay = form.allDay || !form.startTime;
    let startsAt: string;
    let endsAt: string;
    if (allDay) {
      startsAt = rangeStart;
      endsAt = rangeEnd;
    } else {
      startsAt = combine(rangeStart, form.startTime);
      endsAt = form.endTime
        ? combine(rangeEnd, form.endTime)
        : new Date(new Date(startsAt).getTime() + 60 * 60 * 1000).toISOString();
      if (new Date(endsAt) <= new Date(startsAt)) {
        endsAt = new Date(new Date(startsAt).getTime() + 60 * 60 * 1000).toISOString();
      }
    }

    const cat = catOf(form.category);
    const categoryLabel = form.category === "custom" ? form.customCategory.trim() || "기타" : cat.label;

    try {
      if (form.editingId) {
        await fetch("/api/google/calendar", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            googleEventId: form.editingId,
            title: form.title.trim(),
            startsAt,
            endsAt,
            allDay,
            category: form.category,
            categoryLabel,
          }),
        });
      } else {
        await fetch("/api/google/calendar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: form.title.trim(),
            startsAt,
            endsAt,
            allDay,
            category: form.category,
            categoryLabel,
          }),
        });
      }
      resetForm();
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function removeEvent(id: string) {
    setBusy(true);
    try {
      await fetch(`/api/google/calendar?googleEventId=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (form.editingId === id) resetForm();
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
                  selectSingle(dayKey(today));
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
                      const isThisMonth = pickerYear === today.getFullYear() && m === today.getMonth();
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
                const inRange = k >= rangeStart && k <= rangeEnd;
                const isEnd = k === rangeStart || k === rangeEnd;
                const dayEvents = spanByDay[k] ?? [];
                const dayHols = holidayByDay[k] ?? [];
                const publicHol = dayHols.find((h) => h.isPublic);
                const dow = d.getDay();
                const isRed = dow === 0 || !!publicHol;
                return (
                  <button
                    key={k}
                    onMouseDown={(e) => beginDrag(k, e)}
                    onMouseEnter={() => extendDrag(k)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        selectSingle(k);
                      }
                    }}
                    className={[
                      "flex min-h-[64px] flex-col gap-1 rounded-xl border p-1.5 text-left transition-colors duration-200 sm:min-h-[88px]",
                      inRange
                        ? isEnd
                          ? "border-accent/60 bg-accent/15 shadow-bezel"
                          : "border-accent/30 bg-accent/[0.08]"
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
                      {dayHols.map((h) => (
                        <span
                          key={h.title}
                          className={[
                            "truncate rounded-md px-1 py-px text-[10px] leading-tight",
                            h.isPublic ? "bg-rose-400/20 text-rose-200" : "bg-white/[0.06] text-zinc-400",
                          ].join(" ")}
                          title={h.title}
                        >
                          {h.title}
                        </span>
                      ))}
                      {dayEvents.slice(0, 3 - Math.min(dayHols.length, 2)).map((ev) => {
                        const c = catOf(ev.category);
                        return (
                          <span
                            key={ev.id}
                            className={[
                              "flex items-center gap-0.5 truncate rounded-md px-1 py-px text-[10px] leading-tight",
                              c.bg,
                              c.text,
                            ].join(" ")}
                            title={ev.title}
                          >
                            <c.Icon className="h-2.5 w-2.5 shrink-0" />
                            <span className="truncate">{ev.title}</span>
                          </span>
                        );
                      })}
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
            <p className="mt-2 text-[11px] text-zinc-600">
              날짜를 드래그하면 기간이 선택돼요. 클릭은 하루 선택.
            </p>
          </div>
        )}
      </div>

      {/* ── 선택한 기간 패널 ── */}
      {state === "connected" && (
        <div className="w-full shrink-0 border-t border-white/5 pt-5 lg:w-72 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
          <div className="mb-3 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-accent" />
            <h3 className="text-sm font-semibold text-zinc-100">
              {isMultiDay ? `${mdLabel(rangeStart)} ~ ${mdLabel(rangeEnd)}` : `${mdLabel(rangeStart)}`}
            </h3>
            <span className="text-[11px] text-zinc-500">{panelEvents.length}건</span>
          </div>

          {rangeHolidays.map((h) => (
            <div
              key={h.date + h.title}
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
            {panelEvents.length === 0 && (
              <li className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-3 text-center text-xs text-zinc-500">
                일정이 없습니다.
              </li>
            )}
            {panelEvents.map((ev) => {
              const editing = form.editingId === ev.id;
              const c = catOf(ev.category);
              const label = ev.category === "custom" ? ev.categoryLabel || "직접입력" : c.label;
              return (
                <li
                  key={ev.id}
                  className={[
                    "group flex items-center gap-2 rounded-xl border px-3 py-2 transition-colors",
                    editing ? "border-accent/40 bg-accent/10" : "border-white/5 bg-white/[0.03] hover:bg-white/[0.06]",
                  ].join(" ")}
                >
                  <button
                    onClick={() => startEdit(ev)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    title="클릭하여 수정"
                  >
                    <span className={`h-7 w-1 shrink-0 rounded-full ${c.solid}`} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1">
                        <span
                          className={`flex shrink-0 items-center gap-0.5 rounded px-1 py-px text-[9px] ${c.bg} ${c.text}`}
                        >
                          <c.Icon className="h-2.5 w-2.5" />
                          {label}
                        </span>
                        <span className="min-w-0 truncate text-sm text-zinc-100">{ev.title}</span>
                      </span>
                      <span className="mt-0.5 block text-[11px] text-zinc-500">{fmtWhen(ev)}</span>
                    </span>
                  </button>
                  <button
                    onClick={() => startEdit(ev)}
                    disabled={busy}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-zinc-500 opacity-0 transition-all duration-300 ease-out-back hover:bg-white/10 hover:text-zinc-200 group-hover:opacity-100 disabled:opacity-30"
                    aria-label="수정"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => removeEvent(ev.id)}
                    disabled={busy}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-zinc-500 opacity-0 transition-all duration-300 ease-out-back hover:bg-rose-400/10 hover:text-rose-300 group-hover:opacity-100 disabled:opacity-30"
                    aria-label="삭제"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="space-y-2.5 rounded-2xl border border-white/5 bg-white/[0.02] p-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium text-zinc-400">{form.editingId ? "일정 수정" : "일정 추가"}</p>
              {form.editingId && (
                <button
                  onClick={resetForm}
                  className="flex items-center gap-0.5 text-[11px] text-zinc-500 hover:text-zinc-300"
                >
                  <X className="h-3 w-3" /> 취소
                </button>
              )}
            </div>

            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && submitForm()}
              placeholder="일정 제목"
              className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-accent/40 focus:outline-none"
            />

            {/* 카테고리 선택 */}
            <div className="grid grid-cols-3 gap-1.5">
              {CATEGORIES.map((c) => {
                const on = form.category === c.key;
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, category: c.key }))}
                    className={[
                      "flex items-center justify-center gap-1 rounded-lg border px-1.5 py-2 text-[11px] font-medium transition-all duration-200",
                      on ? `${c.border} ${c.soft} ${c.text}` : "border-white/10 bg-white/[0.03] text-zinc-400 hover:bg-white/[0.06]",
                    ].join(" ")}
                  >
                    <c.Icon className="h-3.5 w-3.5 shrink-0" />
                    {c.label}
                  </button>
                );
              })}
            </div>
            {form.category === "custom" && (
              <input
                value={form.customCategory}
                onChange={(e) => setForm((f) => ({ ...f, customCategory: e.target.value }))}
                placeholder="카테고리 직접 입력"
                className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-accent/40 focus:outline-none"
              />
            )}

            {/* 기간 (직접 지정 가능) */}
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={rangeStart}
                onChange={(e) => e.target.value && setRange(e.target.value, rangeEnd)}
                className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-2 text-xs text-zinc-100 focus:border-accent/40 focus:outline-none [color-scheme:dark]"
              />
              <span className="text-xs text-zinc-600">~</span>
              <input
                type="date"
                value={rangeEnd}
                min={rangeStart}
                onChange={(e) => e.target.value && setRange(rangeStart, e.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-2 text-xs text-zinc-100 focus:border-accent/40 focus:outline-none [color-scheme:dark]"
              />
            </div>

            {/* 종일 토글 */}
            <label className="flex cursor-pointer items-center justify-between rounded-lg px-1 py-0.5">
              <span className="text-xs text-zinc-400">종일</span>
              <button
                type="button"
                role="switch"
                aria-checked={form.allDay}
                onClick={() => setForm((f) => ({ ...f, allDay: !f.allDay }))}
                className={[
                  "relative h-5 w-9 rounded-full transition-all duration-300 ease-out-back",
                  form.allDay ? "bg-accent/80" : "bg-white/10",
                ].join(" ")}
              >
                <span
                  className={[
                    "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all duration-300 ease-out-back",
                    form.allDay ? "left-[18px]" : "left-0.5",
                  ].join(" ")}
                />
              </button>
            </label>

            {/* 시간 범위 (종일이면 숨김) */}
            {!form.allDay && (
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                  className="flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-2 text-sm text-zinc-100 focus:border-accent/40 focus:outline-none [color-scheme:dark]"
                />
                <span className="text-xs text-zinc-600">~</span>
                <input
                  type="time"
                  value={form.endTime}
                  onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                  className="flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-2 text-sm text-zinc-100 focus:border-accent/40 focus:outline-none [color-scheme:dark]"
                />
              </div>
            )}

            <button
              onClick={submitForm}
              disabled={busy || !form.title.trim()}
              className="flex w-full items-center justify-center gap-1 rounded-lg bg-accent/90 px-3 py-2 text-sm font-medium text-ink-900 transition-all duration-300 ease-out-back hover:scale-102 hover:bg-accent disabled:opacity-40"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : form.editingId ? (
                <Pencil className="h-4 w-4" strokeWidth={2.5} />
              ) : (
                <Plus className="h-4 w-4" strokeWidth={2.5} />
              )}
              {form.editingId ? "수정 저장" : "추가"}
            </button>

            <p className="text-[10px] text-zinc-600">
              여러 날을 드래그하거나 기간을 직접 정할 수 있어요. 종일을 끄면 시간 일정이 됩니다. 추가·수정·삭제는 실제 Google 캘린더에 반영됩니다.
            </p>
          </div>
        </div>
      )}
    </GlassCard>
  );
}
