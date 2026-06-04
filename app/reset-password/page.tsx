"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Home, Lock, Loader2, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { GlassCard } from "@/components/ui/GlassCard";

/**
 * 비밀번호 재설정 완료 페이지.
 * 이메일의 재설정 링크 → /auth/callback 에서 복구 세션으로 교환된 뒤 이곳으로 옵니다.
 * 그 세션으로 supabase.auth.updateUser({ password }) 를 호출해 새 비밀번호를 저장합니다.
 */
export default function ResetPasswordPage() {
  const [ready, setReady] = useState<"checking" | "ok" | "no-session">("checking");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // 로고 클릭 목적지: 로그인(복구) 세션이 있으면 대시보드, 아니면 랜딩.
  const [homeHref, setHomeHref] = useState("/");

  // 복구 세션이 실제로 존재하는지 확인(링크 만료/직접 접근 대비).
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setReady(data.user ? "ok" : "no-session");
      if (data.user) setHomeHref("/dashboard");
    });
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    if (pw.length < 6) {
      setErrorMsg("비밀번호는 6자 이상이어야 해요.");
      return;
    }
    if (pw !== pw2) {
      setErrorMsg("두 비밀번호가 일치하지 않아요.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: pw });
    setLoading(false);
    if (error) {
      setErrorMsg("변경에 실패했어요. 링크가 만료됐을 수 있어요. 다시 요청해 주세요.");
      return;
    }
    setDone(true);
    // 잠시 후 대시보드로 이동.
    setTimeout(() => {
      window.location.href = "/dashboard";
    }, 1500);
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <GlassCard className="w-full max-w-sm p-7">
        <div className="mb-6 flex flex-col items-center text-center">
          <Link
            href={homeHref}
            aria-label="홈으로"
            className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 text-accent ring-1 ring-accent/30 transition-transform duration-300 ease-out-back hover:scale-105"
          >
            <Home className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-semibold tracking-tight text-zinc-100">새 비밀번호 설정</h1>
          <p className="prose-ko mt-1 text-sm text-zinc-400">새로 사용할 비밀번호를 입력해 주세요.</p>
        </div>

        {ready === "checking" ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" /> 확인 중…
          </div>
        ) : ready === "no-session" ? (
          <div>
            <p className="prose-ko rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
              재설정 링크가 만료됐거나 유효하지 않아요. 로그인 화면에서 다시 요청해 주세요.
            </p>
            <Link
              href="/login"
              className="mt-5 block text-center text-xs text-zinc-500 transition-colors hover:text-zinc-300"
            >
              ← 로그인으로 돌아가기
            </Link>
          </div>
        ) : done ? (
          <p className="prose-ko flex items-center justify-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
            <Check className="h-4 w-4" /> 변경됐어요! 대시보드로 이동합니다…
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            {errorMsg && (
              <p className="prose-ko rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
                {errorMsg}
              </p>
            )}
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 focus-within:border-accent/40">
              <Lock className="h-4 w-4 text-zinc-500" />
              <input
                type="password"
                required
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="새 비밀번호 (6자 이상)"
                className="w-full bg-transparent text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 focus-within:border-accent/40">
              <Lock className="h-4 w-4 text-zinc-500" />
              <input
                type="password"
                required
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                placeholder="새 비밀번호 확인"
                className="w-full bg-transparent text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-ink-900 transition-all duration-300 ease-out-back hover:scale-102 hover:bg-accent-soft disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              비밀번호 변경
            </button>
          </form>
        )}
      </GlassCard>
    </div>
  );
}
