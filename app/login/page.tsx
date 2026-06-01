"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart, Mail, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { GlassCard } from "@/components/ui/GlassCard";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/dashboard` },
    });
    setLoading(false);
    if (!error) setSent(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <GlassCard className="w-full max-w-sm p-7">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 text-accent ring-1 ring-accent/30">
            <Heart className="h-5 w-5" fill="currentColor" strokeWidth={0} />
          </span>
          <h1 className="text-lg font-semibold tracking-tight text-zinc-100">Our_Home 로그인</h1>
          <p className="prose-ko mt-1 text-sm text-zinc-400">
            이메일로 매직 링크를 보내드려요. 비밀번호는 필요 없습니다.
          </p>
        </div>

        {sent ? (
          <p className="prose-ko rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
            <strong>{email}</strong> 으로 로그인 링크를 보냈어요. 메일함을 확인해 주세요.
          </p>
        ) : (
          <form onSubmit={sendMagicLink} className="space-y-3">
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
              {loading ? "전송 중…" : "매직 링크 받기"}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>
        )}

        <Link
          href="/"
          className="mt-5 block text-center text-xs text-zinc-500 transition-colors hover:text-zinc-300"
        >
          ← 홈으로 돌아가기
        </Link>
      </GlassCard>
    </div>
  );
}
