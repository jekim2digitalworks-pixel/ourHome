import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * POST /api/profile/avatar  (multipart/form-data: file)
 * 프로필 이미지를 Storage(avatars 버킷)에 올리고 공개 URL을 users.avatar_url에 저장.
 * admin 클라이언트로 업로드해 Storage RLS 설정 없이 안전하게 처리.
 */
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Missing file" }, { status: 400 });

  const ext = (file.type.split("/")[1] || "png").replace("jpeg", "jpg");
  const path = `${user.id}/${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const admin = createAdminClient();
  const { error: upErr } = await admin.storage.from("avatars").upload(path, buffer, {
    contentType: file.type || "image/png",
    upsert: true,
  });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const { data: pub } = admin.storage.from("avatars").getPublicUrl(path);
  const url = pub.publicUrl;

  await admin.from("users").update({ avatar_url: url }).eq("id", user.id);
  return NextResponse.json({ url });
}
