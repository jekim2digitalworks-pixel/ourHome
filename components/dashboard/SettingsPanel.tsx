"use client";

import { useState } from "react";
import { Settings as SettingsIcon, GripVertical, GripHorizontal, ChevronUp, ChevronDown } from "lucide-react";
import { GlassCard, CardHeader } from "@/components/ui/GlassCard";
import type { TabKey } from "@/components/dashboard/Sidebar";

type ModuleKey = Exclude<TabKey, "overview" | "settings">;
const ALL: { key: ModuleKey; label: string }[] = [
  { key: "calendar", label: "캘린더" },
  { key: "assets", label: "자산관리" },
  { key: "baby", label: "육아차트" },
  { key: "todos", label: "할일·장보기" },
  { key: "photos", label: "사진첩" },
];
const labelOf = (k: TabKey) => ALL.find((m) => m.key === k)?.label ?? k;

/**
 * 대시보드 개인화: 토글로 모듈을 켜고 끄며, 켜진 모듈은 드래그앤드롭으로
 * 대시보드 노출 순위를 정한다. 순서(enabled 배열)가 곧 개요 카드 순서.
 */
export function SettingsPanel({
  enabled,
  onToggle,
  onReorder,
}: {
  enabled: TabKey[];
  onToggle: (key: TabKey) => void;
  onReorder: (next: TabKey[]) => void;
}) {
  const [dragKey, setDragKey] = useState<TabKey | null>(null);
  const [overKey, setOverKey] = useState<TabKey | null>(null);

  const enabledKeys = enabled.filter((k): k is ModuleKey => ALL.some((m) => m.key === k));
  const disabledKeys = ALL.map((m) => m.key).filter((k) => !enabledKeys.includes(k));

  function handleDrop(target: TabKey) {
    setOverKey(null);
    if (!dragKey || dragKey === target) {
      setDragKey(null);
      return;
    }
    const next = [...enabledKeys] as TabKey[];
    const from = next.indexOf(dragKey);
    const to = next.indexOf(target);
    if (from === -1 || to === -1) {
      setDragKey(null);
      return;
    }
    next.splice(from, 1);
    next.splice(to, 0, dragKey);
    setDragKey(null);
    onReorder(next);
  }

  // 모바일/터치용 — 위·아래 버튼으로 한 칸씩 이동.
  function move(index: number, dir: -1 | 1) {
    const to = index + dir;
    if (to < 0 || to >= enabledKeys.length) return;
    const next = [...enabledKeys] as TabKey[];
    [next[index], next[to]] = [next[to], next[index]];
    onReorder(next);
  }

  return (
    <GlassCard>
      <CardHeader
        icon={<SettingsIcon className="h-4.5 w-4.5" />}
        title="대시보드 개인화"
        hint="드래그로 노출 순위 · 토글로 표시 여부"
      />

      <div className="mb-3 flex items-center gap-1.5 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2 text-[11px] text-zinc-400">
        <GripHorizontal className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
        드래그앤드롭(모바일은 ▲▼ 버튼)으로 대시보드 노출 순위를 정할 수 있어요. 위에 있을수록 먼저 표시됩니다.
      </div>

      {/* 켜진 모듈 — 드래그로 순서 변경 */}
      <ul className="space-y-2">
        {enabledKeys.map((key, i) => {
          const isDragging = dragKey === key;
          const isOver = overKey === key && dragKey !== key;
          return (
            <li
              key={key}
              draggable
              onDragStart={() => setDragKey(key)}
              onDragEnd={() => {
                setDragKey(null);
                setOverKey(null);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                if (overKey !== key) setOverKey(key);
              }}
              onDrop={() => handleDrop(key)}
              className={[
                "flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all duration-200",
                isDragging
                  ? "border-accent/40 bg-accent/10 opacity-60"
                  : isOver
                  ? "border-accent/50 bg-accent/[0.08]"
                  : "border-white/5 bg-white/[0.03]",
              ].join(" ")}
            >
              <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-zinc-500 active:cursor-grabbing" />
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-accent/15 text-[11px] font-semibold text-accent">
                {i + 1}
              </span>
              <span className="flex-1 text-sm text-zinc-200">{labelOf(key)}</span>

              {/* 위/아래 이동 (모바일·터치 대응) */}
              <div className="flex shrink-0 items-center">
                <button
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-100 disabled:pointer-events-none disabled:opacity-25"
                  aria-label="위로"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  onClick={() => move(i, 1)}
                  disabled={i === enabledKeys.length - 1}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-100 disabled:pointer-events-none disabled:opacity-25"
                  aria-label="아래로"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>

              <button
                onClick={() => onToggle(key)}
                className="relative h-6 w-11 shrink-0 rounded-full bg-accent/80 transition-all duration-300 ease-out-back"
                aria-pressed={true}
                title="대시보드에서 숨기기"
              >
                <span className="absolute left-[22px] top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all duration-300 ease-out-back" />
              </button>
            </li>
          );
        })}
        {enabledKeys.length === 0 && (
          <li className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-3 text-center text-xs text-zinc-500">
            표시할 모듈이 없어요. 아래에서 켜보세요.
          </li>
        )}
      </ul>

      {/* 꺼진 모듈 — 토글로 켜면 순위 맨 아래에 추가 */}
      {disabledKeys.length > 0 && (
        <>
          <p className="mb-2 mt-4 text-[11px] font-medium text-zinc-500">꺼진 모듈</p>
          <ul className="space-y-2">
            {disabledKeys.map((key) => (
              <li
                key={key}
                className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.015] px-3 py-2.5"
              >
                <span className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-sm text-zinc-500">{labelOf(key)}</span>
                <button
                  onClick={() => onToggle(key)}
                  className="relative h-6 w-11 rounded-full bg-white/10 transition-all duration-300 ease-out-back"
                  aria-pressed={false}
                  title="대시보드에 표시하기"
                >
                  <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all duration-300 ease-out-back" />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </GlassCard>
  );
}
