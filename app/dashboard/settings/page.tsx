"use client";

import { useState } from "react";
import { Copy, Check, Users } from "lucide-react";
import { SettingsPanel } from "@/components/dashboard/SettingsPanel";
import { GlassCard, CardHeader } from "@/components/ui/GlassCard";
import { useDashboard } from "@/components/dashboard/DashboardShell";

export default function SettingsPage() {
  const { familyId, members, enabled, primary, toggle, choosePrimary } = useDashboard();
  return (
    <div className="animate-fade-up space-y-5">
      {familyId && <InviteCodeCard code={familyId} memberCount={Object.keys(members).length} />}
      <SettingsPanel
        enabled={enabled}
        primary={primary}
        onToggle={toggle}
        onSetPrimary={choosePrimary}
      />
    </div>
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
