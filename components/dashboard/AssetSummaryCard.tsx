"use client";

import { useMemo, useState } from "react";
import { Wallet, TrendingUp, TrendingDown, Plus } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { GlassCard, CardHeader } from "@/components/ui/GlassCard";
import { formatKRW, parseToMinor, sumMinor } from "@/lib/format";

interface Tx {
  id: string;
  type: "income" | "expense";
  amount_minor: number;
  category: string;
}

const SAMPLE_TX: Tx[] = [
  { id: "1", type: "income", amount_minor: 4200000, category: "급여" },
  { id: "2", type: "expense", amount_minor: 1350000, category: "고정비" },
  { id: "3", type: "expense", amount_minor: 320000, category: "식비" },
  { id: "4", type: "expense", amount_minor: 180000, category: "육아" },
];

const MONTHLY = [
  { m: "1월", net: 2100000 },
  { m: "2월", net: 1850000 },
  { m: "3월", net: 2450000 },
  { m: "4월", net: 1980000 },
  { m: "5월", net: 2620000 },
  { m: "6월", net: 2350000 },
];

export function AssetSummaryCard() {
  const [tx, setTx] = useState<Tx[]>(SAMPLE_TX);
  const [draft, setDraft] = useState({ type: "expense" as Tx["type"], amount: "", category: "식비" });

  const { income, expense, net } = useMemo(() => {
    const income = sumMinor(tx.filter((t) => t.type === "income").map((t) => t.amount_minor));
    const expense = sumMinor(tx.filter((t) => t.type === "expense").map((t) => t.amount_minor));
    return { income, expense, net: income - expense };
  }, [tx]);

  function add() {
    const amount_minor = parseToMinor(draft.amount);
    if (!amount_minor) return;
    setTx((prev) => [
      { id: crypto.randomUUID(), type: draft.type, amount_minor, category: draft.category },
      ...prev,
    ]);
    setDraft((d) => ({ ...d, amount: "" }));
  }

  return (
    <GlassCard className="flex h-full flex-col">
      <CardHeader icon={<Wallet className="h-4.5 w-4.5" />} title="자산 관리" hint="이번 달 요약" />

      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat label="수입" value={income} tone="up" />
        <Stat label="지출" value={expense} tone="down" />
        <Stat label="순액" value={net} tone={net >= 0 ? "up" : "down"} emphasize />
      </div>

      <div className="-mx-2 mt-4 h-28">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={MONTHLY} margin={{ top: 6, right: 8, left: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="net" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#d8b487" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#d8b487" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="m" tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip
              cursor={{ stroke: "rgba(255,255,255,0.1)" }}
              contentStyle={{
                background: "rgba(18,19,25,0.9)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 12,
                fontSize: 12,
                backdropFilter: "blur(8px)",
              }}
              formatter={(v: number) => [formatKRW(v), "순액"]}
            />
            <Area type="monotone" dataKey="net" stroke="#d8b487" strokeWidth={2} fill="url(#net)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Quick add — immediate income/expense entry. */}
      <div className="mt-4 flex items-center gap-2">
        <div className="flex rounded-xl border border-white/10 bg-white/[0.04] p-0.5">
          {(["expense", "income"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setDraft((d) => ({ ...d, type: t }))}
              className={[
                "rounded-lg px-2.5 py-1.5 text-xs transition-all duration-300 ease-out-back",
                draft.type === t ? "bg-white/10 text-zinc-100 shadow-bezel" : "text-zinc-500",
              ].join(" ")}
            >
              {t === "expense" ? "지출" : "수입"}
            </button>
          ))}
        </div>
        <input
          inputMode="numeric"
          value={draft.amount}
          onChange={(e) => setDraft((d) => ({ ...d, amount: e.target.value }))}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="금액"
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-accent/40 focus:outline-none"
        />
        <button
          onClick={add}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/90 text-ink-900 transition-all duration-300 ease-out-back hover:scale-102 hover:bg-accent"
          aria-label="추가"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
        </button>
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
    <div className={["rounded-xl border border-white/5 bg-white/[0.03] px-2 py-2.5", emphasize ? "ring-1 ring-accent/20" : ""].join(" ")}>
      <div className="mb-1 flex items-center justify-center gap-1 text-[11px] text-zinc-500">
        <Icon className={`h-3 w-3 ${tone === "up" ? "text-emerald-400" : "text-rose-400"}`} />
        {label}
      </div>
      <p className="text-sm font-semibold tracking-tight text-zinc-100">{formatKRW(value)}</p>
    </div>
  );
}
