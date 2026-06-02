"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Copy, Check, Users, CalendarDays, Baby, Wallet, Images, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { SummaryStrip } from "@/components/dashboard/SummaryStrip";
import { Sidebar, MobileTabBar, type TabKey } from "@/components/dashboard/Sidebar";
import { TopBar } from "@/components/dashboard/TopBar";
import { CalendarCard } from "@/components/dashboard/CalendarCard";
import { CalendarBoard } from "@/components/dashboard/CalendarBoard";
import { AssetSummaryCard } from "@/components/dashboard/AssetSummaryCard";
import { AssetBoard } from "@/components/dashboard/AssetBoard";
import { BabyTimelineCard } from "@/components/dashboard/BabyTimelineCard";
import { BabyChart } from "@/components/dashboard/BabyChart";
import { PhotoCoverflowCard } from "@/components/dashboard/PhotoCoverflowCard";
import { PhotoBoard } from "@/components/dashboard/PhotoBoard";
import { TodoSummaryCard } from "@/components/dashboard/TodoSummaryCard";
import { TodoBoard } from "@/components/dashboard/TodoBoard";
import { FamilyMemo } from "@/components/dashboard/FamilyMemo";
import { SettingsPanel } from "@/components/dashboard/SettingsPanel";
import { FamilyOnboarding } from "@/components/dashboard/FamilyOnboarding";
import { MyPageModal } from "@/components/dashboard/MyPageModal";
import { GlassCard, CardHeader } from "@/components/ui/GlassCard";

const TITLES: Record<TabKey, { title: string; subtitle: string }> = {
  overview: { title: "안녕하세요, 오늘도 함께해요 👋", subtitle: "우리 둘의 하루" },
  calendar: { title: "캘린더", subtitle: "자체 일정 + Google Calendar" },
  assets: { title: "자산 관리", subtitle: "스마트 가계부" },
  baby: { title: "육아 차트", subtitle: "실시간 타임라인" },
  todos: { title: "할일 · 장보기", subtitle: "함께 보는 공유 체크리스트" },
  photos: { title: "사진첩", subtitle: "Google Drive 연동" },
  settings: { title: "설정", subtitle: "대시보드 개인화" },
};

interface Profile {
  userId: string;
  familyId: string | null;
  displayName: string;
  email: string;
  avatarUrl: string | null;
}

export default function DashboardPage() {
  const [active, setActiveState] = useState<TabKey>("overview");
  const [enabled, setEnabled] = useState<TabKey[]>(["calendar", "assets", "baby", "todos", "photos"]);

  // 탭을 URL(?tab=)과 동기화해 브라우저 뒤로/앞으로가 탭 사이를 오가게 한다.
  useEffect(() => {
    const readTab = () => {
      const t = new URLSearchParams(window.location.search).get("tab") as TabKey | null;
      setActiveState(t && t in TITLES ? t : "overview");
    };
    readTab();
    window.addEventListener("popstate", readTab);
    return () => window.removeEventListener("popstate", readTab);
  }, []);

  const setActive = useCallback((key: TabKey) => {
    setActiveState(key);
    const url = key === "overview" ? window.location.pathname : `${window.location.pathname}?tab=${key}`;
    if (key === (new URLSearchParams(window.location.search).get("tab") ?? "overview")) return;
    window.history.pushState({ tab: key }, "", url);
  }, []);
  const [primary, setPrimary] = useState<TabKey>("baby");

  const [profile, setProfile] = useState<Profile | null>(null);
  const [homeName, setHomeName] = useState("our home");
  const [members, setMembers] = useState<Record<string, { name: string; avatar: string | null }>>({});
  const [profileLoading, setProfileLoading] = useState(true);
  const [myPageOpen, setMyPageOpen] = useState(false);

  const loadProfile = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data: me } = await supabase
      .from("users")
      .select("id, family_id, display_name, avatar_url")
      .eq("id", user.id)
      .single();
    const familyId = me?.family_id ?? null;
    setProfile({
      userId: user.id,
      familyId,
      displayName: me?.display_name ?? user.email ?? "나",
      email: user.email ?? "",
      avatarUrl: me?.avatar_url ?? null,
    });
    if (familyId) {
      const { data: mem } = await supabase
        .from("users")
        .select("id, display_name, avatar_url")
        .eq("family_id", familyId);
      setMembers(
        Object.fromEntries(
          (mem ?? []).map((m) => [m.id, { name: m.display_name ?? "익명", avatar: m.avatar_url ?? null }])
        )
      );
      const { data: fam } = await supabase.from("families").select("name").eq("id", familyId).single();
      setHomeName(fam?.name?.trim() || "our home");
    } else {
      setHomeName("our home");
    }

    // 저장된 대시보드 개인화(활성 탭·메인) 복원
    const { data: st } = await supabase
      .from("settings")
      .select("enabled_tabs, primary_tab")
      .eq("user_id", user.id)
      .single();
    if (st) {
      const valid: TabKey[] = ["calendar", "assets", "baby", "todos", "photos"];
      const en = ((st.enabled_tabs as TabKey[]) ?? []).filter((k) => valid.includes(k));
      // 'todos'는 이후 추가된 모듈 — 옛 설정엔 없으므로 자동 노출(사용자가 끈 게 아님).
      if (en.length && !en.includes("todos")) en.push("todos");
      if (en.length) setEnabled(en);
      if (st.primary_tab && valid.includes(st.primary_tab as TabKey)) setPrimary(st.primary_tab as TabKey);
    }

    setProfileLoading(false);
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // 개인화 변경을 public.settings 에 즉시 저장(없으면 생성).
  const persistSettings = useCallback(
    async (next: { enabled?: TabKey[]; primary?: TabKey }) => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("settings").upsert({
        user_id: user.id,
        ...(next.enabled ? { enabled_tabs: next.enabled } : {}),
        ...(next.primary ? { primary_tab: next.primary } : {}),
      });
    },
    []
  );

  const toggle = (key: TabKey) =>
    setEnabled((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      persistSettings({ enabled: next });
      return next;
    });

  const choosePrimary = (key: TabKey) => {
    setPrimary(key);
    persistSettings({ primary: key });
  };

  const orderedCards = useMemo<TabKey[]>(() => {
    const rest = enabled.filter((k) => k !== primary);
    return [primary, ...rest].filter((k) => enabled.includes(k));
  }, [enabled, primary]);

  const meta = TITLES[active];
  const familyId = profile?.familyId ?? null;

  // 가족이 없을 때 육아 탭에 보여줄 온보딩
  const babyContent =
    familyId && profile ? (
      <BabyChart familyId={familyId} currentUserId={profile.userId} members={members} />
    ) : (
      <FamilyOnboarding onDone={loadProfile} />
    );

  return (
    <div className="mx-auto flex min-h-screen max-w-[1400px]">
      <Sidebar active={active} onChange={setActive} enabled={enabled} homeName={homeName} />

      <main className="min-w-0 flex-1 px-3 pb-28 pt-3 lg:px-8 lg:pb-10">
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

        {active === "overview" && (
          <>
            <SummaryStrip familyId={familyId ?? undefined} />

            <div className="grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {orderedCards.map((key, i) => (
                <div
                  key={key}
                  role="button"
                  tabIndex={0}
                  onClick={() => setActive(key)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setActive(key);
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
              <QuickAction icon={<CalendarDays className="h-4 w-4" />} label="일정" onClick={() => setActive("calendar")} />
              <QuickAction icon={<Baby className="h-4 w-4" />} label="육아 기록" onClick={() => setActive("baby")} />
              <QuickAction icon={<Wallet className="h-4 w-4" />} label="지출" onClick={() => setActive("assets")} />
              <QuickAction icon={<Images className="h-4 w-4" />} label="사진" onClick={() => setActive("photos")} />
            </div>
          </>
        )}

        {active === "calendar" && (
          <div className="animate-fade-up">
            <CalendarBoard />
          </div>
        )}
        {active === "assets" && (
          <div className="animate-fade-up">
            {profileLoading ? (
              <GlassCard className="py-10 text-center text-sm text-zinc-500">불러오는 중…</GlassCard>
            ) : familyId && profile ? (
              <AssetBoard familyId={familyId} currentUserId={profile.userId} members={members} />
            ) : (
              <FamilyOnboarding onDone={loadProfile} />
            )}
          </div>
        )}
        {active === "baby" && (
          <div className="animate-fade-up">
            {profileLoading ? (
              <GlassCard className="py-10 text-center text-sm text-zinc-500">불러오는 중…</GlassCard>
            ) : (
              babyContent
            )}
          </div>
        )}
        {active === "todos" && (
          <div className="animate-fade-up">
            {profileLoading ? (
              <GlassCard className="py-10 text-center text-sm text-zinc-500">불러오는 중…</GlassCard>
            ) : familyId && profile ? (
              <TodoBoard familyId={familyId} currentUserId={profile.userId} members={members} />
            ) : (
              <FamilyOnboarding onDone={loadProfile} />
            )}
          </div>
        )}
        {active === "photos" && (
          <div className="animate-fade-up">
            {profileLoading ? (
              <GlassCard className="py-10 text-center text-sm text-zinc-500">불러오는 중…</GlassCard>
            ) : familyId && profile ? (
              <PhotoBoard familyId={familyId} members={members} />
            ) : (
              <FamilyOnboarding onDone={loadProfile} />
            )}
          </div>
        )}
        {active === "settings" && (
          <div className="animate-fade-up space-y-5">
            {familyId && <InviteCodeCard code={familyId} memberCount={Object.keys(members).length} />}
            <SettingsPanel
              enabled={enabled}
              primary={primary}
              onToggle={toggle}
              onSetPrimary={choosePrimary}
            />
          </div>
        )}
      </main>

      <MobileTabBar active={active} onChange={setActive} enabled={enabled} />

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
          onSaved={loadProfile}
        />
      )}
    </div>
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

/** 배우자를 초대할 때 공유하는 코드(= 가족 id) 카드. */
function InviteCodeCard({ code, memberCount }: { code: string; memberCount: number }) {
  const [copied, setCopied] = useState(false);
  return (
    <GlassCard className="max-w-xl">
      <CardHeader
        icon={<Users className="h-4.5 w-4.5" />}
        title="가족 초대"
        hint={`현재 ${memberCount}명 참여 중`}
      />
      <p className="prose-ko mb-3 text-sm text-zinc-400">
        아래 초대 코드를 배우자에게 보내세요. 배우자가 로그인 후 "초대 코드로 합류"에 붙여넣으면 같은
        가족으로 연결됩니다.
      </p>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-xs text-accent">
          {code}
        </code>
        <button
          onClick={() => {
            navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-accent/90 px-3 py-2.5 text-sm font-medium text-ink-900 transition-all duration-300 ease-out-back hover:scale-102 hover:bg-accent"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "복사됨" : "복사"}
        </button>
      </div>
    </GlassCard>
  );
}
