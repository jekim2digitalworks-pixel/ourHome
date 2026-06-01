"use client";

import { useState } from "react";
import { CalendarDays, Link2, ChevronRight } from "lucide-react";
import { GlassCard, CardHeader } from "@/components/ui/GlassCard";

interface UpcomingEvent {
  id: string;
  title: string;
  when: string;
  source: "native" | "google";
}

const SAMPLE: UpcomingEvent[] = [
  { id: "1", title: "산부인과 정기검진", when: "오늘 · 오후 3:00", source: "google" },
  { id: "2", title: "예방접종 2차", when: "내일 · 오전 10:30", source: "native" },
  { id: "3", title: "양가 부모님 식사", when: "토요일 · 오후 6:00", source: "google" },
];

export function CalendarCard() {
  const [events] = useState<UpcomingEvent[]>(SAMPLE);

  return (
    <GlassCard className="flex h-full flex-col">
      <CardHeader
        icon={<CalendarDays className="h-4.5 w-4.5" />}
        title="다가오는 일정"
        hint="Google Calendar 연동"
        action={
          <a
            href="/api/google/connect"
            className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] text-zinc-300 transition-all duration-300 ease-out-back hover:scale-102 hover:bg-white/[0.08]"
          >
            <Link2 className="h-3 w-3" /> 연동
          </a>
        }
      />

      <ul className="flex-1 space-y-2.5">
        {events.map((e) => (
          <li
            key={e.id}
            className="group flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5 transition-all duration-300 ease-out-back hover:translate-x-0.5 hover:bg-white/[0.06]"
          >
            <span
              className={[
                "h-9 w-1 rounded-full",
                e.source === "google" ? "bg-accent-cool" : "bg-accent",
              ].join(" ")}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-zinc-100">{e.title}</p>
              <p className="text-[11px] text-zinc-500">{e.when}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-zinc-600 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-400" />
          </li>
        ))}
      </ul>
    </GlassCard>
  );
}
