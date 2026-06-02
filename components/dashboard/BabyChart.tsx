"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Trash2, Moon, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Json } from "@/lib/supabase/types";
import { GlassCard } from "@/components/ui/GlassCard";

type BabyCategory = "feeding" | "food" | "pee" | "poop" | "sleep" | "bath" | "memo";

interface SleepDetail {
  started_at?: string;
  ended_at?: string | null;
}
interface FeedingDetail {
  amount_ml?: number;
}
type Detail = SleepDetail & FeedingDetail & Record<string, unknown>;

interface BabyRecord {
  id: string;
  category: BabyCategory;
  note: string | null;
  recorded_at: string;
  author_id: string;
  detail: Detail | null;
}

const CATS: { key: BabyCategory; emoji: string; label: string }[] = [
  { key: "feeding", emoji: "🍼", label: "수유" },
  { key: "food", emoji: "🥣", label: "이유식" },
  { key: "pee", emoji: "💧", label: "소변" },
  { key: "poop", emoji: "💩", label: "대변" },
  { key: "sleep", emoji: "😴", label: "수면" },
  { key: "bath", emoji: "🛁", label: "목욕" },
  { key: "memo", emoji: "📝", label: "메모" },
];
const META = Object.fromEntries(CATS.map((c) => [c.key, c])) as Record<BabyCategory, (typeof CATS)[number]>;
const WD = ["일", "월", "화", "수", "목", "금", "토"];

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function isSameDay(a: Date, b: Date) {
  return dayKey(a) === dayKey(b);
}
function clock(iso: string) {
  return new Date(iso).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });
}
function dateLabel(d: Date, today: Date) {
  const yy = String(d.getFullYear()).slice(2);
  const base = `${yy}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} (${WD[d.getDay()]})`;
  return isSameDay(d, today) ? `오늘 · ${base}` : base;
}
function fmtDur(ms: number) {
  const m = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return h > 0 ? `${h}시간 ${mm}분` : `${mm}분`;
}
function nowHM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function BabyChart({
  familyId,
  currentUserId,
  members,
}: {
  familyId: string;
  currentUserId: string;
  members: Record<string, { name: string; avatar: string | null }>;
}) {
  const today = useMemo(() => new Date(), []);
  const [date, setDate] = useState(new Date());
  const [records, setRecords] = useState<BabyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState(false);

  // 입력 폼
  const [cat, setCat] = useState<BabyCategory>("feeding");
  const [ml, setMl] = useState("");
  const [note, setNote] = useState("");
  const [startTime, setStartTime] = useState("");

  // 수면 깨어남 시간 편집
  const [wakeEdit, setWakeEdit] = useState<{ id: string; time: string } | null>(null);

  // 날짜 피커
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerCursor, setPickerCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const viewedKey = dayKey(date);
  const isToday = isSameDay(date, today);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const end = new Date(start.getTime() + 86400000);
    const { data } = await supabase
      .from("baby_records")
      .select("id, category, note, recorded_at, author_id, detail")
      .eq("family_id", familyId)
      .gte("recorded_at", start.toISOString())
      .lt("recorded_at", end.toISOString())
      .order("recorded_at", { ascending: false });
    setRecords((data as BabyRecord[]) ?? []);
    setLoading(false);
  }, [familyId, viewedKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const supabase = createClient();
    const ch = supabase
      .channel(`baby:${familyId}:${viewedKey}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "baby_records", filter: `family_id=eq.${familyId}` },
        () => load()
      )
      .subscribe((s) => setLive(s === "SUBSCRIBED"));
    return () => {
      supabase.removeChannel(ch);
    };
  }, [familyId, viewedKey, load]);

  // 보고 있는 날짜 + 현재 시각(또는 지정 시각)으로 ISO 생성
  function atTime(timeStr?: string) {
    const now = new Date();
    let hh = now.getHours();
    let mm = now.getMinutes();
    if (timeStr) {
      const [h, m] = timeStr.split(":").map(Number);
      hh = h;
      mm = m;
    }
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hh, mm).toISOString();
  }

  async function addRecord() {
    let detail: Detail = {};
    let recordedAt = atTime();
    const trimmedNote = note.trim() || null;

    if (cat === "feeding") {
      const amount = parseInt(ml.replace(/[^\d]/g, ""), 10);
      if (!amount || amount <= 0) return; // ml 필수 유효성
      detail = { amount_ml: amount };
    } else if (cat === "sleep") {
      const started = atTime(startTime || undefined);
      detail = { started_at: started, ended_at: null };
      recordedAt = started;
    }

    setBusy(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("baby_records")
      .insert({
        family_id: familyId,
        author_id: currentUserId,
        category: cat,
        note: trimmedNote,
        detail: detail as unknown as Json,
        recorded_at: recordedAt,
      })
      .select("id, category, note, recorded_at, author_id, detail")
      .single();
    if (data) setRecords((prev) => (prev.some((r) => r.id === data.id) ? prev : [data as BabyRecord, ...prev]));
    setMl("");
    setNote("");
    setStartTime(cat === "sleep" ? nowHM() : "");
    setBusy(false);
  }

  async function setWake(rec: BabyRecord, timeStr?: string) {
    // 자정을 넘긴 수면: 기상 시각이 취침 시각보다 이르면 다음 날로 보정.
    let endDate = new Date(atTime(timeStr));
    const startMs = new Date(rec.detail?.started_at ?? rec.recorded_at).getTime();
    if (endDate.getTime() < startMs) endDate = new Date(endDate.getTime() + 86400000);
    const ended = endDate.toISOString();
    const supabase = createClient();
    const newDetail = { ...(rec.detail ?? {}), ended_at: ended };
    await supabase.from("baby_records").update({ detail: newDetail as unknown as Json }).eq("id", rec.id);
    setRecords((prev) => prev.map((r) => (r.id === rec.id ? { ...r, detail: newDetail } : r)));
    setWakeEdit(null);
  }

  async function removeRecord(id: string) {
    setBusy(true);
    const supabase = createClient();
    await supabase.from("baby_records").delete().eq("id", id);
    setRecords((prev) => prev.filter((r) => r.id !== id));
    setBusy(false);
  }

  const summary = useMemo(() => {
    const c: Partial<Record<BabyCategory, number>> = {};
    for (const r of records) c[r.category] = (c[r.category] ?? 0) + 1;
    return c;
  }, [records]);

  const pickerCells = useMemo(() => {
    const y = pickerCursor.getFullYear();
    const m = pickerCursor.getMonth();
    const firstDow = new Date(y, m, 1).getDay();
    const days = new Date(y, m + 1, 0).getDate();
    const arr: (Date | null)[] = [];
    for (let i = 0; i < firstDow; i++) arr.push(null);
    for (let d = 1; d <= days; d++) arr.push(new Date(y, m, d));
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [pickerCursor]);

  const canSubmit = cat === "feeding" ? !!parseInt(ml.replace(/[^\d]/g, ""), 10) : cat === "memo" ? !!note.trim() : true;

  return (
    <GlassCard className="flex flex-col">
      {/* 날짜 내비 */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setDate(new Date(date.getTime() - 86400000))}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-zinc-300 transition-all duration-300 ease-out-back hover:scale-102 hover:bg-white/[0.08]"
            aria-label="어제"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="relative">
            <button
              onClick={() => {
                setPickerCursor(new Date(date.getFullYear(), date.getMonth(), 1));
                setPickerOpen((v) => !v);
              }}
              className="rounded-xl px-3 py-1.5 text-base font-semibold tracking-tight text-zinc-100 transition-all duration-300 ease-out-back hover:bg-white/[0.06]"
            >
              {dateLabel(date, today)}
            </button>
            {pickerOpen && (
              <>
                <button className="fixed inset-0 z-10 cursor-default" onClick={() => setPickerOpen(false)} tabIndex={-1} />
                <div className="absolute left-1/2 top-11 z-20 w-64 -translate-x-1/2 rounded-2xl border border-white/10 bg-ink-800 p-3 shadow-bezel-lg ring-1 ring-black/40">
                  <div className="mb-2 flex items-center justify-between">
                    <button onClick={() => setPickerCursor(new Date(pickerCursor.getFullYear(), pickerCursor.getMonth() - 1, 1))} className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-white/10">
                      <ChevronLeft className="h-4 w-4 text-zinc-300" />
                    </button>
                    <span className="text-sm font-semibold text-zinc-100">
                      {pickerCursor.getFullYear()}년 {pickerCursor.getMonth() + 1}월
                    </span>
                    <button onClick={() => setPickerCursor(new Date(pickerCursor.getFullYear(), pickerCursor.getMonth() + 1, 1))} className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-white/10">
                      <ChevronRight className="h-4 w-4 text-zinc-300" />
                    </button>
                  </div>
                  <div className="mb-1 grid grid-cols-7 text-center text-[10px] text-zinc-500">
                    {WD.map((w) => (
                      <div key={w}>{w}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-0.5">
                    {pickerCells.map((d, i) => {
                      if (!d) return <div key={`e${i}`} />;
                      const future = d.getTime() > today.getTime() && !isSameDay(d, today);
                      const sel = isSameDay(d, date);
                      const isT = isSameDay(d, today);
                      return (
                        <button
                          key={dayKey(d)}
                          disabled={future}
                          onClick={() => {
                            setDate(d);
                            setPickerOpen(false);
                          }}
                          className={[
                            "flex h-8 items-center justify-center rounded-lg text-xs transition-all duration-300 ease-out-back",
                            future ? "text-zinc-700" : sel ? "bg-accent font-semibold text-ink-900" : isT ? "bg-white/10 text-accent" : "text-zinc-300 hover:bg-white/[0.08]",
                          ].join(" ")}
                        >
                          {d.getDate()}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
          <button
            onClick={() => !isToday && setDate(new Date(date.getTime() + 86400000))}
            disabled={isToday}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-zinc-300 transition-all duration-300 ease-out-back hover:scale-102 hover:bg-white/[0.08] disabled:opacity-30"
            aria-label="내일"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <span className="flex items-center gap-1.5 text-[11px] text-zinc-400">
          <span className={`h-1.5 w-1.5 rounded-full ${live ? "animate-pulse bg-emerald-400" : "bg-zinc-600"}`} />
          {live ? "실시간" : "연결 중"}
        </span>
      </div>

      {/* 요약 칩 */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {CATS.map((c) => (
          <span key={c.key} className="flex items-center gap-1 rounded-lg border border-white/5 bg-white/[0.03] px-2 py-1 text-xs text-zinc-300">
            <span className="text-sm">{c.emoji}</span>
            {c.label} {summary[c.key] ?? 0}
          </span>
        ))}
      </div>

      {/* 기록 추가 */}
      <div className="mb-5 rounded-2xl border border-white/5 bg-white/[0.02] p-3">
        {/* 큰 카테고리 버튼 */}
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
          {CATS.map((c) => (
            <button
              key={c.key}
              onClick={() => {
                setCat(c.key);
                setMl("");
                setNote("");
                setStartTime(c.key === "sleep" ? nowHM() : "");
              }}
              className={[
                "flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 transition-all duration-300 ease-out-back hover:scale-105",
                cat === c.key ? "border-accent/50 bg-accent/15" : "border-white/10 bg-white/[0.04] hover:bg-white/[0.08]",
              ].join(" ")}
            >
              <span className="text-2xl leading-none">{c.emoji}</span>
              <span className={`text-[11px] ${cat === c.key ? "text-accent" : "text-zinc-300"}`}>{c.label}</span>
            </button>
          ))}
        </div>

        {/* 카테고리별 입력 */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {cat === "feeding" && (
            <div className="flex items-center gap-1.5">
              <input
                inputMode="numeric"
                value={ml}
                onChange={(e) => setMl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && canSubmit && addRecord()}
                placeholder="수유량"
                className="w-24 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-right text-base font-semibold text-zinc-100 placeholder:text-sm placeholder:font-normal placeholder:text-zinc-600 focus:border-accent/40 focus:outline-none"
              />
              <span className="text-sm text-zinc-400">ml</span>
              <span className="text-[11px] text-rose-300/70">* 필수</span>
            </div>
          )}
          {cat === "sleep" && (
            <div className="flex items-center gap-1.5 text-sm text-zinc-400">
              <Moon className="h-4 w-4 text-indigo-300" />
              잠든 시각
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-2 text-sm text-zinc-100 focus:border-accent/40 focus:outline-none [color-scheme:dark]"
              />
              <span className="text-[11px] text-zinc-600">(현재 시각 · 수정 가능)</span>
            </div>
          )}
          {cat !== "feeding" && cat !== "sleep" && (
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && canSubmit && addRecord()}
              placeholder={cat === "food" ? "먹은 음식 (예: 쌀미음)" : cat === "memo" ? "메모 내용 *" : "메모 (선택)"}
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-accent/40 focus:outline-none"
            />
          )}
          {(cat === "feeding" || cat === "sleep") && (
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="메모 (선택)"
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-accent/40 focus:outline-none"
            />
          )}
          <button
            onClick={addRecord}
            disabled={busy || !canSubmit}
            className="flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-ink-900 transition-all duration-300 ease-out-back hover:scale-102 hover:bg-accent-soft disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <span className="text-base leading-none">{META[cat].emoji}</span>}
            기록
          </button>
        </div>
      </div>

      {/* 타임라인 */}
      {loading ? (
        <div className="flex items-center justify-center py-10 text-sm text-zinc-600">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 불러오는 중…
        </div>
      ) : records.length === 0 ? (
        <div className="py-10 text-center text-sm text-zinc-500">이 날의 기록이 없습니다.</div>
      ) : (
        <ol className="space-y-2.5">
          {records.map((r) => {
            const meta = META[r.category];
            const author = members[r.author_id];
            const mine = r.author_id === currentUserId;
            const sleeping = r.category === "sleep" && r.detail && !r.detail.ended_at;
            return (
              <li
                key={r.id}
                className="group flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-3 transition-colors hover:bg-white/[0.05]"
              >
                {/* 큰 아이콘 */}
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-2xl">
                  {meta.emoji}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-x-2 text-sm text-zinc-100">
                    <span className="font-semibold">{meta.label}</span>
                    {r.category === "feeding" && r.detail?.amount_ml != null && (
                      <span className="text-accent-soft">{r.detail.amount_ml}ml</span>
                    )}
                    {r.category === "sleep" && (
                      <span className="text-indigo-300">
                        {clock(r.detail?.started_at ?? r.recorded_at)} ~{" "}
                        {r.detail?.ended_at ? (
                          <>
                            {clock(r.detail.ended_at)}{" "}
                            <span className="text-zinc-400">
                              ({fmtDur(new Date(r.detail.ended_at).getTime() - new Date(r.detail.started_at ?? r.recorded_at).getTime())})
                            </span>
                          </>
                        ) : (
                          <span className="text-zinc-500">자는 중</span>
                        )}
                      </span>
                    )}
                    {r.note && <span className="text-zinc-400">· {r.note}</span>}
                  </p>

                  {/* 작성자(프로필 이미지) + 시각 */}
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="h-5 w-5 overflow-hidden rounded-full border border-white/10 bg-accent/15">
                      {author?.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={author.avatar} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-[9px] font-semibold text-accent">
                          {(author?.name ?? "?").charAt(0).toUpperCase()}
                        </span>
                      )}
                    </span>
                    <span className={`text-[11px] ${mine ? "text-accent" : "text-zinc-500"}`}>
                      {author?.name ?? "알 수 없음"}
                      {mine && " (나)"}
                    </span>
                    <span className="text-[11px] text-zinc-600">· {clock(r.recorded_at)}</span>
                  </div>

                  {/* 수면 깨어남 컨트롤 */}
                  {r.category === "sleep" && (
                    <div className="mt-2 flex items-center gap-1.5">
                      {wakeEdit?.id === r.id ? (
                        <>
                          <input
                            type="time"
                            value={wakeEdit.time}
                            onChange={(e) => setWakeEdit({ id: r.id, time: e.target.value })}
                            className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-zinc-100 focus:border-accent/40 focus:outline-none [color-scheme:dark]"
                          />
                          <button onClick={() => setWake(r, wakeEdit.time)} className="rounded-lg bg-accent/90 px-2.5 py-1 text-xs font-medium text-ink-900 hover:bg-accent">
                            저장
                          </button>
                          <button onClick={() => setWakeEdit(null)} className="rounded-lg px-2 py-1 text-xs text-zinc-500 hover:text-zinc-300">
                            취소
                          </button>
                        </>
                      ) : sleeping ? (
                        <button onClick={() => setWakeEdit({ id: r.id, time: nowHM() })} className="rounded-lg border border-indigo-300/30 bg-indigo-300/10 px-2.5 py-1 text-xs text-indigo-200 hover:bg-indigo-300/20">
                          깨어남 기록
                        </button>
                      ) : (
                        <button
                          onClick={() => setWakeEdit({ id: r.id, time: clock(r.detail?.ended_at ?? r.recorded_at) })}
                          className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-zinc-500 hover:text-zinc-300"
                        >
                          <Pencil className="h-3 w-3" /> 깨어난 시각 수정
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => removeRecord(r.id)}
                  disabled={busy}
                  className="flex h-8 w-8 shrink-0 items-center justify-center self-start rounded-lg text-zinc-600 opacity-0 transition hover:bg-rose-400/10 hover:text-rose-300 group-hover:opacity-100"
                  aria-label="삭제"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </GlassCard>
  );
}
