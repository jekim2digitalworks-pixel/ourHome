"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { TabKey } from "@/components/dashboard/Sidebar";

export interface Profile {
  userId: string;
  familyId: string | null;
  displayName: string;
  email: string;
  avatarUrl: string | null;
}

export type Members = Record<string, { name: string; avatar: string | null }>;

interface DashboardState {
  profile: Profile | null;
  homeName: string;
  members: Members;
  profileLoading: boolean;
  familyId: string | null;
  enabled: TabKey[];
  primary: TabKey;
  /** primary 우선 정렬된, 개요 화면에 노출할 카드 순서 */
  orderedCards: TabKey[];
  toggle: (key: TabKey) => void;
  choosePrimary: (key: TabKey) => void;
  reload: () => Promise<void>;
  myPageOpen: boolean;
  setMyPageOpen: (open: boolean) => void;
}

const Ctx = createContext<DashboardState | null>(null);

/** /dashboard 하위 모든 페이지에서 공유하는 프로필·가족·개인화 상태. */
export function useDashboard() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useDashboard must be used within <DashboardProvider>");
  return v;
}

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState<TabKey[]>(["calendar", "assets", "baby", "todos", "photos"]);
  const [primary, setPrimary] = useState<TabKey>("baby");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [homeName, setHomeName] = useState("our home");
  const [members, setMembers] = useState<Members>({});
  const [profileLoading, setProfileLoading] = useState(true);
  const [myPageOpen, setMyPageOpen] = useState(false);

  const reload = useCallback(async () => {
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
    reload();
  }, [reload]);

  // 개인화 변경을 public.settings 에 즉시 저장(없으면 생성).
  const persistSettings = useCallback(async (next: { enabled?: TabKey[]; primary?: TabKey }) => {
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
  }, []);

  const toggle = useCallback(
    (key: TabKey) =>
      setEnabled((prev) => {
        const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
        persistSettings({ enabled: next });
        return next;
      }),
    [persistSettings]
  );

  const choosePrimary = useCallback(
    (key: TabKey) => {
      setPrimary(key);
      persistSettings({ primary: key });
    },
    [persistSettings]
  );

  const orderedCards = useMemo<TabKey[]>(() => {
    const rest = enabled.filter((k) => k !== primary);
    return [primary, ...rest].filter((k) => enabled.includes(k));
  }, [enabled, primary]);

  const value = useMemo<DashboardState>(
    () => ({
      profile,
      homeName,
      members,
      profileLoading,
      familyId: profile?.familyId ?? null,
      enabled,
      primary,
      orderedCards,
      toggle,
      choosePrimary,
      reload,
      myPageOpen,
      setMyPageOpen,
    }),
    [profile, homeName, members, profileLoading, enabled, primary, orderedCards, toggle, choosePrimary, reload, myPageOpen]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
