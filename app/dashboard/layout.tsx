"use client";

import { usePathname } from "next/navigation";
import { Sidebar, MobileTabBar, tabFromPath, type TabKey } from "@/components/dashboard/Sidebar";
import { TopBar } from "@/components/dashboard/TopBar";
import { FamilyMemo } from "@/components/dashboard/FamilyMemo";
import { MyPageModal } from "@/components/dashboard/MyPageModal";
import { DashboardProvider, useDashboard } from "@/components/dashboard/DashboardShell";

const TITLES: Record<TabKey, { title: string; subtitle: string }> = {
  overview: { title: "안녕하세요, 오늘도 함께해요 👋", subtitle: "우리 둘의 하루" },
  calendar: { title: "캘린더", subtitle: "자체 일정 + Google Calendar" },
  assets: { title: "자산 관리", subtitle: "스마트 가계부" },
  baby: { title: "육아 차트", subtitle: "실시간 타임라인" },
  todos: { title: "할일 · 장보기", subtitle: "함께 보는 공유 체크리스트" },
  photos: { title: "사진첩", subtitle: "Google Drive 연동" },
  settings: { title: "설정", subtitle: "대시보드 개인화" },
};

function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const active = tabFromPath(pathname);
  const meta = TITLES[active];
  const { profile, homeName, members, enabled, familyId, reload, myPageOpen, setMyPageOpen } =
    useDashboard();

  return (
    <div className="flex min-h-screen">
      <Sidebar enabled={enabled} homeName={homeName} />

      <main className="mx-auto min-w-0 flex-1 px-3 pb-28 pt-3 lg:px-10 lg:pb-10 xl:px-14 2xl:max-w-[1600px]">
        <TopBar
          title={meta.title}
          subtitle={meta.subtitle}
          displayName={profile?.displayName}
          avatarUrl={profile?.avatarUrl}
          onOpenMyPage={() => setMyPageOpen(true)}
          headerSlot={
            active === "overview" && familyId && profile ? (
              <FamilyMemo familyId={familyId} currentUserId={profile.userId} members={members} />
            ) : undefined
          }
        />

        {children}
      </main>

      <MobileTabBar enabled={enabled} />

      {profile && (
        <MyPageModal
          open={myPageOpen}
          onClose={() => setMyPageOpen(false)}
          userId={profile.userId}
          email={profile.email}
          displayName={profile.displayName}
          avatarUrl={profile.avatarUrl}
          familyId={profile.familyId}
          homeName={homeName}
          onSaved={reload}
        />
      )}
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardProvider>
      <Shell>{children}</Shell>
    </DashboardProvider>
  );
}
