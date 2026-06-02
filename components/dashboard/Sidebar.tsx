"use client";

import { useState } from "react";
import {
  CalendarDays,
  Wallet,
  Baby,
  Images,
  ListChecks,
  LayoutGrid,
  Settings,
  Home,
} from "lucide-react";

export type TabKey = "overview" | "calendar" | "assets" | "baby" | "photos" | "todos" | "settings";

const NAV: { key: TabKey; label: string; icon: typeof LayoutGrid }[] = [
  { key: "overview", label: "대시보드", icon: LayoutGrid },
  { key: "calendar", label: "캘린더", icon: CalendarDays },
  { key: "assets", label: "자산관리", icon: Wallet },
  { key: "baby", label: "육아차트", icon: Baby },
  { key: "todos", label: "할일·장보기", icon: ListChecks },
  { key: "photos", label: "사진첩", icon: Images },
  { key: "settings", label: "설정", icon: Settings },
];

export function Sidebar({
  active,
  onChange,
  enabled,
  homeName = "our home",
}: {
  active: TabKey;
  onChange: (key: TabKey) => void;
  enabled: TabKey[];
  homeName?: string;
}) {
  const items = NAV.filter(
    (n) => n.key === "overview" || n.key === "settings" || enabled.includes(n.key)
  );

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-2 border-r border-white/5 px-4 py-6 lg:flex">
      <div className="mb-8 flex items-center gap-2.5 px-2">
        <Home className="h-[18px] w-[18px] shrink-0 text-accent" />
        <p className="truncate text-[15px] font-semibold tracking-tight text-zinc-100">{homeName}</p>
      </div>

      <nav className="flex flex-col gap-1">
        {items.map(({ key, label, icon: Icon }) => {
          const isActive = active === key;
          return (
            <button
              key={key}
              onClick={() => onChange(key)}
              className={[
                "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-200",
                isActive
                  ? "bg-white/[0.06] text-zinc-100"
                  : "text-zinc-400 hover:bg-white/[0.03] hover:text-zinc-200",
              ].join(" ")}
            >
              <Icon
                className={[
                  "h-[18px] w-[18px] transition-colors",
                  isActive ? "text-accent" : "text-zinc-500 group-hover:text-zinc-300",
                ].join(" ")}
              />
              {label}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto flex items-center gap-2 px-3 py-3 text-[11px] text-zinc-500">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        실시간 동기화 중
      </div>
    </aside>
  );
}

/** Mobile bottom tab bar — same source of truth as the sidebar. */
export function MobileTabBar({
  active,
  onChange,
  enabled,
}: {
  active: TabKey;
  onChange: (key: TabKey) => void;
  enabled: TabKey[];
}) {
  const items = NAV.filter(
    (n) => n.key === "overview" || enabled.includes(n.key)
  ).slice(0, 5);

  return (
    <nav className="glass fixed inset-x-3 bottom-3 z-40 flex items-center justify-around rounded-2xl px-2 py-2 lg:hidden">
      {items.map(({ key, label, icon: Icon }) => {
        const isActive = active === key;
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={[
              "flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-[10px] transition-all duration-300 ease-out-back",
              isActive ? "text-accent" : "text-zinc-500",
            ].join(" ")}
          >
            <Icon className="h-5 w-5" />
            {label}
          </button>
        );
      })}
    </nav>
  );
}
