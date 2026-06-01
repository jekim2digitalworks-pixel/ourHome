"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Baby, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatKRW, sumMinor } from "@/lib/format";

/**
 * 한눈 요약 스트립: 오늘 일정 수 · 오늘 육아 기록 수 · 이번 달 잔액.
 * 각 값은 가볍게 자체 조회한다(가족 없으면 안내).
 */
export function SummaryStrip({ familyId }: { familyId?: string }) {
  const [events, setEvents] = useState<number | null>(null);
  const [baby, setBaby] = useState<number | null>(null);
  const [net, setNet] = useState<number | null>(null);

  const todayLabel = useMemo(() => {
    const d = new Date();
    const wd = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} (${wd})`;
  }, []);

  useEffect(() => {
    // 오늘 일정 (Google 연동 시)
    (async () => {
      try {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
        const res = await fetch(`/api/google/calendar?timeMin=${start}&timeMax=${end}`, { cache: "no-store" });
        const data = await res.json();
        setEvents(data.connected ? (data.events?.length ?? 0) : null);
      } catch {
        setEvents(null);
      }
    })();
  }, []);

  useEffect(() => {
    if (!familyId) return;
    const supabase = createClient();
    (async () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
      const { count } = await supabase
        .from("baby_records")
        .select("id", { count: "exact", head: true })
        .eq("family_id", familyId)
        .gte("recorded_at", start)
        .lt("recorded_at", end);
      setBaby(count ?? 0);

      const mStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      const mEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().slice(0, 10);
      const { data: tx } = await supabase
        .from("transactions")
        .select("type, amount_minor")
        .eq("family_id", familyId)
        .gte("occurred_on", mStart)
        .lt("occurred_on", mEnd);
      if (tx) {
        const income = sumMinor(tx.filter((t) => t.type === "income").map((t) => t.amount_minor));
        const expense = sumMinor(tx.filter((t) => t.type === "expense").map((t) => t.amount_minor));
        setNet(income - expense);
      }
    })();
  }, [familyId]);

  return (
    <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Chip
        icon={<CalendarDays className="h-4 w-4" />}
        label="오늘 일정"
        value={events === null ? "연동 필요" : `${events}건`}
        muted={events === null}
        tone="cool"
      />
      <Chip
        icon={<Baby className="h-4 w-4" />}
        label="오늘 육아"
        value={baby === null ? "가족 필요" : `${baby}건`}
        muted={baby === null}
        tone="soft"
      />
      <Chip
        icon={<Wallet className="h-4 w-4" />}
        label="이번 달 잔액"
        value={net === null ? "가족 필요" : formatKRW(net)}
        muted={net === null}
        tone={net !== null && net < 0 ? "down" : "up"}
        sub={todayLabel}
      />
    </div>
  );
}

function Chip({
  icon,
  label,
  value,
  muted,
  tone,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  muted?: boolean;
  tone: "cool" | "soft" | "up" | "down";
  sub?: string;
}) {
  const toneColor = {
    cool: "text-accent-cool",
    soft: "text-accent-soft",
    up: "text-emerald-300",
    down: "text-rose-300",
  }[tone];
  return (
    <div className="glass flex items-center gap-3 px-4 py-3">
      <span className={`flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] ${toneColor}`}>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[11px] text-zinc-500">{label}</p>
        <p className={`truncate text-base font-semibold tracking-tight ${muted ? "text-zinc-600" : "text-zinc-100"}`}>
          {value}
        </p>
      </div>
      {sub && <span className="ml-auto shrink-0 text-[11px] text-zinc-600">{sub}</span>}
    </div>
  );
}
