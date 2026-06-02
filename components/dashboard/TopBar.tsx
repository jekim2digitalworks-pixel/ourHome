"use client";

import { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export function TopBar({
  title,
  subtitle,
  displayName,
  avatarUrl,
  onOpenMyPage,
  headerSlot,
}: {
  title: string;
  subtitle?: string;
  displayName?: string;
  avatarUrl?: string | null;
  onOpenMyPage: () => void;
  headerSlot?: ReactNode;
}) {
  const initial = (displayName || "?").trim().charAt(0).toUpperCase();
  return (
    <header className="glass sticky top-3 z-30 mx-3 mb-6 flex items-center gap-3 rounded-2xl px-4 py-3 lg:mx-0">
      {headerSlot ?? (
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold tracking-tight text-zinc-100">{title}</h1>
          {subtitle && <p className="truncate text-xs text-zinc-500">{subtitle}</p>}
        </div>
      )}

      {/* 마이페이지 */}
      <button
        onClick={onOpenMyPage}
        className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] py-1.5 pl-1.5 pr-2.5 transition-all duration-300 ease-out-back hover:scale-102 hover:bg-white/[0.08]"
        title="마이페이지"
      >
        <span className="h-7 w-7 overflow-hidden rounded-full border border-white/10 bg-accent/15">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-accent">
              {initial}
            </span>
          )}
        </span>
        <span className="hidden max-w-[8rem] truncate text-sm text-zinc-200 sm:block">
          {displayName || "마이페이지"}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
      </button>
    </header>
  );
}
