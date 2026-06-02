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
  /** 활성 모듈 — 배열 순서가 곧 대시보드 노출 순위. */
  enabled: TabKey[];
  /** 개요 화면에 노출할 카드 순서(= enabled 그대로). */
  orderedCards: TabKey[];
  toggle: (key: TabKey) => void;
  /** 드래그앤드롭으로 정한 새 순서를 반영·저장. */
  reorder: (next: TabKey[]) => void;
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
      .select("enabled_tabs")
      .eq("user_id", user.id)
      .single();
    if (st) {
      const valid: TabKey[] = ["calendar", "assets", "baby", "todos", "photos"];
      const en = ((st.enabled_tabs as TabKey[]) ?? []).filter((k) => valid.includes(k));
      // 'todos'는 이후 추가된 모듈 — 옛 설정엔 없으므로 자동 노출(사용자가 끈 게 아님).
      if (en.length && !en.includes("todos")) en.push("todos");
      // enabled_tabs 의 저장 순서가 곧 노출 순위.
      if (en.length) setEnabled(en);
    }

    setProfileLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  // 개인화(활성 모듈·순서)를 public.settings.enabled_tabs 에 즉시 저장.
  const persistEnabled = useCallback(async (next: TabKey[]) => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("settings").upsert({ user_id: user.id, enabled_tabs: next });
  }, []);

  const toggle = useCallback(
    (key: TabKey) =>
      setEnabled((prev) => {
        // 켜면 맨 뒤에 추가(순위 최하단), 끄면 제거.
        const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
        persistEnabled(next);
        return next;
      }),
    [persistEnabled]
  );

  const reorder = useCallback(
    (next: TabKey[]) => {
      setEnabled(next);
      persistEnabled(next);
    },
    [persistEnabled]
  );

  const orderedCards = useMemo<TabKey[]>(() => [...enabled], [enabled]);

  const value = useMemo<DashboardState>(
    () => ({
      profile,
      homeName,
      members,
      profileLoading,
      familyId: profile?.familyId ?? null,
      enabled,
      orderedCards,
      toggle,
      reorder,
      reload,
      myPageOpen,
      setMyPageOpen,
    }),
    [profile, homeName, members, profileLoading, enabled, orderedCards, toggle, reorder, reload, myPageOpen]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
