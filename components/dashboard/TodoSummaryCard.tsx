"use client";

import { useCallback, useEffect, useState } from "react";
import { ListChecks, ShoppingCart, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { GlassCard, CardHeader } from "@/components/ui/GlassCard";

interface Todo {
  id: string;
  kind: "todo" | "shopping";
  title: string;
  done: boolean;
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
      .select("id, kind, title, done")
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

  const todoCount = items.filter((t) => t.kind === "todo").length;
  const shopCount = items.filter((t) => t.kind === "shopping").length;
  const preview = items.slice(0, 4);

  return (
    <GlassCard className="flex h-full flex-col">
      <CardHeader icon={<ListChecks className="h-4.5 w-4.5" />} title="할 일 · 장보기" hint="함께 보는 체크리스트" />

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
                <ListChecks className="h-3 w-3 text-accent" /> 할 일
              </div>
              <p className="text-sm font-semibold tracking-tight text-zinc-100">{todoCount}건 남음</p>
            </div>
            <div className="rounded-xl border border-white/5 bg-white/[0.03] px-2 py-2.5">
              <div className="mb-1 flex items-center justify-center gap-1 text-[11px] text-zinc-500">
                <ShoppingCart className="h-3 w-3 text-accent-cool" /> 장보기
              </div>
              <p className="text-sm font-semibold tracking-tight text-zinc-100">{shopCount}건 남음</p>
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
                    {t.kind === "shopping" ? (
                      <ShoppingCart className="h-3.5 w-3.5 shrink-0 text-accent-cool" />
                    ) : (
                      <ListChecks className="h-3.5 w-3.5 shrink-0 text-accent" />
                    )}
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
