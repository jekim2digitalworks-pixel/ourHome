"use client";

import { useMemo, useState } from "react";
import { Sidebar, MobileTabBar, type TabKey } from "@/components/dashboard/Sidebar";
import { TopBar } from "@/components/dashboard/TopBar";
import { CalendarCard } from "@/components/dashboard/CalendarCard";
import { AssetSummaryCard } from "@/components/dashboard/AssetSummaryCard";
import { BabyTimelineCard } from "@/components/dashboard/BabyTimelineCard";
import { PhotoCoverflowCard } from "@/components/dashboard/PhotoCoverflowCard";
import { SettingsPanel } from "@/components/dashboard/SettingsPanel";

const TITLES: Record<TabKey, { title: string; subtitle: string }> = {
  overview: { title: "안녕하세요, 오늘도 함께해요 👋", subtitle: "2026년 6월 1일 · 우리 둘의 하루" },
  calendar: { title: "캘린더", subtitle: "자체 일정 + Google Calendar" },
  assets: { title: "자산 관리", subtitle: "스마트 가계부" },
  baby: { title: "육아 차트", subtitle: "실시간 타임라인" },
  photos: { title: "사진첩", subtitle: "Google Drive 연동" },
  settings: { title: "설정", subtitle: "대시보드 개인화" },
};

export default function DashboardPage() {
  // In production: hydrate these from public.settings + the user's family_id.
  const familyId = undefined; // e.g. "uuid-from-server"
  const [active, setActive] = useState<TabKey>("overview");
  const [enabled, setEnabled] = useState<TabKey[]>(["calendar", "assets", "baby", "photos"]);
  const [primary, setPrimary] = useState<TabKey>("baby");

  const toggle = (key: TabKey) =>
    setEnabled((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  // Overview ordering honors the user's primary pick first.
  const orderedCards = useMemo<TabKey[]>(() => {
    const rest = enabled.filter((k) => k !== primary);
    return [primary, ...rest].filter((k) => enabled.includes(k));
  }, [enabled, primary]);

  const meta = TITLES[active];

  return (
    <div className="mx-auto flex min-h-screen max-w-[1400px]">
      <Sidebar active={active} onChange={setActive} enabled={enabled} />

      <main className="min-w-0 flex-1 px-3 pb-28 pt-3 lg:px-8 lg:pb-10">
        <TopBar title={meta.title} subtitle={meta.subtitle} />

        {active === "overview" && (
          <div className="grid auto-rows-[minmax(0,1fr)] grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {orderedCards.map((key, i) => (
              <div
                key={key}
                className={[
                  "animate-fade-up",
                  // Let the primary module span wider for visual hierarchy.
                  key === primary ? "md:col-span-2 xl:col-span-2 xl:row-span-2" : "",
                ].join(" ")}
                style={{ animationDelay: `${i * 70}ms` }}
              >
                {key === "calendar" && <CalendarCard />}
                {key === "assets" && <AssetSummaryCard />}
                {key === "baby" && <BabyTimelineCard familyId={familyId} />}
                {key === "photos" && <PhotoCoverflowCard />}
              </div>
            ))}
          </div>
        )}

        {active === "calendar" && (
          <div className="max-w-2xl animate-fade-up">
            <CalendarCard />
          </div>
        )}
        {active === "assets" && (
          <div className="max-w-2xl animate-fade-up">
            <AssetSummaryCard />
          </div>
        )}
        {active === "baby" && (
          <div className="max-w-2xl animate-fade-up">
            <BabyTimelineCard familyId={familyId} />
          </div>
        )}
        {active === "photos" && (
          <div className="max-w-3xl animate-fade-up">
            <PhotoCoverflowCard />
          </div>
        )}
        {active === "settings" && (
          <div className="animate-fade-up">
            <SettingsPanel
              enabled={enabled}
              primary={primary}
              onToggle={toggle}
              onSetPrimary={setPrimary}
            />
          </div>
        )}
      </main>

      <MobileTabBar active={active} onChange={setActive} enabled={enabled} />
    </div>
  );
}
