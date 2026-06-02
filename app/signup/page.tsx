"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart, Mail, Lock, User, ArrowRight, Loader2, MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { GlassCard } from "@/components/ui/GlassCard";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [done, setDone] = useState<"none" | "confirm" | "signed-in">("none");

  // Google 회원가입(= 로그인): 캘린더/드라이브 권한까지 한 번에 받습니다.
  async function signUpWithGoogle() {
    setLoading(true);
    setErrorMsg(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        scopes:
          "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/drive.file",
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
    if (error) {
      setLoading(false);
      setErrorMsg("Google 가입을 시작할 수 없어요. 잠시 후 다시 시도해 주세요.");
    }
  }

  async function signUpWithEmail(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    if (password.length < 6) {
      setErrorMsg("비밀번호는 6자 이상이어야 해요.");
      return;
    }
    if (password !== password2) {
      setErrorMsg("두 비밀번호가 일치하지 않아요.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        data: { name: name.trim() || undefined },
      },
    });
    setLoading(false);
    if (error) {
      setErrorMsg(
        error.message.includes("already") || error.message.includes("registered")
          ? "이미 가입된 이메일이에요. 로그인해 주세요."
          : "가입에 실패했어요. 잠시 후 다시 시도해 주세요."
      );
      return;
    }
    // 이미 가입된 이메일이면 Supabase가 보안상 성공처럼 응답하되 identities 가 비어 있고
    // 확인 메일을 보내지 않습니다. 이 경우를 구분해 안내합니다.
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      setErrorMsg("이미 가입된 이메일이에요. 로그인하거나 비밀번호 재설정을 이용해 주세요.");
      return;
    }
    // 이메일 확인이 켜져 있으면 세션 없이 확인 메일이 발송됩니다.
    if (data.session) {
      window.location.href = "/dashboard";
      return;
    }
    setDone("confirm");
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <GlassCard className="w-full max-w-sm p-7">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 text-accent ring-1 ring-accent/30">
            <Heart className="h-5 w-5" fill="currentColor" strokeWidth={0} />
          </span>
          <h1 className="text-lg font-semibold tracking-tight text-zinc-100">Our_Home 회원가입</h1>
          <p className="prose-ko mt-1 text-sm text-zinc-400">두 사람의 홈을 시작해 보세요.</p>
        </div>

        {done === "confirm" ? (
          <p className="prose-ko flex items-start gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
            <MailCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              <strong>{email}</strong> 으로 확인 메일을 보냈어요. 메일의 링크를 누르면 가입이
              완료되고 자동으로 로그인됩니다.
            </span>
          </p>
        ) : (
          <>
            {/* Google 가입 */}
            <button
              onClick={signUpWithGoogle}
              disabled={loading}
              className="mb-4 flex w-full items-center justify-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm font-medium text-zinc-100 transition-all duration-300 ease-out-back hover:scale-102 hover:bg-white/[0.1] disabled:opacity-50"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
                />
              </svg>
              Google로 가입 · 캘린더 연동
            </button>

            <div className="mb-4 flex items-center gap-3 text-[11px] text-zinc-600">
              <span className="h-px flex-1 bg-white/10" />
              또는 이메일
              <span className="h-px flex-1 bg-white/10" />
            </div>

            {errorMsg && (
              <p className="prose-ko mb-3 rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
                {errorMsg}
              </p>
            )}

            <form onSubmit={signUpWithEmail} className="space-y-3">
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 focus-within:border-accent/40">
                <User className="h-4 w-4 text-zinc-500" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="닉네임 (선택)"
                  className="w-full bg-transparent text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 focus-within:border-accent/40">
                <Mail className="h-4 w-4 text-zinc-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-transparent text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 focus-within:border-accent/40">
                <Lock className="h-4 w-4 text-zinc-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호 (6자 이상)"
                  className="w-full bg-transparent text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 focus-within:border-accent/40">
                <Lock className="h-4 w-4 text-zinc-500" />
                <input
                  type="password"
                  required
                  value={password2}
                  onChange={(e) => setPassword2(e.target.value)}
                  placeholder="비밀번호 확인"
                  className="w-full bg-transparent text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-ink-900 transition-all duration-300 ease-out-back hover:scale-102 hover:bg-accent-soft disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {loading ? "처리 중…" : "가입하기"}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </button>
            </form>
          </>
        )}

        <p className="mt-5 text-center text-xs text-zinc-500">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="text-accent transition-colors hover:text-accent-soft">
            로그인
          </Link>
        </p>
      </GlassCard>
    </div>
  );
}
