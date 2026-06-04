"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  Loader2,
  Check,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  CalendarOff,
} from "lucide-react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { GlassCard } from "@/components/ui/GlassCard";

interface Todo {
  id: string;
  category: string;
  due_date: string | null;
  title: string;
  done: boolean;
  done_by: string | null;
  author_id: string;
  created_at: string;
}

/** 기본 카테고리 + 이모지. "직접입력"은 임의 문자열로 저장됩니다. */
const CATEGORIES = [
  { key: "장보기", emoji: "🛒" },
  { key: "육아", emoji: "🍼" },
  { key: "행사", emoji: "🎉" },
  { key: "이벤트", emoji: "🎈" },
  { key: "집안일", emoji: "🧹" },
  { key: "기타", emoji: "📌" },
] as const;
const CUSTOM = "직접입력";
const CUSTOM_EMOJI = "✏️";
const EMOJI = Object.fromEntries(CATEGORIES.map((c) => [c.key, c.emoji])) as Record<string, string>;
const emojiFor = (cat: string) => EMOJI[cat] ?? CUSTOM_EMOJI;

const WD = ["일", "월", "화", "수", "목", "금", "토"];
function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function dateLabel(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const today = dateKey(new Date());
  const base = `${m}월 ${d}일 (${WD[date.getDay()]})`;
  return key === today ? `오늘 · ${base}` : base;
}

interface DateRange {
  start: string;
  end: string;
}
/** 두 날짜 키를 오름차순으로 정렬해 기간으로 만듭니다. */
function ordered(a: string, b: string): DateRange {
  return a <= b ? { start: a, end: b } : { start: b, end: a };
}
function shortLabel(key: string) {
  const [, m, d] = key.split("-").map(Number);
  return `${m}월 ${d}일`;
}
function rangeLabel(r: DateRange | null) {
  if (!r) return "전체 보기";
  return r.start === r.end ? dateLabel(r.start) : `${shortLabel(r.start)} ~ ${shortLabel(r.end)}`;
}

export function TodoBoard({
  familyId,
  currentUserId,
  members,
}: {
  familyId: string;
  currentUserId: string;
  members: Record<string, { name: string; avatar: string | null }>;
}) {
  const [items, setItems] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState(false);

  // 입력 상태
  const [category, setCategory] = useState<string>("집안일");
  const [customCat, setCustomCat] = useState("");
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState<string>("");
  const [err, setErr] = useState<string | null>(null);

  // 날짜(캘린더) 필터: null = 전체. start~end 기간(같으면 하루).
  const [filterRange, setFilterRange] = useState<DateRange | null>(null);
  const [calOpen, setCalOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("todos")
      .select("id, category, due_date, title, done, done_by, author_id, created_at")
      .eq("family_id", familyId)
      .order("created_at", { ascending: false });
    setItems((data as Todo[]) ?? []);
    setLoading(false);
  }, [familyId]);

  useEffect(() => {
    load();
  }, [load]);

  // 실시간: 추가/체크/삭제를 배우자 화면에 즉시 반영.
  useEffect(() => {
    const supabase = createClient();
    const ch = supabase
      .channel(`todos:${familyId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "todos", filter: `family_id=eq.${familyId}` },
        () => load()
      )
      .subscribe((s) => setLive(s === "SUBSCRIBED"));
    return () => {
      supabase.removeChannel(ch);
    };
  }, [familyId, load]);

  // 날짜 필터(기간) 적용 + 미완료 먼저, 그다음 완료.
  const visible = useMemo(() => {
    const filtered = filterRange
      ? items.filter(
          (t) => t.due_date && t.due_date >= filterRange.start && t.due_date <= filterRange.end
        )
      : items;
    return [...filtered].sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      // 같은 완료상태: 날짜 있는 항목을 날짜순, 없는 항목은 뒤로
      const ad = a.due_date ?? "9999-99-99";
      const bd = b.due_date ?? "9999-99-99";
      if (ad !== bd) return ad < bd ? -1 : 1;
      return a.created_at < b.created_at ? 1 : -1;
    });
  }, [items, filterRange]);

  const total = visible.length;
  const doneCount = visible.filter((t) => t.done).length;
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  async function add() {
    const trimmed = title.trim();
    if (!trimmed) {
      setErr("할 일 내용을 입력해 주세요.");
      return;
    }
    if (!dueDate) {
      setErr("날짜를 선택해 주세요.");
      return;
    }
    setErr(null);
    const cat = category === CUSTOM ? customCat.trim() || "기타" : category;
    setBusy(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("todos")
      .insert({
        family_id: familyId,
        author_id: currentUserId,
        category: cat,
        due_date: dueDate || null,
        title: trimmed,
      })
      .select("id, category, due_date, title, done, done_by, author_id, created_at")
      .single();
    if (data) setItems((prev) => (prev.some((t) => t.id === data.id) ? prev : [data as Todo, ...prev]));
    setTitle("");
    setBusy(false);
  }

  async function toggle(t: Todo) {
    const next = !t.done;
    setItems((prev) =>
      prev.map((x) => (x.id === t.id ? { ...x, done: next, done_by: next ? currentUserId : null } : x))
    );
    const supabase = createClient();
    await supabase
      .from("todos")
      .update({ done: next, done_by: next ? currentUserId : null, done_at: next ? new Date().toISOString() : null })
      .eq("id", t.id);
  }

  async function remove(id: string) {
    setItems((prev) => prev.filter((x) => x.id !== id));
    const supabase = createClient();
    await supabase.from("todos").delete().eq("id", id);
  }

  return (
    <GlassCard className="flex flex-col">
      {/* 헤더 */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-zinc-100">가사 일 같이하기</h2>
          <p className="text-xs text-zinc-500">함께 나누는 우리 집 할 일</p>
        </div>
        <span className="flex items-center gap-1.5 text-[11px] text-zinc-400">
          <span className={`h-1.5 w-1.5 rounded-full ${live ? "animate-pulse bg-emerald-400" : "bg-zinc-600"}`} />
          {live ? "실시간" : "연결 중"}
        </span>
      </div>

      {/* 입력 — 카테고리 칩 */}
      <div className="mb-2.5 flex flex-wrap gap-1.5">
        {CATEGORIES.map(({ key, emoji }) => (
          <button
            key={key}
            onClick={() => setCategory(key)}
            className={[
              "flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs transition-all duration-300 ease-out-back",
              category === key
                ? "border-accent/50 bg-accent/15 text-zinc-100"
                : "border-white/10 bg-white/[0.04] text-zinc-400 hover:bg-white/[0.07]",
            ].join(" ")}
          >
            <span>{emoji}</span>
            {key}
          </button>
        ))}
        <button
          onClick={() => setCategory(CUSTOM)}
          className={[
            "flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs transition-all duration-300 ease-out-back",
            category === CUSTOM
              ? "border-accent/50 bg-accent/15 text-zinc-100"
              : "border-white/10 bg-white/[0.04] text-zinc-400 hover:bg-white/[0.07]",
          ].join(" ")}
        >
          <span>{CUSTOM_EMOJI}</span>
          {CUSTOM}
        </button>
      </div>

      {/* 직접입력 카테고리명 */}
      {category === CUSTOM && (
        <input
          value={customCat}
          onChange={(e) => setCustomCat(e.target.value)}
          placeholder="카테고리 이름 (예: 반려동물)"
          className="mb-2.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-accent/40 focus:outline-none"
        />
      )}

      {/* 입력 — 제목 + 날짜 + 등록 */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (err) setErr(null);
          }}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="할 일 (예: 화장실 청소)"
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-accent/40 focus:outline-none"
        />
        <input
          type="date"
          value={dueDate}
          onChange={(e) => {
            setDueDate(e.target.value);
            if (err) setErr(null);
          }}
          className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-zinc-300 [color-scheme:dark] focus:border-accent/40 focus:outline-none"
        />
        <button
          onClick={add}
          disabled={busy || !title.trim() || !dueDate}
          className="flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-ink-900 transition-all duration-300 ease-out-back hover:scale-102 hover:bg-accent-soft disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" strokeWidth={2.5} />}
          등록
        </button>
      </div>

      {/* 유효성 안내 */}
      <p className={`mb-4 mt-1.5 text-[11px] ${err ? "text-rose-300" : "text-zinc-600"}`}>
        {err ?? "날짜를 선택해야 등록할 수 있어요."}
      </p>

      {/* 날짜(캘린더) 필터 — 클릭 시 달력 모달, 드래그로 기간 선택 */}
      <div className="mb-3 flex items-center gap-2">
        <button
          onClick={() => setCalOpen(true)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-zinc-200 transition hover:bg-white/[0.08]"
        >
          <CalendarDays className="h-4 w-4 text-accent" />
          {rangeLabel(filterRange)}
        </button>
        <button
          onClick={() => setFilterRange(null)}
          disabled={!filterRange}
          className="flex shrink-0 items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-zinc-400 transition hover:bg-white/[0.08] disabled:opacity-40"
        >
          <CalendarOff className="h-3.5 w-3.5" /> 전체
        </button>
      </div>

      {calOpen && (
        <RangeCalendarModal
          initial={filterRange}
          onApply={(r) => {
            setFilterRange(r);
            setCalOpen(false);
          }}
          onClose={() => setCalOpen(false)}
        />
      )}

      {/* 진행률 */}
      {total > 0 && (
        <div className="mb-3">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-zinc-500">
              <span className="text-zinc-200">{doneCount}</span> / {total} 완료
            </span>
            <span className="text-zinc-500">{pct}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent-soft to-accent transition-all duration-500 ease-out-back"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {/* 목록 */}
      {loading ? (
        <div className="flex items-center justify-center py-10 text-sm text-zinc-600">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 불러오는 중…
        </div>
      ) : visible.length === 0 ? (
        <div className="py-10 text-center text-sm text-zinc-500">
          {filterRange ? "이 기간에 등록된 일이 없어요." : "할 일이 없어요. 위에서 함께 추가해보세요."}
        </div>
      ) : (
        <ul className="space-y-1.5">
          {visible.map((t) => {
            const doneBy = t.done && t.done_by ? members[t.done_by] : null;
            return (
              <li
                key={t.id}
                className={[
                  "group flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all duration-300",
                  t.done
                    ? "border-white/5 bg-white/[0.015] opacity-60"
                    : "border-white/10 bg-white/[0.04] hover:bg-white/[0.06]",
                ].join(" ")}
              >
                <button
                  onClick={() => toggle(t)}
                  className={[
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all duration-300 ease-out-back",
                    t.done
                      ? "border-emerald-400 bg-emerald-400 text-ink-900"
                      : "border-white/25 text-transparent hover:border-accent/70 hover:scale-110",
                  ].join(" ")}
                  aria-label={t.done ? "완료 해제" : "완료"}
                  aria-pressed={t.done}
                >
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </button>

                {/* 카테고리 이모지 배지 */}
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.05] text-sm"
                  title={t.category}
                >
                  {emojiFor(t.category)}
                </span>

                <div className="min-w-0 flex-1">
                  <span
                    className={[
                      "block truncate text-sm",
                      t.done ? "text-zinc-500 line-through" : "text-zinc-100",
                    ].join(" ")}
                  >
                    {t.title}
                  </span>
                  <span className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                    <span>{t.category}</span>
                    {t.due_date && (
                      <>
                        <span className="text-zinc-700">·</span>
                        <span className="inline-flex items-center gap-0.5">
                          <CalendarDays className="h-3 w-3" />
                          {dateLabel(t.due_date)}
                        </span>
                      </>
                    )}
                  </span>
                </div>

                {t.done ? (
                  <span className="shrink-0 rounded-md bg-emerald-400/10 px-1.5 py-0.5 text-[10px] text-emerald-300">
                    {doneBy ? `${doneBy.name} 완료` : "완료"}
                  </span>
                ) : (
                  <span className="shrink-0 rounded-md bg-amber-300/10 px-1.5 py-0.5 text-[10px] text-amber-200/90">
                    진행 전
                  </span>
                )}

                <button
                  onClick={() => remove(t.id)}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-zinc-600 opacity-0 transition hover:bg-rose-400/10 hover:text-rose-300 group-hover:opacity-100"
                  aria-label="삭제"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </GlassCard>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * 기간 선택 캘린더 모달
 * - 날짜를 클릭하면 하루 선택, 드래그하면 그 사이 기간을 선택합니다.
 * - 마우스: 누른 채 끌기 / 터치·재클릭: 시작일 탭 → 종료일 탭.
 * ──────────────────────────────────────────────────────────────────────────── */
function RangeCalendarModal({
  initial,
  onApply,
  onClose,
}: {
  initial: DateRange | null;
  onApply: (r: DateRange | null) => void;
  onClose: () => void;
}) {
  const base = initial ? new Date(initial.start) : new Date();
  const [viewY, setViewY] = useState(base.getFullYear());
  const [viewM, setViewM] = useState(base.getMonth()); // 0-indexed
  const [draft, setDraft] = useState<DateRange | null>(initial);
  const [anchor, setAnchor] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  // 드래그 종료는 어디서 손을 떼든 처리.
  useEffect(() => {
    const up = () => setDragging(false);
    window.addEventListener("pointerup", up);
    return () => window.removeEventListener("pointerup", up);
  }, []);

  // 달력 셀: 앞쪽 빈칸 + 1..말일
  const firstDay = new Date(viewY, viewM, 1).getDay();
  const daysInMonth = new Date(viewY, viewM + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => dateKey(new Date(viewY, viewM, i + 1))),
  ];

  function prevMonth() {
    const d = new Date(viewY, viewM - 1, 1);
    setViewY(d.getFullYear());
    setViewM(d.getMonth());
  }
  function nextMonth() {
    const d = new Date(viewY, viewM + 1, 1);
    setViewY(d.getFullYear());
    setViewM(d.getMonth());
  }

  function down(key: string) {
    // 이미 하루만 선택된 상태에서 다른 날을 누르면 "재클릭 기간 선택".
    if (!dragging && draft && draft.start === draft.end && draft.start !== key) {
      setDraft(ordered(draft.start, key));
      return;
    }
    setAnchor(key);
    setDraft({ start: key, end: key });
    setDragging(true);
  }
  function enter(key: string) {
    if (dragging && anchor) setDraft(ordered(anchor, key));
  }

  function inRange(key: string) {
    return draft ? key >= draft.start && key <= draft.end : false;
  }
  const todayK = dateKey(new Date());

  function quick(deltaDays: number) {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - deltaDays);
    setDraft(ordered(dateKey(start), dateKey(end)));
    setViewY(end.getFullYear());
    setViewM(end.getMonth());
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xs rounded-2xl border border-white/10 bg-zinc-900 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더: 월 이동 */}
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={prevMonth}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-zinc-400 transition hover:bg-white/[0.08]"
            aria-label="이전 달"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold text-zinc-100">
            {viewY}년 {viewM + 1}월
          </span>
          <button
            onClick={nextMonth}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-zinc-400 transition hover:bg-white/[0.08]"
            aria-label="다음 달"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* 요일 */}
        <div className="mb-1 grid grid-cols-7 text-center text-[10px] text-zinc-600">
          {WD.map((w) => (
            <span key={w} className="py-1">
              {w}
            </span>
          ))}
        </div>

        {/* 날짜 그리드 (드래그 선택) */}
        <div className="grid grid-cols-7 gap-y-1 select-none" style={{ touchAction: "none" }}>
          {cells.map((key, i) =>
            key === null ? (
              <span key={`e${i}`} />
            ) : (
              (() => {
                const sel = inRange(key);
                const isStart = draft && key === draft.start;
                const isEnd = draft && key === draft.end;
                const edge = isStart || isEnd;
                return (
                  <button
                    key={key}
                    onPointerDown={() => down(key)}
                    onPointerEnter={() => enter(key)}
                    className={[
                      "mx-auto flex h-8 w-8 items-center justify-center rounded-lg text-xs transition-colors",
                      edge
                        ? "bg-accent font-semibold text-ink-900"
                        : sel
                          ? "bg-accent/20 text-zinc-100"
                          : "text-zinc-300 hover:bg-white/[0.06]",
                      !sel && key === todayK ? "ring-1 ring-accent/40" : "",
                    ].join(" ")}
                  >
                    {Number(key.split("-")[2])}
                  </button>
                );
              })()
            )
          )}
        </div>

        {/* 빠른 선택 */}
        <div className="mt-4 flex gap-1.5">
          <button
            onClick={() => quick(0)}
            className="flex-1 rounded-lg border border-white/10 bg-white/[0.04] py-1.5 text-[11px] text-zinc-300 transition hover:bg-white/[0.08]"
          >
            오늘
          </button>
          <button
            onClick={() => quick(6)}
            className="flex-1 rounded-lg border border-white/10 bg-white/[0.04] py-1.5 text-[11px] text-zinc-300 transition hover:bg-white/[0.08]"
          >
            최근 7일
          </button>
          <button
            onClick={() => quick(29)}
            className="flex-1 rounded-lg border border-white/10 bg-white/[0.04] py-1.5 text-[11px] text-zinc-300 transition hover:bg-white/[0.08]"
          >
            최근 30일
          </button>
        </div>

        {/* 선택 요약 + 액션 */}
        <p className="mt-4 text-center text-xs text-zinc-400">{rangeLabel(draft)}</p>
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => onApply(null)}
            className="flex items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-zinc-300 transition hover:bg-white/[0.08]"
          >
            <CalendarOff className="h-4 w-4" /> 전체
          </button>
          <button
            onClick={() => onApply(draft)}
            disabled={!draft}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-ink-900 transition-all duration-300 ease-out-back hover:scale-102 hover:bg-accent-soft disabled:opacity-40"
          >
            <Check className="h-4 w-4" strokeWidth={2.5} /> 이 기간 보기
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
