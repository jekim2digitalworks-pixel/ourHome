"use client";

import { useCallback, useEffect, useState } from "react";
import { ListChecks, Check, CalendarDays } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { GlassCard, CardHeader } from "@/components/ui/GlassCard";

interface Todo {
  id: string;
  category: string;
  due_date: string | null;
  title: string;
  done: boolean;
}

const EMOJI: Record<string, string> = {
  장보기: "🛒",
  육아: "🍼",
  행사: "🎉",
  이벤트: "🎈",
  집안일: "🧹",
  기타: "📌",
};
const emojiFor = (cat: string) => EMOJI[cat] ?? "✏️";

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function TodoSummaryCard({ familyId }: { familyId?: string }) {
  const [items, setItems] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!familyId) {
      setLoading(false);
      return;
    }
    const supabase = createClient();
    const { data } = await supabase
      .from("todos")
      .select("id, category, due_date, title, done")
      .eq("family_id", familyId)
      .eq("done", false)
      .order("created_at", { ascending: false })
      .limit(20);
    setItems((data as Todo[]) ?? []);
    setLoading(false);
  }, [familyId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!familyId) return;
    const supabase = createClient();
    const ch = supabase
      .channel(`todos-card:${familyId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "todos", filter: `family_id=eq.${familyId}` },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [familyId, load]);

  const today = todayKey();
  const remaining = items.length;
  const todayCount = items.filter((t) => t.due_date === today).length;
  const preview = items.slice(0, 4);

  return (
    <GlassCard className="flex h-full flex-col">
      <CardHeader icon={<ListChecks className="h-4.5 w-4.5" />} title="가사 일 같이하기" hint="함께 나누는 우리 집 할 일" />

      {!familyId ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-zinc-500">
          <ListChecks className="h-7 w-7 text-zinc-600" />
          <p className="text-sm">가족을 만들면 공유 리스트가 활성화됩니다.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="rounded-xl border border-white/5 bg-white/[0.03] px-2 py-2.5">
              <div className="mb-1 flex items-center justify-center gap-1 text-[11px] text-zinc-500">
                <ListChecks className="h-3 w-3 text-accent" /> 남은 일
              </div>
              <p className="text-sm font-semibold tracking-tight text-zinc-100">{remaining}건</p>
            </div>
            <div className="rounded-xl border border-white/5 bg-white/[0.03] px-2 py-2.5">
              <div className="mb-1 flex items-center justify-center gap-1 text-[11px] text-zinc-500">
                <CalendarDays className="h-3 w-3 text-accent-cool" /> 오늘 마감
              </div>
              <p className="text-sm font-semibold tracking-tight text-zinc-100">{todayCount}건</p>
            </div>
          </div>

          <div className="mt-4 flex flex-1 flex-col">
            <p className="mb-2 text-[11px] text-zinc-500">남은 항목</p>
            {loading ? (
              <div className="flex flex-1 items-center justify-center text-sm text-zinc-600">불러오는 중…</div>
            ) : preview.length === 0 ? (
              <div className="flex flex-1 items-center justify-center gap-1.5 text-sm text-emerald-300/80">
                <Check className="h-4 w-4" /> 모두 완료했어요!
              </div>
            ) : (
              <ul className="flex-1 space-y-1.5">
                {preview.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-1.5 text-sm"
                  >
                    <span className="shrink-0 text-sm">{emojiFor(t.category)}</span>
                    <span className="truncate text-zinc-300">{t.title}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </GlassCard>
  );
}
