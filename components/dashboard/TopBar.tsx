"use client";

import { ReactNode, useState } from "react";
import Link from "next/link";
import { ChevronDown, Users } from "lucide-react";
import type { Members } from "@/components/dashboard/DashboardShell";

export function TopBar({
  title,
  subtitle,
  displayName,
  avatarUrl,
  members,
  currentUserId,
  onOpenMyPage,
  headerSlot,
}: {
  title: string;
  subtitle?: string;
  displayName?: string;
  avatarUrl?: string | null;
  members?: Members;
  currentUserId?: string;
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

      {/* 가족 구성원 — 아바타 묶음 + 인원수, 클릭하면 구성원 목록 */}
      {members && <FamilyChip members={members} currentUserId={currentUserId} />}

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

/** 가족 구성원 아바타 묶음 + 인원수. 클릭하면 구성원 목록 팝오버. */
function FamilyChip({ members, currentUserId }: { members: Members; currentUserId?: string }) {
  const [open, setOpen] = useState(false);
  const entries = Object.entries(members);
  if (entries.length === 0) return null;
  // 본인을 맨 위로 정렬.
  entries.sort(([a], [b]) => (a === currentUserId ? -1 : b === currentUserId ? 1 : 0));
  const shown = entries.slice(0, 3);

  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        title="가족 구성원 보기"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] py-1.5 pl-2 pr-2.5 transition-all duration-300 ease-out-back hover:scale-102 hover:bg-white/[0.08]"
      >
        <div className="flex -space-x-2">
          {shown.map(([id, m]) => (
            <Avatar key={id} name={m.name} avatar={m.avatar} />
          ))}
        </div>
        <span className="hidden text-xs font-medium text-zinc-300 sm:block">{entries.length}명</span>
        <ChevronDown className={`h-3 w-3 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <button
            className="fixed inset-0 z-30 cursor-default"
            onClick={() => setOpen(false)}
            aria-label="닫기"
            tabIndex={-1}
          />
          <div className="absolute right-0 top-12 z-40 w-60 overflow-hidden rounded-2xl border border-white/10 bg-ink-800 shadow-bezel-lg ring-1 ring-black/40">
            <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2.5">
              <Users className="h-4 w-4 text-accent" />
              <span className="text-sm font-semibold text-zinc-100">가족 {entries.length}명</span>
            </div>
            <ul className="max-h-64 overflow-y-auto py-1">
              {entries.map(([id, m]) => (
                <li key={id} className="flex items-center gap-2.5 px-3 py-2">
                  <Avatar name={m.name} avatar={m.avatar} size="lg" />
                  <span className="min-w-0 flex-1 truncate text-sm text-zinc-200">{m.name}</span>
                  {id === currentUserId && (
                    <span className="shrink-0 rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-medium text-accent">
                      나
                    </span>
                  )}
                </li>
              ))}
            </ul>
            <Link
              href="/dashboard/settings"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-1.5 border-t border-white/10 px-3 py-2.5 text-xs font-medium text-zinc-400 transition-colors hover:bg-white/[0.04] hover:text-zinc-200"
            >
              <Users className="h-3.5 w-3.5" /> 가족 초대 · 관리
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

/** 원형 아바타 — 사진 있으면 이미지, 없으면 이름 첫 글자. */
function Avatar({ name, avatar, size = "sm" }: { name: string; avatar: string | null; size?: "sm" | "lg" }) {
  const dim = size === "lg" ? "h-7 w-7 text-xs" : "h-6 w-6 text-[10px]";
  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-accent/15 ${dim}`}
    >
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatar} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
      ) : (
        <span className="font-semibold text-accent">{(name || "?").trim().charAt(0).toUpperCase()}</span>
      )}
    </span>
  );
}
