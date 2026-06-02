"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Wallet, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { GlassCard, CardHeader } from "@/components/ui/GlassCard";
import { formatKRW, sumMinor } from "@/lib/format";

type TxType = "income" | "expense";

interface Tx {
  id: string;
  type: TxType;
  amount_minor: number;
  category: string;
  occurred_on: string;
  author_id: string;
}

export function AssetSummaryCard({ familyId }: { familyId?: string; currentUserId?: string }) {
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);

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
                아직 이번 달 내역이 없습니다.
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
