"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Camera, Loader2, Check, User, KeyRound, LogOut, Home } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function MyPageModal({
  open,
  onClose,
  userId,
  email,
  displayName,
  avatarUrl,
  familyId,
  homeName,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  userId: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  familyId?: string | null;
  homeName?: string;
  onSaved: () => void;
}) {
  const [name, setName] = useState(displayName);
  const [avatar, setAvatar] = useState<string | null>(avatarUrl);
  const [uploading, setUploading] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);

  const [home, setHome] = useState(homeName ?? "");
  const [savingHome, setSavingHome] = useState(false);
  const [homeSaved, setHomeSaved] = useState(false);

  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pwSaving, setPwSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(displayName);
    setAvatar(avatarUrl);
    setHome(homeName ?? "");
  }, [displayName, avatarUrl, homeName, open]);

  if (!open || typeof document === "undefined") return null;

  async function uploadAvatar(file: File) {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/profile/avatar", { method: "POST", body: fd });
    const data = await res.json();
    if (res.ok) {
      setAvatar(data.url);
      onSaved();
    }
    setUploading(false);
  }

  async function saveName() {
    if (!name.trim()) return;
    setSavingName(true);
    const supabase = createClient();
    await supabase.from("users").update({ display_name: name.trim() }).eq("id", userId);
    setSavingName(false);
    setNameSaved(true);
    setTimeout(() => setNameSaved(false), 1500);
    onSaved();
  }

  async function saveHome() {
    if (!familyId || !home.trim()) return;
    setSavingHome(true);
    const supabase = createClient();
    await supabase.from("families").update({ name: home.trim() }).eq("id", familyId);
    setSavingHome(false);
    setHomeSaved(true);
    setTimeout(() => setHomeSaved(false), 1500);
    onSaved();
  }

  async function changePassword() {
    setPwMsg(null);
    if (pw.length < 6) {
      setPwMsg({ ok: false, text: "비밀번호는 6자 이상이어야 해요." });
      return;
    }
    if (pw !== pw2) {
      setPwMsg({ ok: false, text: "두 비밀번호가 일치하지 않아요." });
      return;
    }
    setPwSaving(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: pw });
    setPwSaving(false);
    if (error) {
      setPwMsg({ ok: false, text: "변경 실패: " + error.message });
    } else {
      setPwMsg({ ok: true, text: "비밀번호가 변경됐어요." });
      setPw("");
      setPw2("");
    }
  }

  async function logout() {
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    // 전체 새로고침으로 세션·클라이언트 상태를 깨끗이 비우고 로그인으로 이동.
    window.location.href = "/login";
  }

  const initial = (name || email || "?").trim().charAt(0).toUpperCase();

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-ink-800 p-6 shadow-bezel-lg ring-1 ring-black/40"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 hover:bg-white/10 hover:text-zinc-200"
          aria-label="닫기"
        >
          <X className="h-4 w-4" />
        </button>

        <h2 className="mb-5 text-base font-semibold tracking-tight text-zinc-100">마이페이지</h2>

        {/* 프로필 사진 */}
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="relative">
            <div className="h-24 w-24 overflow-hidden rounded-full border border-white/10 bg-white/[0.05]">
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatar} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-accent/15 text-3xl font-semibold text-accent">
                  {initial}
                </div>
              )}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-accent text-ink-900 shadow-bezel transition-all duration-300 ease-out-back hover:scale-105"
              aria-label="사진 변경"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])}
            />
          </div>
          <p className="text-xs text-zinc-500">{email}</p>
        </div>

        {/* 닉네임 */}
        <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-zinc-400">
          <User className="h-3.5 w-3.5" /> 닉네임 (기록 작성자로 표시됩니다)
        </label>
        <div className="mb-5 flex items-center gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && saveName()}
            placeholder="닉네임"
            className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-accent/40 focus:outline-none"
          />
          <button
            onClick={saveName}
            disabled={savingName || !name.trim()}
            className="flex shrink-0 items-center gap-1 rounded-xl bg-accent/90 px-3 py-2.5 text-sm font-medium text-ink-900 transition-all duration-300 ease-out-back hover:scale-102 hover:bg-accent disabled:opacity-40"
          >
            {savingName ? <Loader2 className="h-4 w-4 animate-spin" /> : nameSaved ? <Check className="h-4 w-4" /> : null}
            {nameSaved ? "저장됨" : "저장"}
          </button>
        </div>

        {/* 집 이름 (가족이 있을 때만) */}
        {familyId && (
          <>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-zinc-400">
              <Home className="h-3.5 w-3.5" /> 집 이름 (사이드바에 표시됩니다)
            </label>
            <div className="mb-5 flex items-center gap-2">
              <input
                value={home}
                onChange={(e) => setHome(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveHome()}
                placeholder="예: 우리집, OO네"
                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-accent/40 focus:outline-none"
              />
              <button
                onClick={saveHome}
                disabled={savingHome || !home.trim()}
                className="flex shrink-0 items-center gap-1 rounded-xl bg-accent/90 px-3 py-2.5 text-sm font-medium text-ink-900 transition-all duration-300 ease-out-back hover:scale-102 hover:bg-accent disabled:opacity-40"
              >
                {savingHome ? <Loader2 className="h-4 w-4 animate-spin" /> : homeSaved ? <Check className="h-4 w-4" /> : null}
                {homeSaved ? "저장됨" : "저장"}
              </button>
            </div>
          </>
        )}

        {/* 비밀번호 변경 */}
        <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-zinc-400">
          <KeyRound className="h-3.5 w-3.5" /> 비밀번호 변경
        </label>
        <div className="space-y-2">
          <input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="새 비밀번호 (6자 이상)"
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-accent/40 focus:outline-none"
          />
          <div className="flex items-center gap-2">
            <input
              type="password"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && changePassword()}
              placeholder="새 비밀번호 확인"
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-accent/40 focus:outline-none"
            />
            <button
              onClick={changePassword}
              disabled={pwSaving || !pw || !pw2}
              className="flex shrink-0 items-center gap-1 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-sm font-medium text-zinc-100 transition-all duration-300 ease-out-back hover:scale-102 hover:bg-white/[0.1] disabled:opacity-40"
            >
              {pwSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "변경"}
            </button>
          </div>
          {pwMsg && (
            <p
              className={[
                "rounded-lg px-3 py-2 text-xs",
                pwMsg.ok
                  ? "border border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
                  : "border border-rose-400/20 bg-rose-400/10 text-rose-200",
              ].join(" ")}
            >
              {pwMsg.text}
            </p>
          )}
          <p className="text-[11px] text-zinc-600">
            Google 로그인 계정도 비밀번호를 설정하면 이메일+비밀번호로도 로그인할 수 있어요.
          </p>
        </div>

        {/* 로그아웃 */}
        <div className="mt-6 border-t border-white/10 pt-4">
          <button
            onClick={logout}
            disabled={loggingOut}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-2.5 text-sm font-medium text-rose-200 transition-all duration-300 ease-out-back hover:scale-102 hover:bg-rose-400/15 disabled:opacity-50"
          >
            {loggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
            로그아웃
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
