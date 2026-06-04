import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthorizedClient } from "@/lib/google/oauth";
import { ensureRootFolder } from "@/lib/google/driveFolders";

export const runtime = "nodejs";

/**
 * PATCH /api/photos/category { id, name }
 * 카테고리 이름을 바꾸고, 가능하면 본인 Drive의 같은 이름 폴더도 함께 rename.
 * Drive 폴더 동기화는 best-effort(실패해도 이름 변경 자체는 성공).
 */
export async function PATCH(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id, name } = (await req.json()) as { id?: string; name?: string };
  const newName = name?.trim();
  if (!id || !newName) return NextResponse.json({ error: "id와 name이 필요합니다" }, { status: 400 });

  const admin = createAdminClient();
  const { data: me } = await admin.from("users").select("family_id").eq("id", user.id).single();
  const { data: cat } = await admin
    .from("photo_categories")
    .select("id, family_id, name")
    .eq("id", id)
    .single();
  if (!cat || cat.family_id !== me?.family_id) {
    return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
  }

  const oldName = cat.name;
  await admin.from("photo_categories").update({ name: newName }).eq("id", id);

  // best-effort: 본인 Drive의 홈노트/<oldName> 폴더를 newName으로 rename
  if (oldName !== newName) {
    try {
      const auth = await getAuthorizedClient(user.id);
      const drive = google.drive({ version: "v3", auth });
      const rootId = await ensureRootFolder(drive, user.id);
      const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
      const found = await drive.files.list({
        q: `name='${esc(oldName)}' and '${rootId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: "files(id)",
        pageSize: 1,
      });
      const folderId = found.data.files?.[0]?.id;
      if (folderId) await drive.files.update({ fileId: folderId, requestBody: { name: newName } });
    } catch (e) {
      console.error("Drive 폴더 이름 동기화 실패(무시):", e);
    }
  }

  return NextResponse.json({ ok: true });
}
