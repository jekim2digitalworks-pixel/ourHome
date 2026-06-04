"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Wallet,
  Baby,
  Images,
  ListChecks,
  LayoutGrid,
  Settings,
  Home,
  MoreHorizontal,
  X,
} from "lucide-react";

export type TabKey = "overview" | "calendar" | "assets" | "baby" | "photos" | "todos" | "settings";

const NAV: { key: TabKey; label: string; icon: typeof LayoutGrid }[] = [
  { key: "overview", label: "대시보드", icon: LayoutGrid },
  { key: "calendar", label: "캘린더", icon: CalendarDays },
  { key: "assets", label: "자산관리", icon: Wallet },
  { key: "baby", label: "육아차트", icon: Baby },
  { key: "todos", label: "가사 일 같이하기", icon: ListChecks },
  { key: "photos", label: "사진첩", icon: Images },
  { key: "settings", label: "설정", icon: Settings },
];

/** 탭 키 → 실제 경로. overview 는 대시보드 루트. */
export function hrefFor(key: TabKey) {
  return key === "overview" ? "/dashboard" : `/dashboard/${key}`;
}

/** 현재 경로에서 활성 탭 키를 역산. */
export function tabFromPath(pathname: string): TabKey {
  const seg = pathname.replace(/^\/dashboard\/?/, "").split("/")[0];
  const match = NAV.find((n) => n.key === seg);
  return match ? match.key : "overview";
}

export function Sidebar({
  enabled,
  homeName = "our home",
}: {
  enabled: TabKey[];
  homeName?: string;
}) {
  const pathname = usePathname();
  const active = tabFromPath(pathname);
  const items = NAV.filter(
    (n) => n.key === "overview" || n.key === "settings" || enabled.includes(n.key)
  );

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-2 border-r border-white/[0.07] bg-white/[0.015] px-3 py-6 lg:flex xl:w-64">
      <Link href="/dashboard" className="mb-7 flex items-center gap-2.5 px-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
          <Home className="h-[18px] w-[18px]" />
        </span>
        <p className="truncate text-[15px] font-semibold tracking-tight text-zinc-100">{homeName}</p>
      </Link>

      <nav className="flex flex-col gap-1">
        {items.map(({ key, label, icon: Icon }) => {
          const isActive = active === key;
          return (
            <Link
              key={key}
              href={hrefFor(key)}
              className={[
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-accent/[0.12] text-zinc-50"
                  : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100",
              ].join(" ")}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-accent" />
              )}
              <Icon
                className={[
                  "h-[18px] w-[18px] shrink-0 transition-colors",
                  isActive ? "text-accent" : "text-zinc-500 group-hover:text-zinc-200",
                ].join(" ")}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex items-center gap-2 rounded-xl bg-white/[0.02] px-3 py-2.5 text-[11px] text-zinc-500">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
        </span>
        실시간 동기화 중
      </div>
    </aside>
  );
}

/** Mobile bottom tab bar — same source of truth as the sidebar. */
export function MobileTabBar({ enabled }: { enabled: TabKey[] }) {
  const pathname = usePathname();
  const active = tabFromPath(pathname);
  const [menuOpen, setMenuOpen] = useState(false);

  // 하단 바엔 개요 + 활성 기능 앞 3개만. 나머지(사진첩·설정 포함)는 "메뉴" 시트로.
  const enabledFeatures = NAV.filter((n) => enabled.includes(n.key));
  const barItems = [NAV[0], ...enabledFeatures.slice(0, 3)];
  const sheetItems = NAV.filter(
    (n) => n.key === "overview" || n.key === "settings" || enabled.includes(n.key)
  );
  const barKeys = new Set(barItems.map((i) => i.key));
  const menuActive = !barKeys.has(active); // 바에 없는 화면이면 메뉴 버튼을 강조

  return (
    <>
      <nav
        className="glass fixed inset-x-3 bottom-3 z-40 flex items-center justify-around rounded-2xl px-1.5 py-1.5 lg:hidden"
        style={{ marginBottom: "env(safe-area-inset-bottom)" }}
      >
        {barItems.map(({ key, label, icon: Icon }) => {
          const isActive = active === key;
          return (
            <Link
              key={key}
              href={hrefFor(key)}
              className={[
                "flex flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-medium transition-all duration-300 ease-out-back",
                isActive ? "bg-accent/[0.14] text-accent" : "text-zinc-500 active:bg-white/5",
              ].join(" ")}
            >
              <Icon className="h-[19px] w-[19px]" />
              {label}
            </Link>
          );
        })}

        <button
          onClick={() => setMenuOpen(true)}
          className={[
            "flex flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-medium transition-all duration-300 ease-out-back",
            menuActive ? "bg-accent/[0.14] text-accent" : "text-zinc-500 active:bg-white/5",
          ].join(" ")}
        >
          <MoreHorizontal className="h-[19px] w-[19px]" />
          메뉴
        </button>
      </nav>

      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <button
            aria-label="닫기"
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
          />
          <div
            className="glass-strong absolute inset-x-2 bottom-2 animate-fade-up p-4"
            style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold tracking-tight text-zinc-100">전체 메뉴</p>
              <button
                onClick={() => setMenuOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-zinc-400 active:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {sheetItems.map(({ key, label, icon: Icon }) => {
                const isActive = active === key;
                return (
                  <Link
                    key={key}
                    href={hrefFor(key)}
                    onClick={() => setMenuOpen(false)}
                    className={[
                      "flex flex-col items-center gap-2 rounded-2xl border px-2 py-4 text-xs font-medium transition-colors",
                      isActive
                        ? "border-accent/30 bg-accent/[0.12] text-accent"
                        : "border-white/5 bg-white/[0.03] text-zinc-300 active:bg-white/[0.06]",
                    ].join(" ")}
                  >
                    <Icon className="h-6 w-6" />
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
