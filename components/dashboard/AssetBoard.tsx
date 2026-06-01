"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Plus,
  Loader2,
  Trash2,
  Pin,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { GlassCard } from "@/components/ui/GlassCard";
import { formatKRW, parseToMinor, sumMinor } from "@/lib/format";

type TxType = "income" | "expense";

interface Tx {
  id: string;
  type: TxType;
  amount_minor: number;
  category: string;
  memo: string | null;
  is_fixed: boolean;
  occurred_on: string;
  author_id: string;
}

const EXPENSE_CATS = ["식비", "생활", "육아", "고정비", "교통", "의료", "문화", "기타"];
const INCOME_CATS = ["급여", "용돈", "환급", "기타"];

const CAT_COLOR = [
  "bg-accent",
  "bg-accent-cool",
  "bg-indigo-400",
  "bg-sky-400",
  "bg-rose-400",
  "bg-emerald-400",
  "bg-amber-400",
  "bg-zinc-400",
];

function monthLabel(d: Date) {
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
}

export function AssetBoard({
  familyId,
  currentUserId,
  members,
}: {
  familyId: string;
  currentUserId: string;
  members: Record<string, { name: string; avatar: string | null }>;
}) {
  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [type, setType] = useState<TxType>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("식비");
  const [memo, setMemo] = useState("");
  const [isFixed, setIsFixed] = useState(false);
  const [day, setDay] = useState(() => new Date().toISOString().slice(0, 10));

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const start = new Date(year, month, 1).toISOString().slice(0, 10);
    const end = new Date(year, month + 1, 1).toISOString().slice(0, 10);
    const { data } = await supabase
      .from("transactions")
      .select("id, type, amount_minor, category, memo, is_fixed, occurred_on, author_id")
      .eq("family_id", familyId)
      .gte("occurred_on", start)
      .lt("occurred_on", end)
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false });
    setTxs((data as Tx[]) ?? []);
    setLoading(false);
  }, [familyId, monthKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load();
  }, [load]);

  // 실시간: 가족의 거래 추가/삭제를 구독해 양쪽 화면 동기화.
  useEffect(() => {
    const supabase = createClient();
    const ch = supabase
      .channel(`tx:${familyId}:${monthKey}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "transactions", filter: `family_id=eq.${familyId}` },
        (p) => {
          const t = p.new as Tx;
          if (t.occurred_on.slice(0, 7) !== monthKey) return;
          setTxs((prev) => (prev.some((x) => x.id === t.id) ? prev : [t, ...prev]));
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "transactions", filter: `family_id=eq.${familyId}` },
        (p) => setTxs((prev) => prev.filter((x) => x.id !== (p.old as { id: string }).id))
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [familyId, monthKey]);

  const { income, expense, net } = useMemo(() => {
    const income = sumMinor(txs.filter((t) => t.type === "income").map((t) => t.amount_minor));
    const expense = sumMinor(txs.filter((t) => t.type === "expense").map((t) => t.amount_minor));
    return { income, expense, net: income - expense };
  }, [txs]);

  // 지출 카테고리별 합계 (큰 순)
  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of txs) if (t.type === "expense") map[t.category] = (map[t.category] ?? 0) + t.amount_minor;
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [txs]);

  async function add() {
    const amount_minor = parseToMinor(amount);
    if (!amount_minor) return;
    setBusy(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("transactions")
      .insert({
        family_id: familyId,
        author_id: currentUserId,
        type,
        amount_minor,
        category,
        memo: memo.trim() || null,
        is_fixed: isFixed,
        occurred_on: day,
      })
      .select("id, type, amount_minor, category, memo, is_fixed, occurred_on, author_id")
      .single();
    if (data && data.occurred_on.slice(0, 7) === monthKey) {
      setTxs((prev) => (prev.some((x) => x.id === data.id) ? prev : [data as Tx, ...prev]));
    }
    setAmount("");
    setMemo("");
    setBusy(false);
  }

  async function remove(id: string) {
    setBusy(true);
    const supabase = createClient();
    await supabase.from("transactions").delete().eq("id", id);
    setTxs((prev) => prev.filter((x) => x.id !== id));
    setBusy(false);
  }

  const cats = type === "expense" ? EXPENSE_CATS : INCOME_CATS;

  return (
    <GlassCard className="flex flex-col gap-5 lg:flex-row">
      {/* ── 좌측: 요약 + 분석 ── */}
      <div className="min-w-0 flex-1">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight text-zinc-100">{monthLabel(cursor)}</h2>
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
                const n = new Date();
                setCursor(new Date(n.getFullYear(), n.getMonth(), 1));
              }}
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-zinc-300 transition-all duration-300 ease-out-back hover:scale-102 hover:bg-white/[0.08]"
            >
              이번 달
            </button>
            <button
              onClick={() => setCursor(new Date(year, month + 1, 1))}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-zinc-300 transition-all duration-300 ease-out-back hover:scale-102 hover:bg-white/[0.08]"
              aria-label="다음 달"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* 요약 */}
        <div className="grid grid-cols-3 gap-2">
          <Stat label="수입" value={income} tone="up" />
          <Stat label="지출" value={expense} tone="down" />
          <Stat label="잔액" value={net} tone={net >= 0 ? "up" : "down"} emphasize />
        </div>

        {/* 카테고리 분석 */}
        <div className="mt-5">
          <p className="mb-2 text-xs font-medium text-zinc-400">지출 카테고리</p>
          {byCategory.length === 0 ? (
            <p className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-4 text-center text-xs text-zinc-500">
              이번 달 지출이 없습니다.
            </p>
          ) : (
            <ul className="space-y-2">
              {byCategory.map(([cat, amt], i) => {
                const pct = expense > 0 ? Math.round((amt / expense) * 100) : 0;
                return (
                  <li key={cat} className="flex items-center gap-3">
                    <span className="w-12 shrink-0 text-xs text-zinc-400">{cat}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.05]">
                      <div
                        className={`h-full rounded-full ${CAT_COLOR[i % CAT_COLOR.length]}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-24 shrink-0 text-right text-xs text-zinc-300">{formatKRW(amt)}</span>
                    <span className="w-9 shrink-0 text-right text-[11px] text-zinc-500">{pct}%</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* 내역 목록 */}
        <div className="mt-5">
          <p className="mb-2 text-xs font-medium text-zinc-400">내역 {txs.length}건</p>
          {loading ? (
            <div className="flex items-center justify-center py-8 text-sm text-zinc-600">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 불러오는 중…
            </div>
          ) : txs.length === 0 ? (
            <p className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-6 text-center text-sm text-zinc-500">
              내역이 없습니다. 오른쪽에서 추가해보세요.
            </p>
          ) : (
            <ul className="max-h-80 space-y-1.5 overflow-y-auto pr-1">
              {txs.map((t) => (
                <li
                  key={t.id}
                  className="group flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2"
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      t.type === "income" ? "bg-emerald-400/10 text-emerald-400" : "bg-rose-400/10 text-rose-400"
                    }`}
                  >
                    {t.type === "income" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate text-sm text-zinc-100">
                      {t.category}
                      {t.is_fixed && (
                        <span className="flex items-center gap-0.5 rounded bg-accent/15 px-1 text-[10px] text-accent">
                          <Pin className="h-2.5 w-2.5" /> 고정
                        </span>
                      )}
                      {t.memo && <span className="truncate text-zinc-500">· {t.memo}</span>}
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      {t.occurred_on.slice(5).replace("-", "/")} · {members[t.author_id]?.name ?? "?"}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-sm font-medium ${
                      t.type === "income" ? "text-emerald-300" : "text-zinc-200"
                    }`}
                  >
                    {t.type === "income" ? "+" : "-"}
                    {formatKRW(t.amount_minor)}
                  </span>
                  <button
                    onClick={() => remove(t.id)}
                    disabled={busy}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-zinc-600 opacity-0 transition hover:bg-rose-400/10 hover:text-rose-300 group-hover:opacity-100"
                    aria-label="삭제"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ── 우측: 입력 ── */}
      <div className="w-full shrink-0 border-t border-white/5 pt-5 lg:w-72 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
        <p className="mb-3 text-sm font-semibold text-zinc-100">내역 추가</p>

        <div className="mb-2 flex rounded-xl border border-white/10 bg-white/[0.04] p-0.5">
          {(["expense", "income"] as const).map((tp) => (
            <button
              key={tp}
              onClick={() => {
                setType(tp);
                setCategory(tp === "expense" ? "식비" : "급여");
              }}
              className={[
                "flex-1 rounded-lg py-1.5 text-xs transition-all duration-300 ease-out-back",
                type === tp ? "bg-white/10 text-zinc-100 shadow-bezel" : "text-zinc-500",
              ].join(" ")}
            >
              {tp === "expense" ? "지출" : "수입"}
            </button>
          ))}
        </div>

        <input
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="금액"
          className="mb-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-right text-lg font-semibold text-zinc-100 placeholder:text-left placeholder:text-base placeholder:font-normal placeholder:text-zinc-600 focus:border-accent/40 focus:outline-none"
        />

        <div className="mb-2 flex flex-wrap gap-1">
          {cats.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={[
                "rounded-lg px-2 py-1 text-xs transition-all duration-300 ease-out-back",
                category === c
                  ? "bg-accent text-ink-900 font-medium"
                  : "border border-white/10 bg-white/[0.04] text-zinc-400 hover:bg-white/[0.08]",
              ].join(" ")}
            >
              {c}
            </button>
          ))}
        </div>

        <input
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="메모 (선택)"
          className="mb-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-accent/40 focus:outline-none"
        />

        <div className="mb-2 flex items-center gap-2">
          <input
            type="date"
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-zinc-100 focus:border-accent/40 focus:outline-none [color-scheme:dark]"
          />
          <button
            onClick={() => setIsFixed((v) => !v)}
            className={[
              "flex items-center gap-1 rounded-xl border px-3 py-2 text-xs transition-all duration-300 ease-out-back",
              isFixed
                ? "border-accent/40 bg-accent/15 text-accent"
                : "border-white/10 bg-white/[0.04] text-zinc-400",
            ].join(" ")}
            title="고정비로 표시(월세·구독 등). 매월 이월 처리에 사용됩니다."
          >
            <Pin className="h-3.5 w-3.5" /> 고정비
          </button>
        </div>

        <button
          onClick={add}
          disabled={busy || !parseToMinor(amount)}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-ink-900 transition-all duration-300 ease-out-back hover:scale-102 hover:bg-accent-soft disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" strokeWidth={2.5} />}
          {type === "expense" ? "지출" : "수입"} 추가
        </button>
        <p className="mt-2 text-[10px] text-zinc-600">
          추가·삭제는 배우자 화면에도 실시간 반영됩니다. 금액은 정수로 저장돼 오차가 없어요.
        </p>
      </div>
    </GlassCard>
  );
}

function Stat({
  label,
  value,
  tone,
  emphasize,
}: {
  label: string;
  value: number;
  tone: "up" | "down";
  emphasize?: boolean;
}) {
  const Icon = tone === "up" ? TrendingUp : TrendingDown;
  return (
    <div
      className={[
        "rounded-xl border border-white/5 bg-white/[0.03] px-2 py-2.5 text-center",
        emphasize ? "ring-1 ring-accent/20" : "",
      ].join(" ")}
    >
      <div className="mb-1 flex items-center justify-center gap-1 text-[11px] text-zinc-500">
        <Icon className={`h-3 w-3 ${tone === "up" ? "text-emerald-400" : "text-rose-400"}`} />
        {label}
      </div>
      <p className="truncate text-sm font-semibold tracking-tight text-zinc-100">{formatKRW(value)}</p>
    </div>
  );
}
