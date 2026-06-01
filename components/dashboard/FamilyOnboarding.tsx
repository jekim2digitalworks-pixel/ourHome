"use client";

import { useState } from "react";
import { Home, Users, Loader2, ArrowRight } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";

/**
 * 가족 그룹이 없는 사용자에게 보여주는 온보딩.
 * 새 가족 만들기 또는 초대 코드로 합류 → 성공 시 onDone()으로 프로필 재로드.
 */
export function FamilyOnboarding({ onDone }: { onDone: () => void }) {
  const [mode, setMode] = useState<"create" | "join">("create");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/family/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "create" ? { name } : { code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "처리에 실패했어요.");
        return;
      }
      onDone();
    } finally {
      setLoading(false);
    }
  }

  return (
    <GlassCard className="mx-auto max-w-md p-7">
      <div className="mb-6 flex flex-col items-center text-center">
        <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 text-accent ring-1 ring-accent/30">
          <Home className="h-5 w-5" />
        </span>
        <h2 className="text-lg font-semibold tracking-tight text-zinc-100">가족 그룹 만들기</h2>
        <p className="prose-ko mt-1 text-sm text-zinc-400">
          두 사람을 하나로 묶어야 가계부·육아 기록을 함께 볼 수 있어요.
        </p>
      </div>

      <div className="mb-4 flex rounded-xl border border-white/10 bg-white/[0.04] p-0.5">
        {(["create", "join"] as const).map((m) => (
          <button
            key={m}
            onClick={() => {
              setMode(m);
              setError(null);
            }}
            className={[
              "flex-1 rounded-lg px-3 py-1.5 text-xs transition-all duration-300 ease-out-back",
              mode === m ? "bg-white/10 text-zinc-100 shadow-bezel" : "text-zinc-500",
            ].join(" ")}
          >
            {m === "create" ? "새로 만들기" : "초대 코드로 합류"}
          </button>
        ))}
      </div>

      {error && (
        <p className="prose-ko mb-3 rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-2.5 text-sm text-rose-200">
          {error}
        </p>
      )}

      {mode === "create" ? (
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="가족 이름 (예: 우리집, OO네)"
          className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-accent/40 focus:outline-none"
        />
      ) : (
        <div className="space-y-1.5">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="배우자에게 받은 초대 코드 붙여넣기"
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-accent/40 focus:outline-none"
          />
          <p className="text-[11px] text-zinc-600">
            초대 코드는 먼저 가족을 만든 사람의 설정에서 확인할 수 있어요.
          </p>
        </div>
      )}

      <button
        onClick={submit}
        disabled={loading || (mode === "create" ? false : !code.trim())}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-ink-900 transition-all duration-300 ease-out-back hover:scale-102 hover:bg-accent-soft disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : mode === "create" ? (
          <Users className="h-4 w-4" />
        ) : (
          <ArrowRight className="h-4 w-4" />
        )}
        {mode === "create" ? "가족 만들기" : "합류하기"}
      </button>
    </GlassCard>
  );
}
