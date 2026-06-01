"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Images,
  Upload,
  Plus,
  Pencil,
  Trash2,
  X,
  FolderOpen,
  Loader2,
  Check,
  Link2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { GlassCard } from "@/components/ui/GlassCard";

interface PhotoCategory {
  id: string;
  name: string;
  sort_order: number;
}
interface Photo {
  id: string;
  drive_file_id: string;
  web_view_link: string;
  caption: string | null;
  taken_on: string;
  category_id: string | null;
  author_id: string;
}

type Filter = "all" | "uncat" | string; // string = category id

function thumb(id: string, size = 600) {
  return `https://drive.google.com/thumbnail?id=${id}&sz=w${size}`;
}

export function PhotoBoard({
  familyId,
  members,
}: {
  familyId: string;
  members: Record<string, { name: string; avatar: string | null }>;
}) {
  const [cats, setCats] = useState<PhotoCategory[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [needConnect, setNeedConnect] = useState(false);

  const [newCat, setNewCat] = useState("");
  const [editingCat, setEditingCat] = useState<{ id: string; name: string } | null>(null);
  const [lightbox, setLightbox] = useState<Photo | null>(null);

  // 드래그 앤 드롭 / 우클릭 메뉴
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null); // "uncat" | 카테고리 id
  const [ctx, setCtx] = useState<{ photo: Photo; x: number; y: number } | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  const loadCats = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("photo_categories")
      .select("id, name, sort_order")
      .eq("family_id", familyId)
      .order("sort_order", { ascending: true });
    setCats((data as PhotoCategory[]) ?? []);
  }, [familyId]);

  const loadPhotos = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    let q = supabase
      .from("photos")
      .select("id, drive_file_id, web_view_link, caption, taken_on, category_id, author_id")
      .eq("family_id", familyId)
      .order("taken_on", { ascending: false })
      .order("created_at", { ascending: false });
    if (filter === "uncat") q = q.is("category_id", null);
    else if (filter !== "all") q = q.eq("category_id", filter);
    const { data } = await q;
    setPhotos((data as Photo[]) ?? []);
    setLoading(false);
  }, [familyId, filter]);

  useEffect(() => {
    loadCats();
  }, [loadCats]);
  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  // 실시간: 사진/카테고리 변경 동기화
  useEffect(() => {
    const supabase = createClient();
    const ch = supabase
      .channel(`photos:${familyId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "photos", filter: `family_id=eq.${familyId}` }, () => loadPhotos())
      .on("postgres_changes", { event: "*", schema: "public", table: "photo_categories", filter: `family_id=eq.${familyId}` }, () => loadCats())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [familyId, loadPhotos, loadCats]);

  // ── 카테고리 CRUD ──
  async function addCategory() {
    const name = newCat.trim();
    if (!name) return;
    const supabase = createClient();
    await supabase.from("photo_categories").insert({ family_id: familyId, name, sort_order: cats.length });
    setNewCat("");
    loadCats();
  }
  async function renameCategory() {
    if (!editingCat || !editingCat.name.trim()) return;
    // 라우트를 통해 DB 이름 변경 + 본인 Drive 폴더 이름도 동기화(best-effort)
    await fetch("/api/photos/category", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editingCat.id, name: editingCat.name.trim() }),
    });
    setEditingCat(null);
    loadCats();
  }
  async function deleteCategory(id: string) {
    if (!confirm("이 카테고리를 삭제할까요? 사진은 '미분류'로 이동합니다.")) return;
    const supabase = createClient();
    await supabase.from("photo_categories").delete().eq("id", id);
    if (filter === id) setFilter("all");
    loadCats();
    loadPhotos();
  }

  // ── 업로드 ──
  async function onFiles(files: FileList) {
    const list = Array.from(files);
    setUploading(true);
    setNeedConnect(false);
    setProgress({ done: 0, total: list.length });
    const categoryId = filter !== "all" && filter !== "uncat" ? filter : "";
    for (let i = 0; i < list.length; i++) {
      const fd = new FormData();
      fd.append("file", list[i]);
      if (categoryId) fd.append("categoryId", categoryId);
      const res = await fetch("/api/google/drive/upload", { method: "POST", body: fd });
      if (res.status === 409) {
        setNeedConnect(true);
        break;
      }
      setProgress({ done: i + 1, total: list.length });
    }
    setUploading(false);
    setProgress(null);
    loadPhotos();
  }

  async function deletePhoto(p: Photo) {
    if (!confirm("이 사진을 앨범에서 삭제할까요?")) return;
    const supabase = createClient();
    await supabase.from("photos").delete().eq("id", p.id);
    setLightbox(null);
    setPhotos((prev) => prev.filter((x) => x.id !== p.id));
  }

  async function movePhoto(p: Photo, categoryId: string | null) {
    const supabase = createClient();
    await supabase.from("photos").update({ category_id: categoryId }).eq("id", p.id);
    setLightbox((lb) => (lb && lb.id === p.id ? { ...lb, category_id: categoryId } : lb));
    loadPhotos();
  }

  // 드롭 대상(미분류 or 카테고리 id)으로 드래그 중인 사진을 이동.
  function dropTo(categoryId: string | null) {
    const p = photos.find((x) => x.id === dragId);
    if (p && p.category_id !== categoryId) movePhoto(p, categoryId);
    setDragId(null);
    setDragOver(null);
  }

  async function connectGoogle() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        scopes:
          "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/drive.file",
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
  }

  return (
    <GlassCard className="flex flex-col gap-5 lg:flex-row">
      {/* ── 카테고리 사이드바 ── */}
      <aside className="w-full shrink-0 lg:w-52">
        <div className="mb-3 flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-semibold text-zinc-100">카테고리</h3>
        </div>

        <ul className="space-y-1">
          <FilterRow label="전체" active={filter === "all"} onClick={() => setFilter("all")} />
          <FilterRow
            label="미분류"
            active={filter === "uncat"}
            onClick={() => setFilter("uncat")}
            isOver={dragOver === "uncat"}
            onDragOver={
              dragId
                ? (e) => {
                    e.preventDefault();
                    setDragOver("uncat");
                  }
                : undefined
            }
            onDragLeave={() => setDragOver((d) => (d === "uncat" ? null : d))}
            onDrop={(e) => {
              e.preventDefault();
              dropTo(null);
            }}
          />

          {cats.map((c) => (
            <li key={c.id}>
              {editingCat?.id === c.id ? (
                <div className="flex items-center gap-1">
                  <input
                    autoFocus
                    value={editingCat.name}
                    onChange={(e) => setEditingCat({ id: c.id, name: e.target.value })}
                    onKeyDown={(e) => e.key === "Enter" && renameCategory()}
                    className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 text-sm text-zinc-100 focus:border-accent/40 focus:outline-none"
                  />
                  <button onClick={renameCategory} className="flex h-7 w-7 items-center justify-center rounded-lg text-emerald-300 hover:bg-white/10">
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => setEditingCat(null)} className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 hover:bg-white/10">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div
                  onDragOver={(e) => {
                    if (dragId) {
                      e.preventDefault();
                      setDragOver(c.id);
                    }
                  }}
                  onDragLeave={() => setDragOver((d) => (d === c.id ? null : d))}
                  onDrop={(e) => {
                    e.preventDefault();
                    dropTo(c.id);
                  }}
                  className={[
                    "group flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm transition-colors",
                    dragOver === c.id
                      ? "bg-accent/20 text-accent ring-1 ring-accent/40"
                      : filter === c.id
                      ? "bg-white/10 text-zinc-100"
                      : "text-zinc-400 hover:bg-white/[0.05]",
                  ].join(" ")}
                >
                  <button onClick={() => setFilter(c.id)} className="min-w-0 flex-1 truncate text-left">
                    {c.name}
                  </button>
                  <button
                    onClick={() => setEditingCat({ id: c.id, name: c.name })}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-zinc-600 opacity-0 hover:text-zinc-200 group-hover:opacity-100"
                    aria-label="이름 변경"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => deleteCategory(c.id)}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-zinc-600 opacity-0 hover:text-rose-300 group-hover:opacity-100"
                    aria-label="삭제"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>

        {/* 카테고리 추가 */}
        <div className="mt-2 flex items-center gap-1">
          <input
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCategory()}
            placeholder="새 카테고리"
            className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-accent/40 focus:outline-none"
          />
          <button
            onClick={addCategory}
            disabled={!newCat.trim()}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/90 text-ink-900 transition-all duration-300 ease-out-back hover:scale-102 hover:bg-accent disabled:opacity-40"
            aria-label="카테고리 추가"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>
      </aside>

      {/* ── 사진 그리드 ── */}
      <div className="min-w-0 flex-1 border-t border-white/5 pt-5 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Images className="h-4.5 w-4.5 text-accent" />
            <h2 className="text-base font-semibold tracking-tight text-zinc-100">
              {filter === "all" ? "전체 사진" : filter === "uncat" ? "미분류" : cats.find((c) => c.id === filter)?.name ?? "사진"}
            </h2>
            <span className="text-[11px] text-zinc-500">{photos.length}장</span>
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 rounded-xl bg-accent/90 px-3 py-2 text-sm font-medium text-ink-900 transition-all duration-300 ease-out-back hover:scale-102 hover:bg-accent disabled:opacity-50"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading && progress ? `${progress.done}/${progress.total}` : "업로드"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && e.target.files.length > 0 && onFiles(e.target.files)}
          />
        </div>

        {needConnect && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
            <span className="prose-ko">사진을 올리려면 Google Drive 연동이 필요해요.</span>
            <button
              onClick={connectGoogle}
              className="flex shrink-0 items-center gap-1 rounded-lg bg-amber-300/90 px-3 py-1.5 text-xs font-medium text-ink-900 hover:bg-amber-200"
            >
              <Link2 className="h-3 w-3" /> 연동하기
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-zinc-600">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 불러오는 중…
          </div>
        ) : photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/5 bg-white/[0.02] py-16 text-center">
            <Images className="h-8 w-8 text-zinc-600" />
            <p className="prose-ko text-sm text-zinc-400">
              아직 사진이 없어요. 우측 상단 "업로드"로 추억을 담아보세요.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {photos.map((p) => (
              <button
                key={p.id}
                onClick={() => setLightbox(p)}
                draggable
                onDragStart={(e) => {
                  setDragId(p.id);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragEnd={() => {
                  setDragId(null);
                  setDragOver(null);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setCtx({ photo: p, x: e.clientX, y: e.clientY });
                }}
                className={[
                  "group relative aspect-square overflow-hidden rounded-xl border bg-white/[0.03] transition-all duration-300 ease-out-back hover:scale-[1.02] hover:shadow-bezel-lg",
                  dragId === p.id ? "border-accent/60 opacity-50" : "border-white/10",
                ].join(" ")}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={thumb(p.drive_file_id, 600)}
                  alt={p.caption ?? ""}
                  loading="lazy"
                  draggable={false}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-ink-900/80 to-transparent px-2 py-1.5 text-left opacity-0 transition-opacity group-hover:opacity-100">
                  <span className="truncate text-[11px] text-zinc-100">{p.caption || p.taken_on.slice(5).replace("-", "/")}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── 라이트박스 (포털: 카드의 backdrop-filter 영향 밖으로) ── */}
      {lightbox &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
            onClick={() => setLightbox(null)}
          >
          {/* 닫기 버튼 — 화면 우상단 고정, 배경 위에서 항상 또렷하게 */}
          <button
            onClick={() => setLightbox(null)}
            className="fixed right-4 top-4 z-[60] flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white shadow-bezel-lg backdrop-blur transition-all duration-300 ease-out-back hover:scale-105 hover:bg-black/80"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
          <div
            className="relative max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-ink-800 shadow-bezel-lg"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumb(lightbox.drive_file_id, 1600)}
              alt={lightbox.caption ?? ""}
              referrerPolicy="no-referrer"
              className="max-h-[70vh] w-full bg-black object-contain"
            />
            <div className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="truncate text-sm text-zinc-100">{lightbox.caption || "사진"}</p>
                <p className="text-[11px] text-zinc-500">
                  {lightbox.taken_on} · {members[lightbox.author_id]?.name ?? "?"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={lightbox.category_id ?? ""}
                  onChange={(e) => movePhoto(lightbox, e.target.value || null)}
                  className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 text-xs text-zinc-200 focus:outline-none [color-scheme:dark]"
                >
                  <option value="">미분류</option>
                  {cats.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <a
                  href={lightbox.web_view_link}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/[0.08]"
                >
                  원본
                </a>
                <button
                  onClick={() => deletePhoto(lightbox)}
                  className="flex items-center gap-1 rounded-lg border border-rose-400/20 bg-rose-400/10 px-3 py-1.5 text-xs text-rose-200 hover:bg-rose-400/20"
                >
                  <Trash2 className="h-3.5 w-3.5" /> 삭제
                </button>
              </div>
            </div>
          </div>
        </div>,
          document.body
        )}

      {/* ── 우클릭 컨텍스트 메뉴 (포털) ── */}
      {ctx &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            <button
              className="fixed inset-0 z-50 cursor-default"
              onClick={() => setCtx(null)}
              onContextMenu={(e) => {
                e.preventDefault();
                setCtx(null);
              }}
              aria-label="닫기"
              tabIndex={-1}
            />
          <div
            className="fixed z-[55] w-44 rounded-xl border border-white/10 bg-ink-800 p-1 shadow-bezel-lg ring-1 ring-black/40"
            style={{
              left: Math.min(ctx.x, (typeof window !== "undefined" ? window.innerWidth : 9999) - 188),
              top: Math.min(ctx.y, (typeof window !== "undefined" ? window.innerHeight : 9999) - 320),
            }}
          >
            <p className="px-2 py-1 text-[11px] text-zinc-500">카테고리로 이동</p>
            <button
              onClick={() => {
                movePhoto(ctx.photo, null);
                setCtx(null);
              }}
              className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-sm text-zinc-300 hover:bg-white/10"
            >
              미분류
              {ctx.photo.category_id === null && <Check className="h-3.5 w-3.5 text-accent" />}
            </button>
            {cats.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  movePhoto(ctx.photo, c.id);
                  setCtx(null);
                }}
                className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-sm text-zinc-300 hover:bg-white/10"
              >
                <span className="truncate">{c.name}</span>
                {ctx.photo.category_id === c.id && <Check className="h-3.5 w-3.5 text-accent" />}
              </button>
            ))}
            <div className="my-1 h-px bg-white/10" />
            <button
              onClick={() => {
                deletePhoto(ctx.photo);
                setCtx(null);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-rose-300 hover:bg-rose-400/10"
            >
              <Trash2 className="h-3.5 w-3.5" /> 삭제
            </button>
          </div>
          </>,
          document.body
        )}
    </GlassCard>
  );
}

function FilterRow({
  label,
  active,
  onClick,
  isOver,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  isOver?: boolean;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: () => void;
  onDrop?: (e: React.DragEvent) => void;
}) {
  return (
    <li>
      <button
        onClick={onClick}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={[
          "w-full rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors",
          isOver
            ? "bg-accent/20 text-accent ring-1 ring-accent/40"
            : active
            ? "bg-accent/15 text-accent"
            : "text-zinc-400 hover:bg-white/[0.05]",
        ].join(" ")}
      >
        {label}
      </button>
    </li>
  );
}
