"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Pencil, Loader2, Check, X, History, NotebookPen } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Memo {
  id: string;
  author_id: string;
  content: string;
  created_at: string;
}

function fmt(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

export function FamilyMemo({
  familyId,
  currentUserId,
  members,
}: {
  familyId: string;
  currentUserId: string;
  members: Record<string, { name: string; avatar: string | null }>;
}) {
  const [history, setHistory] = useState<Memo[]>([]);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const current = history[0] ?? null;

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("memos")
      .select("id, author_id, content, created_at")
      .eq("family_id", familyId)
      .order("created_at", { ascending: false })
      .limit(5);
    setHistory((data as Memo[]) ?? []);
  }, [familyId]);

  useEffect(() => {
    load();
  }, [load]);

  // 실시간: 배우자가 메모를 고치면 즉시 반영.
  useEffect(() => {
    const supabase = createClient();
    const ch = supabase
      .channel(`memos:${familyId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "memos", filter: `family_id=eq.${familyId}` },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [familyId, load]);

  function startEdit() {
    setDraft(current?.content ?? "");
    setEditing(true);
  }

  async function save() {
    const content = draft.trim();
    if (!content) return;
    setSaving(true);
    const supabase = createClient();
    await supabase.from("memos").insert({ family_id: familyId, author_id: currentUserId, content });
    setSaving(false);
    setEditing(false);
    load();
  }

  const editorName = (id: string) => (id === currentUserId ? "나" : members[id]?.name ?? "알 수 없음");

  if (editing) {
    return (
      <div className="min-w-0 flex-1">
        <textarea
          autoFocus
          rows={2}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) save();
            if (e.key === "Escape") setEditing(false);
          }}
          placeholder="가족에게 남길 메모를 적어보세요"
          className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-accent/40 focus:outline-none"
        />
        <div className="mt-1.5 flex items-center gap-1.5">
          <button
            onClick={save}
            disabled={saving || !draft.trim()}
            className="flex items-center gap-1 rounded-lg bg-accent px-2.5 py-1 text-xs font-medium text-ink-900 transition-all duration-300 ease-out-back hover:bg-accent-soft disabled:opacity-40"
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
            저장
          </button>
          <button
            onClick={() => setEditing(false)}
            className="rounded-lg px-2 py-1 text-xs text-zinc-500 transition-colors hover:text-zinc-300"
          >
            취소
          </button>
          <span className="ml-1 text-[10px] text-zinc-600">⌘/Ctrl + Enter 저장</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2">
        <button
          onClick={() => current && setHistoryOpen(true)}
          className="group flex min-w-0 items-center gap-1.5 text-left"
          title={current ? "수정 내역 보기" : undefined}
        >
          <h1 className="truncate text-lg font-semibold tracking-tight text-zinc-100">
            {current ? current.content : "가족 메모를 남겨보세요 ✏️"}
          </h1>
          {current && (
            <History className="h-3.5 w-3.5 shrink-0 text-zinc-600 transition-colors group-hover:text-zinc-400" />
          )}
        </button>
        <button
          onClick={startEdit}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-200"
          aria-label="메모 수정"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>
      <p className="truncate text-xs text-zinc-500">
        {current ? `${editorName(current.author_id)} · ${fmt(current.created_at)} 수정` : "우리 둘의 하루"}
      </p>

      {historyOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            onClick={() => setHistoryOpen(false)}
          >
            <div
              className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-ink-800 p-6 shadow-bezel-lg ring-1 ring-black/40"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setHistoryOpen(false)}
                className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 hover:bg-white/10 hover:text-zinc-200"
                aria-label="닫기"
              >
                <X className="h-4 w-4" />
              </button>
              <h2 className="mb-4 flex items-center gap-2 text-base font-semibold tracking-tight text-zinc-100">
                <NotebookPen className="h-4 w-4 text-accent" /> 메모 수정 내역
              </h2>
              <ul className="space-y-2.5">
                {history.map((m, i) => (
                  <li
                    key={m.id}
                    className={[
                      "rounded-xl border px-3 py-2.5",
                      i === 0
                        ? "border-accent/20 bg-accent/[0.06]"
                        : "border-white/5 bg-white/[0.03]",
                    ].join(" ")}
                  >
                    <p className="whitespace-pre-wrap break-words text-sm text-zinc-100">{m.content}</p>
                    <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-zinc-500">
                      <span className="h-4 w-4 overflow-hidden rounded-full border border-white/10 bg-accent/15">
                        {members[m.author_id]?.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={members[m.author_id].avatar!}
                            alt=""
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-[8px] font-semibold text-accent">
                            {editorName(m.author_id).charAt(0).toUpperCase()}
                          </span>
                        )}
                      </span>
                      {editorName(m.author_id)} · {fmt(m.created_at)}
                      {i === 0 && <span className="text-accent">· 현재</span>}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
