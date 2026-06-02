"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ListChecks, ShoppingCart, Plus, Trash2, Loader2, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { GlassCard } from "@/components/ui/GlassCard";

type Kind = "todo" | "shopping";

interface Todo {
  id: string;
  kind: Kind;
  title: string;
  done: boolean;
  done_by: string | null;
  author_id: string;
  created_at: string;
}

const KINDS: { key: Kind; label: string; icon: typeof ListChecks }[] = [
  { key: "todo", label: "할 일", icon: ListChecks },
  { key: "shopping", label: "장보기", icon: ShoppingCart },
];

export function TodoBoard({
  familyId,
  currentUserId,
  members,
}: {
  familyId: string;
  currentUserId: string;
  members: Record<string, { name: string; avatar: string | null }>;
}) {
  const [items, setItems] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState(false);
  const [kind, setKind] = useState<Kind>("todo");
  const [title, setTitle] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("todos")
      .select("id, kind, title, done, done_by, author_id, created_at")
      .eq("family_id", familyId)
      .order("done", { ascending: true })
      .order("created_at", { ascending: false });
    setItems((data as Todo[]) ?? []);
    setLoading(false);
  }, [familyId]);

  useEffect(() => {
    load();
  }, [load]);

  // 실시간: 추가/체크/삭제를 배우자 화면에 즉시 반영.
  useEffect(() => {
    const supabase = createClient();
    const ch = supabase
      .channel(`todos:${familyId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "todos", filter: `family_id=eq.${familyId}` },
        () => load()
      )
      .subscribe((s) => setLive(s === "SUBSCRIBED"));
    return () => {
      supabase.removeChannel(ch);
    };
  }, [familyId, load]);

  const list = useMemo(() => items.filter((t) => t.kind === kind), [items, kind]);
  const remaining = useMemo(
    () => items.filter((t) => t.kind === kind && !t.done).length,
    [items, kind]
  );

  async function add() {
    const trimmed = title.trim();
    if (!trimmed) return;
    setBusy(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("todos")
      .insert({ family_id: familyId, author_id: currentUserId, kind, title: trimmed })
      .select("id, kind, title, done, done_by, author_id, created_at")
      .single();
    if (data) setItems((prev) => (prev.some((t) => t.id === data.id) ? prev : [data as Todo, ...prev]));
    setTitle("");
    setBusy(false);
  }

  async function toggle(t: Todo) {
    const next = !t.done;
    // 낙관적 업데이트
    setItems((prev) =>
      prev.map((x) => (x.id === t.id ? { ...x, done: next, done_by: next ? currentUserId : null } : x))
    );
    const supabase = createClient();
    await supabase
      .from("todos")
      .update({ done: next, done_by: next ? currentUserId : null, done_at: next ? new Date().toISOString() : null })
      .eq("id", t.id);
  }

  async function remove(id: string) {
    setItems((prev) => prev.filter((x) => x.id !== id));
    const supabase = createClient();
    await supabase.from("todos").delete().eq("id", id);
  }

  return (
    <GlassCard className="flex flex-col">
      {/* 종류 탭 + 실시간 상태 */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex rounded-xl border border-white/10 bg-white/[0.04] p-0.5">
          {KINDS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setKind(key)}
              className={[
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-all duration-300 ease-out-back",
                kind === key ? "bg-white/10 text-zinc-100 shadow-bezel" : "text-zinc-500 hover:text-zinc-300",
              ].join(" ")}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
        <span className="flex items-center gap-1.5 text-[11px] text-zinc-400">
          <span className={`h-1.5 w-1.5 rounded-full ${live ? "animate-pulse bg-emerald-400" : "bg-zinc-600"}`} />
          {live ? "실시간" : "연결 중"}
        </span>
      </div>

      {/* 입력 */}
      <div className="mb-4 flex items-center gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder={kind === "todo" ? "할 일 추가 (예: 분리수거)" : "살 것 추가 (예: 기저귀)"}
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-accent/40 focus:outline-none"
        />
        <button
          onClick={add}
          disabled={busy || !title.trim()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-ink-900 transition-all duration-300 ease-out-back hover:scale-102 hover:bg-accent-soft disabled:opacity-40"
          aria-label="추가"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" strokeWidth={2.5} />}
        </button>
      </div>

      <p className="mb-2 text-xs text-zinc-500">
        남은 항목 <span className="text-zinc-300">{remaining}</span>개
      </p>

      {/* 목록 */}
      {loading ? (
        <div className="flex items-center justify-center py-10 text-sm text-zinc-600">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 불러오는 중…
        </div>
      ) : list.length === 0 ? (
        <div className="py-10 text-center text-sm text-zinc-500">
          {kind === "todo" ? "할 일이 없습니다. 위에서 추가해보세요." : "장보기 목록이 비어 있습니다."}
        </div>
      ) : (
        <ul className="space-y-1.5">
          {list.map((t) => {
            const doneBy = t.done && t.done_by ? members[t.done_by] : null;
            return (
              <li
                key={t.id}
                className="group flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5 transition-colors hover:bg-white/[0.05]"
              >
                <button
                  onClick={() => toggle(t)}
                  className={[
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all duration-300 ease-out-back",
                    t.done ? "border-accent bg-accent text-ink-900" : "border-white/20 text-transparent hover:border-accent/60",
                  ].join(" ")}
                  aria-label={t.done ? "완료 해제" : "완료"}
                  aria-pressed={t.done}
                >
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </button>
                <span
                  className={[
                    "min-w-0 flex-1 truncate text-sm",
                    t.done ? "text-zinc-500 line-through" : "text-zinc-100",
                  ].join(" ")}
                >
                  {t.title}
                </span>
                {doneBy && (
                  <span className="shrink-0 text-[11px] text-zinc-500">{doneBy.name} 완료</span>
                )}
                <button
                  onClick={() => remove(t.id)}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-zinc-600 opacity-0 transition hover:bg-rose-400/10 hover:text-rose-300 group-hover:opacity-100"
                  aria-label="삭제"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </GlassCard>
  );
}
