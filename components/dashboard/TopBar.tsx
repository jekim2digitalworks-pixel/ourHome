"use client";

import { Search, Bell, Plus } from "lucide-react";

export function TopBar({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="glass sticky top-3 z-30 mx-3 mb-6 flex items-center gap-3 rounded-2xl px-4 py-3 lg:mx-0">
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-semibold tracking-tight text-zinc-100">{title}</h1>
        {subtitle && <p className="truncate text-xs text-zinc-500">{subtitle}</p>}
      </div>

      <div className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-zinc-400 sm:flex">
        <Search className="h-4 w-4" />
        <input
          placeholder="검색"
          className="w-32 bg-transparent text-zinc-200 placeholder:text-zinc-600 focus:outline-none"
        />
      </div>

      <button
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-zinc-300 transition-all duration-300 ease-out-back hover:scale-102 hover:bg-white/[0.08]"
        aria-label="알림"
      >
        <Bell className="h-4 w-4" />
        <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-accent" />
      </button>

      <button className="flex items-center gap-1.5 rounded-xl bg-accent/90 px-3 py-2 text-sm font-medium text-ink-900 transition-all duration-300 ease-out-back hover:scale-102 hover:bg-accent">
        <Plus className="h-4 w-4" strokeWidth={2.5} />
        <span className="hidden sm:inline">기록 추가</span>
      </button>
    </header>
  );
}
