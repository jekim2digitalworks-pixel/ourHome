"use client";

import { Settings as SettingsIcon, GripVertical, Star } from "lucide-react";
import { GlassCard, CardHeader } from "@/components/ui/GlassCard";
import type { TabKey } from "@/components/dashboard/Sidebar";

const ALL: { key: Exclude<TabKey, "overview" | "settings">; label: string }[] = [
  { key: "calendar", label: "캘린더" },
  { key: "assets", label: "자산관리" },
  { key: "baby", label: "육아차트" },
  { key: "photos", label: "사진첩" },
];

/**
 * Personalization: toggle which modules are active and pick the primary one
 * shown first on the dashboard. In production these write to public.settings.
 */
export function SettingsPanel({
  enabled,
  primary,
  onToggle,
  onSetPrimary,
}: {
  enabled: TabKey[];
  primary: TabKey;
  onToggle: (key: TabKey) => void;
  onSetPrimary: (key: TabKey) => void;
}) {
  return (
    <GlassCard className="max-w-xl">
      <CardHeader
        icon={<SettingsIcon className="h-4.5 w-4.5" />}
        title="대시보드 개인화"
        hint="활성 탭과 메인 우선순위를 설정하세요"
      />

      <ul className="space-y-2">
        {ALL.map(({ key, label }) => {
          const on = enabled.includes(key);
          const isPrimary = primary === key;
          return (
            <li
              key={key}
              className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5"
            >
              <GripVertical className="h-4 w-4 cursor-grab text-zinc-600" />
              <span className="flex-1 text-sm text-zinc-200">{label}</span>

              <button
                onClick={() => onSetPrimary(key)}
                disabled={!on}
                className={[
                  "flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] transition-all duration-300 ease-out-back disabled:opacity-30",
                  isPrimary ? "bg-accent/20 text-accent ring-1 ring-accent/30" : "text-zinc-500 hover:bg-white/5",
                ].join(" ")}
              >
                <Star className="h-3 w-3" fill={isPrimary ? "currentColor" : "none"} />
                메인
              </button>

              {/* Toggle switch */}
              <button
                onClick={() => onToggle(key)}
                className={[
                  "relative h-6 w-11 rounded-full transition-all duration-300 ease-out-back",
                  on ? "bg-accent/80" : "bg-white/10",
                ].join(" ")}
                aria-pressed={on}
              >
                <span
                  className={[
                    "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all duration-300 ease-out-back",
                    on ? "left-[22px]" : "left-0.5",
                  ].join(" ")}
                />
              </button>
            </li>
          );
        })}
      </ul>
    </GlassCard>
  );
}
