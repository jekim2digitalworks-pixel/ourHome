"use client";

import { useState } from "react";
import {
  CalendarDays,
  Wallet,
  Baby,
  Images,
  LayoutGrid,
  Settings,
  Heart,
} from "lucide-react";

export type TabKey = "overview" | "calendar" | "assets" | "baby" | "photos" | "settings";

const NAV: { key: TabKey; label: string; icon: typeof Heart }[] = [
  { key: "overview", label: "대시보드", icon: LayoutGrid },
  { key: "calendar", label: "캘린더", icon: CalendarDays },
  { key: "assets", label: "자산관리", icon: Wallet },
  { key: "baby", label: "육아차트", icon: Baby },
  { key: "photos", label: "사진첩", icon: Images },
  { key: "settings", label: "설정", icon: Settings },
];

export function Sidebar({
  active,
  onChange,
  enabled,
}: {
  active: TabKey;
  onChange: (key: TabKey) => void;
  enabled: TabKey[];
}) {
  const items = NAV.filter(
    (n) => n.key === "overview" || n.key === "settings" || enabled.includes(n.key)
  );

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-2 border-r border-white/5 px-4 py-6 lg:flex">
      <div className="mb-6 flex items-center gap-2.5 px-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 text-accent ring-1 ring-accent/30">
          <Heart className="h-4.5 w-4.5" fill="currentColor" strokeWidth={0} />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-tight text-zinc-100">Our_Home</p>
          <p className="text-[11px] text-zinc-500">우리 둘의 홈</p>
        </div>
      </div>

      <nav className="flex flex-col gap-1">
        {items.map(({ key, label, icon: Icon }) => {
          const isActive = active === key;
          return (
            <button
              key={key}
              onClick={() => onChange(key)}
              className={[
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-300 ease-out-back",
                isActive
                  ? "border border-white/10 bg-white/[0.07] text-zinc-100 shadow-bezel"
                  : "border border-transparent text-zinc-400 hover:translate-x-0.5 hover:bg-white/[0.04] hover:text-zinc-200",
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

      <div className="mt-auto rounded-2xl border border-white/5 bg-white/[0.03] p-3 text-[11px] leading-relaxed text-zinc-500">
        실시간으로 두 사람의 화면이 함께 업데이트됩니다.
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
