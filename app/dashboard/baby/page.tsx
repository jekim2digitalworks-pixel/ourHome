"use client";

import { BabyChart } from "@/components/dashboard/BabyChart";
import { FamilyOnboarding } from "@/components/dashboard/FamilyOnboarding";
import { GlassCard } from "@/components/ui/GlassCard";
import { useDashboard } from "@/components/dashboard/DashboardShell";

export default function BabyPage() {
  const { profileLoading, familyId, profile, members, reload } = useDashboard();
  return (
    <div className="animate-fade-up">
      {profileLoading ? (
        <GlassCard className="py-10 text-center text-sm text-zinc-500">불러오는 중…</GlassCard>
      ) : familyId && profile ? (
        <BabyChart familyId={familyId} currentUserId={profile.userId} members={members} />
      ) : (
        <FamilyOnboarding onDone={reload} />
      )}
    </div>
  );
}
