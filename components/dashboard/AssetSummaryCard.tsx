"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Wallet, TrendingUp, TrendingDown, Plus, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { GlassCard, CardHeader } from "@/components/ui/GlassCard";
import { formatKRW, parseToMinor, sumMinor } from "@/lib/format";

type TxType = "income" | "expense";

interface Tx {
  id: string;
  type: TxType;
  amount_minor: number;
  category: string;
  occurred_on: string;
  author_id: string;
}

export function AssetSummaryCard({
  familyId,
  currentUserId,
}: {
  familyId?: string;
  currentUserId?: string;
}) {
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<TxType>("expense");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  const monthKey = new Date().toISOString().slice(0, 7);

  const load = useCallback(async () => {
    if (!familyId) {
      setLoading(false);
      return;
    }
    const supabase = createClient();
    const start = `${monthKey}-01`;
    const d = new Date();
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString().slice(0, 10);
    const { data } = await supabase
      .from("transactions")
      .select("id, type, amount_minor, category, occurred_on, author_id")
      .eq("family_id", familyId)
      .gte("occurred_on", start)
      .lt("occurred_on", end)
      .order("occurred_on", { ascending: false });
    setTxs((data as Tx[]) ?? []);
    setLoading(false);
  }, [familyId, monthKey]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!familyId) return;
    const supabase = createClient();
    const ch = supabase
      .channel(`tx-card:${familyId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transactions", filter: `family_id=eq.${familyId}` },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [familyId, load]);

  const { income, expense, net } = useMemo(() => {
    const income = sumMinor(txs.filter((t) => t.type === "income").map((t) => t.amount_minor));
    const expense = sumMinor(txs.filter((t) => t.type === "expense").map((t) => t.amount_minor));
    return { income, expense, net: income - expense };
  }, [txs]);

  async function add() {
    const amount_minor = parseToMinor(amount);
    if (!amount_minor || !familyId || !currentUserId) return;
    setBusy(true);
    const supabase = createClient();
    await supabase.from("transactions").insert({
      family_id: familyId,
      author_id: currentUserId,
      type,
      amount_minor,
      category: type === "expense" ? "기타" : "수입",
      occurred_on: new Date().toISOString().slice(0, 10),
    });
    setAmount("");
    setBusy(false);
    load();
  }

  return (
    <GlassCard className="flex h-full flex-col">
      <CardHeader icon={<Wallet className="h-4.5 w-4.5" />} title="자산 관리" hint="이번 달 요약" />

      {!familyId ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-zinc-500">
          <Wallet className="h-7 w-7 text-zinc-600" />
          <p className="text-sm">가족을 만들면 가계부가 활성화됩니다.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat label="수입" value={income} tone="up" />
            <Stat label="지출" value={expense} tone="down" />
            <Stat label="잔액" value={net} tone={net >= 0 ? "up" : "down"} emphasize />
          </div>

          <div className="mt-4 flex flex-1 flex-col">
            <p className="mb-2 text-[11px] text-zinc-500">최근 내역</p>
            {loading ? (
              <div className="flex flex-1 items-center justify-center text-sm text-zinc-600">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 불러오는 중…
              </div>
            ) : txs.length === 0 ? (
              <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">
                아래에서 첫 내역을 추가해보세요.
              </div>
            ) : (
              <ul className="flex-1 space-y-1.5">
                {txs.slice(0, 4).map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.03] px-3 py-1.5 text-sm"
                  >
                    <span className="truncate text-zinc-300">{t.category}</span>
                    <span className={t.type === "income" ? "text-emerald-300" : "text-zinc-200"}>
                      {t.type === "income" ? "+" : "-"}
                      {formatKRW(t.amount_minor)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 빠른 입력 */}
          <div className="mt-4 flex items-center gap-2">
            <div className="flex rounded-xl border border-white/10 bg-white/[0.04] p-0.5">
              {(["expense", "income"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={[
                    "rounded-lg px-2.5 py-1.5 text-xs transition-all duration-300 ease-out-back",
                    type === t ? "bg-white/10 text-zinc-100 shadow-bezel" : "text-zinc-500",
                  ].join(" ")}
                >
                  {t === "expense" ? "지출" : "수입"}
                </button>
              ))}
            </div>
            <input
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
              placeholder="금액"
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-accent/40 focus:outline-none"
            />
            <button
              onClick={add}
              disabled={busy}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/90 text-ink-900 transition-all duration-300 ease-out-back hover:scale-102 hover:bg-accent disabled:opacity-50"
              aria-label="추가"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" strokeWidth={2.5} />}
            </button>
          </div>
        </>
      )}
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
        "rounded-xl border border-white/5 bg-white/[0.03] px-2 py-2.5",
        emphasize ? "ring-1 ring-accent/20" : "",
      ].join(" ")}
    >
      <div className="mb-1 flex items-center justify-center gap-1 text-[11px] text-zinc-500">
        <Icon className={`h-3 w-3 ${tone === "up" ? "text-emerald-400" : "text-rose-400"}`} />
        {label}
      </div>
      <p className="truncate text-center text-sm font-semibold tracking-tight text-zinc-100">{formatKRW(value)}</p>
    </div>
  );
}
