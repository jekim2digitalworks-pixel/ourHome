import { NextRequest, NextResponse } from "next/server";
import { Readable } from "node:stream";
import { google } from "googleapis";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthorizedClient } from "@/lib/google/oauth";
import { ensureRootFolder, ensureCategoryFolder } from "@/lib/google/driveFolders";

export const runtime = "nodejs"; // googleapis needs Node, not the Edge runtime.

/**
 * POST /api/google/drive/upload  (multipart/form-data: file, takenOn?, caption?)
 * Uploads the binary to Google Drive, makes it link-viewable, then stores ONLY
 * the returned web link in Supabase — the image bytes never touch our DB.
 */
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: profile } = await supabase
    .from("users")
    .select("family_id")
    .eq("id", user.id)
    .single();
  if (!profile?.family_id) {
    return NextResponse.json({ error: "No family" }, { status: 400 });
  }

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Missing file" }, { status: 400 });
  const takenOn = (form.get("takenOn") as string) || new Date().toISOString().slice(0, 10);
  const caption = (form.get("caption") as string) || null;
  const categoryId = (form.get("categoryId") as string) || null;

  let auth;
  try {
    auth = await getAuthorizedClient(user.id);
  } catch {
    return NextResponse.json({ error: "Google Drive가 연동되지 않았습니다" }, { status: 409 });
  }
  const drive = google.drive({ version: "v3", auth });

  // Drive 폴더 미러링: 모든 사진을 "Our_Home" 폴더 아래로, 카테고리가 있으면
  // 같은 이름의 하위 폴더로(없으면 생성, 있으면 재사용). 폴더 작업이 실패해도
  // 업로드 자체는 막지 않도록 best-effort 처리.
  let parents: string[] | undefined = process.env.GOOGLE_DRIVE_FOLDER_ID
    ? [process.env.GOOGLE_DRIVE_FOLDER_ID]
    : undefined;
  try {
    const rootId = await ensureRootFolder(drive, user.id);
    parents = [rootId];
    if (categoryId) {
      const admin = createAdminClient();
      const { data: cat } = await admin
        .from("photo_categories")
        .select("name")
        .eq("id", categoryId)
        .single();
      if (cat?.name) parents = [await ensureCategoryFolder(drive, rootId, cat.name)];
    }
  } catch (e) {
    console.error("Drive 폴더 준비 실패(루트 업로드로 진행):", e);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const created = await drive.files.create({
    requestBody: {
      name: file.name || `our-home-${Date.now()}`,
      ...(parents ? { parents } : {}),
    },
    media: { mimeType: file.type || "image/jpeg", body: Readable.from(buffer) },
    fields: "id, webViewLink, thumbnailLink",
  });

  const fileId = created.data.id!;
  // Make it viewable by anyone with the link so partners can render thumbnails.
  await drive.permissions.create({
    fileId,
    requestBody: { role: "reader", type: "anyone" },
  });

  const { data: photo, error } = await supabase
    .from("photos")
    .insert({
      family_id: profile.family_id,
      author_id: user.id,
      drive_file_id: fileId,
      web_view_link: created.data.webViewLink ?? `https://drive.google.com/file/d/${fileId}/view`,
      thumbnail_link: created.data.thumbnailLink ?? null,
      taken_on: takenOn,
      caption,
      category_id: categoryId,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ photo });
}
