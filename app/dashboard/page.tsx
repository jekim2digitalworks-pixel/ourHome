"use client";

import { useRouter } from "next/navigation";
import { CalendarDays, Baby, Wallet, Images, Plus } from "lucide-react";
import { SummaryStrip } from "@/components/dashboard/SummaryStrip";
import { hrefFor } from "@/components/dashboard/Sidebar";
import { CalendarCard } from "@/components/dashboard/CalendarCard";
import { AssetSummaryCard } from "@/components/dashboard/AssetSummaryCard";
import { BabyTimelineCard } from "@/components/dashboard/BabyTimelineCard";
import { PhotoCoverflowCard } from "@/components/dashboard/PhotoCoverflowCard";
import { TodoSummaryCard } from "@/components/dashboard/TodoSummaryCard";
import { useDashboard } from "@/components/dashboard/DashboardShell";

export default function OverviewPage() {
  const router = useRouter();
  const { orderedCards, familyId, profile, members } = useDashboard();

  return (
    <>
      <SummaryStrip familyId={familyId ?? undefined} />

      <div className="grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {orderedCards.map((key, i) => (
          <div
            key={key}
            role="button"
            tabIndex={0}
            onClick={() => router.push(hrefFor(key))}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                router.push(hrefFor(key));
              }
            }}
            className="h-full animate-fade-up cursor-pointer rounded-3xl transition-transform duration-300 ease-out-back hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            {key === "calendar" && <CalendarCard />}
            {key === "assets" && (
              <AssetSummaryCard familyId={familyId ?? undefined} currentUserId={profile?.userId} />
            )}
            {key === "baby" && (
              <BabyTimelineCard
                familyId={familyId ?? undefined}
                currentUserId={profile?.userId}
                members={members}
              />
            )}
            {key === "todos" && <TodoSummaryCard familyId={familyId ?? undefined} />}
            {key === "photos" && <PhotoCoverflowCard familyId={familyId ?? undefined} />}
          </div>
        ))}
      </div>

      {/* 빠른 입력 바 — 클릭 시 해당 탭으로 이동 */}
      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <QuickAction icon={<CalendarDays className="h-4 w-4" />} label="일정" onClick={() => router.push("/dashboard/calendar")} />
        <QuickAction icon={<Baby className="h-4 w-4" />} label="육아 기록" onClick={() => router.push("/dashboard/baby")} />
        <QuickAction icon={<Wallet className="h-4 w-4" />} label="지출" onClick={() => router.push("/dashboard/assets")} />
        <QuickAction icon={<Images className="h-4 w-4" />} label="사진" onClick={() => router.push("/dashboard/photos")} />
      </div>
    </>
  );
}

/** 빠른 입력 버튼 — 해당 기능 탭으로 이동. */
function QuickAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="glass flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-zinc-200 transition-all duration-300 ease-out-back hover:-translate-y-0.5 hover:scale-102 hover:bg-white/[0.09]"
    >
      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-accent/15 text-accent">
        <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
      </span>
      <span className="flex items-center gap-1.5">
        {icon}
        {label}
      </span>
    </button>
  );
}
