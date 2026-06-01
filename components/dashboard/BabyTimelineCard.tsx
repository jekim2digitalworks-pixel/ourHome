"use client";

import { useEffect, useMemo, useState } from "react";
import { Baby, Milk, Moon, Droplets, Bath, StickyNote } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { GlassCard, CardHeader } from "@/components/ui/GlassCard";

type BabyCategory = "feeding" | "diaper" | "sleep" | "bath" | "memo";

interface BabyRecord {
  id: string;
  category: BabyCategory;
  note: string | null;
  recorded_at: string;
}

const CATEGORY_META: Record<BabyCategory, { label: string; icon: typeof Baby; tint: string }> = {
  feeding: { label: "수유", icon: Milk, tint: "text-accent-soft" },
  diaper: { label: "배변", icon: Droplets, tint: "text-accent-cool" },
  sleep: { label: "수면", icon: Moon, tint: "text-indigo-300" },
  bath: { label: "목욕", icon: Bath, tint: "text-sky-300" },
  memo: { label: "메모", icon: StickyNote, tint: "text-zinc-300" },
};

// Renders even before Supabase is wired up.
const SAMPLE: BabyRecord[] = [
  { id: "s1", category: "feeding", note: "분유 120ml", recorded_at: new Date(Date.now() - 25 * 60000).toISOString() },
  { id: "s2", category: "sleep", note: "낮잠 시작", recorded_at: new Date(Date.now() - 95 * 60000).toISOString() },
  { id: "s3", category: "diaper", note: "기저귀 교체", recorded_at: new Date(Date.now() - 160 * 60000).toISOString() },
];

function timeAgo(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "방금";
  if (mins < 60) return `${mins}분 전`;
  return `${Math.round(mins / 60)}시간 전`;
}

export function BabyTimelineCard({ familyId }: { familyId?: string }) {
  const [records, setRecords] = useState<BabyRecord[]>(SAMPLE);
  const [live, setLive] = useState(false);

  useEffect(() => {
    if (!familyId) return;
    const supabase = createClient();
    let mounted = true;

    (async () => {
      const { data } = await supabase
        .from("baby_records")
        .select("id, category, note, recorded_at")
        .eq("family_id", familyId)
        .order("recorded_at", { ascending: false })
        .limit(20);
      if (mounted && data) setRecords(data as BabyRecord[]);
    })();

    // Realtime: both partners' screens update instantly, no manual refresh.
    const channel = supabase
      .channel(`baby:${familyId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "baby_records", filter: `family_id=eq.${familyId}` },
        (payload) => setRecords((prev) => [payload.new as BabyRecord, ...prev].slice(0, 20))
      )
      .subscribe((status) => setLive(status === "SUBSCRIBED"));

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [familyId]);

  const todayCount = useMemo(
    () => records.filter((r) => r.recorded_at.slice(0, 10) === new Date().toISOString().slice(0, 10)).length,
    [records]
  );

  return (
    <GlassCard className="flex h-full flex-col">
      <CardHeader
        icon={<Baby className="h-4.5 w-4.5" />}
        title="육아 타임라인"
        hint={`오늘 ${todayCount}건 기록`}
        action={
          <span className="flex items-center gap-1.5 text-[11px] text-zinc-400">
            <span
              className={[
                "h-1.5 w-1.5 rounded-full",
                live ? "animate-pulse bg-emerald-400" : "bg-zinc-600",
              ].join(" ")}
            />
            {live ? "실시간" : "샘플"}
          </span>
        }
      />

      <ol className="relative ml-2 flex-1 space-y-4 border-l border-white/10 pl-5">
        {records.map((r) => {
          const meta = CATEGORY_META[r.category];
          const Icon = meta.icon;
          return (
            <li key={r.id} className="relative animate-fade-up">
              <span className="absolute -left-[27px] flex h-5 w-5 items-center justify-center rounded-full border border-white/10 bg-ink-700">
                <Icon className={`h-3 w-3 ${meta.tint}`} />
              </span>
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm text-zinc-200">
                  <span className="font-medium">{meta.label}</span>
                  {r.note && <span className="text-zinc-400"> · {r.note}</span>}
                </p>
                {/* 상대시간은 서버/클라 렌더 시각이 달라 hydration 경고가 나므로 억제 */}
                <time suppressHydrationWarning className="shrink-0 text-[11px] text-zinc-500">
                  {timeAgo(r.recorded_at)}
                </time>
              </div>
            </li>
          );
        })}
      </ol>
    </GlassCard>
  );
}
