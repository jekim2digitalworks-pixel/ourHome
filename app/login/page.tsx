"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, Mail, ArrowRight, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { GlassCard } from "@/components/ui/GlassCard";

type Mode = "password" | "magic";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resetView, setResetView] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  // 콜백에서 code 교환 실패 시 ?error=auth 로 돌아옵니다.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("error") === "auth") {
      setAuthError(true);
    }
  }, []);

  // 통합 로그인: Google 로그인 + 캘린더/드라이브 권한을 한 번에 받습니다.
  // access_type=offline + prompt=consent 로 provider_refresh_token을 확보합니다.
  async function signInWithGoogle() {
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
      setErrorMsg("Google 로그인을 시작할 수 없어요. 잠시 후 다시 시도해 주세요.");
    }
    // 성공 시 브라우저가 Google 동의 화면으로 리다이렉트됩니다.
  }

  async function signInWithPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setErrorMsg("이메일 또는 비밀번호가 올바르지 않아요.");
      return;
    }
    // 전체 페이지 이동으로 서버(미들웨어)가 새 세션 쿠키를 즉시 인식하게 함.
    window.location.href = "/dashboard";
  }

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard` },
    });
    setLoading(false);
    if (error) {
      setErrorMsg(
        error.status === 429
          ? "이메일 발송 한도를 초과했어요. 잠시 후 다시 시도하거나 비밀번호 로그인을 이용하세요."
          : "링크 전송에 실패했어요. 잠시 후 다시 시도해 주세요."
      );
      return;
    }
    setSent(true);
  }

  // 비밀번호 재설정 메일 요청. 링크는 /auth/callback 에서 복구 세션으로 교환된 뒤
  // /reset-password 페이지로 이동해 새 비밀번호를 설정합니다.
  async function sendReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    setLoading(false);
    if (error) {
      setErrorMsg(
        error.status === 429
          ? "이메일 발송 한도를 초과했어요. 잠시 후 다시 시도해 주세요."
          : "메일 전송에 실패했어요. 잠시 후 다시 시도해 주세요."
      );
      return;
    }
    setResetSent(true);
  }

  function backToLogin() {
    setResetView(false);
    setResetSent(false);
    setErrorMsg(null);
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <GlassCard className="w-full max-w-sm p-7">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 text-accent ring-1 ring-accent/30">
            <Heart className="h-5 w-5" fill="currentColor" strokeWidth={0} />
          </span>
          <h1 className="text-lg font-semibold tracking-tight text-zinc-100">Our_Home 로그인</h1>
          <p className="prose-ko mt-1 text-sm text-zinc-400">두 사람의 홈에 오신 것을 환영해요.</p>
        </div>

        {resetView ? (
          /* ── 비밀번호 재설정 요청 ── */
          <div>
            {resetSent ? (
              <p className="prose-ko rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
                <strong>{email}</strong> 으로 재설정 링크를 보냈어요. 메일함을 확인하고 링크를 눌러 새
                비밀번호를 설정해 주세요.
              </p>
            ) : (
              <>
                <p className="prose-ko mb-4 text-sm text-zinc-400">
                  가입한 이메일을 입력하면 비밀번호 재설정 링크를 보내드려요.
                </p>
                {errorMsg && (
                  <p className="prose-ko mb-3 rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
                    {errorMsg}
                  </p>
                )}
                <form onSubmit={sendReset} className="space-y-3">
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
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-ink-900 transition-all duration-300 ease-out-back hover:scale-102 hover:bg-accent-soft disabled:opacity-50"
                  >
                    {loading ? "처리 중…" : "재설정 메일 받기"}
                    {!loading && <ArrowRight className="h-4 w-4" />}
                  </button>
                </form>
              </>
            )}
            <button
              onClick={backToLogin}
              className="mt-5 block w-full text-center text-xs text-zinc-500 transition-colors hover:text-zinc-300"
            >
              ← 로그인으로 돌아가기
            </button>
          </div>
        ) : (
          <>
        {/* 통합 로그인: Google */}
        <button
          onClick={signInWithGoogle}
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
          Google로 로그인 · 캘린더 연동
        </button>

        <div className="mb-4 flex items-center gap-3 text-[11px] text-zinc-600">
          <span className="h-px flex-1 bg-white/10" />
          또는 이메일
          <span className="h-px flex-1 bg-white/10" />
        </div>

        {/* 모드 전환 탭 */}
        <div className="mb-4 flex rounded-xl border border-white/10 bg-white/[0.04] p-0.5">
          {(["password", "magic"] as const).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setErrorMsg(null);
                setSent(false);
              }}
              className={[
                "flex-1 rounded-lg px-3 py-1.5 text-xs transition-all duration-300 ease-out-back",
                mode === m ? "bg-white/10 text-zinc-100 shadow-bezel" : "text-zinc-500",
              ].join(" ")}
            >
              {m === "password" ? "비밀번호" : "매직 링크"}
            </button>
          ))}
        </div>

        {authError && !sent && (
          <p className="prose-ko mb-3 rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
            로그인 링크가 만료됐거나 이미 사용됐어요. 비밀번호로 로그인하거나 새 링크를 받아주세요.
          </p>
        )}
        {errorMsg && (
          <p className="prose-ko mb-3 rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
            {errorMsg}
          </p>
        )}

        {mode === "magic" && sent ? (
          <p className="prose-ko rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
            <strong>{email}</strong> 으로 로그인 링크를 보냈어요. 메일함을 확인해 주세요.
          </p>
        ) : (
          <form onSubmit={mode === "password" ? signInWithPassword : sendMagicLink} className="space-y-3">
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

            {mode === "password" && (
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 focus-within:border-accent/40">
                <Lock className="h-4 w-4 text-zinc-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호"
                  className="w-full bg-transparent text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-ink-900 transition-all duration-300 ease-out-back hover:scale-102 hover:bg-accent-soft disabled:opacity-50"
            >
              {loading ? "처리 중…" : mode === "password" ? "로그인" : "매직 링크 받기"}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>

            {mode === "password" && (
              <button
                type="button"
                onClick={() => {
                  setResetView(true);
                  setErrorMsg(null);
                }}
                className="block w-full text-center text-xs text-zinc-500 transition-colors hover:text-zinc-300"
              >
                비밀번호를 잊으셨나요?
              </button>
            )}
          </form>
        )}
          </>
        )}

        {!resetView && (
          <p className="mt-5 text-center text-xs text-zinc-500">
            아직 계정이 없으신가요?{" "}
            <Link href="/signup" className="text-accent transition-colors hover:text-accent-soft">
              가입하기
            </Link>
          </p>
        )}

        <Link
          href="/"
          className="mt-3 block text-center text-xs text-zinc-500 transition-colors hover:text-zinc-300"
        >
          ← 홈으로 돌아가기
        </Link>
      </GlassCard>
    </div>
  );
}
