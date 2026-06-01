import { NextRequest, NextResponse } from "next/server";
import { Readable } from "node:stream";
import { google } from "googleapis";
import { createClient } from "@/lib/supabase/server";
import { getAuthorizedClient } from "@/lib/google/oauth";

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

  const auth = await getAuthorizedClient(user.id);
  const drive = google.drive({ version: "v3", auth });

  const buffer = Buffer.from(await file.arrayBuffer());
  const created = await drive.files.create({
    requestBody: {
      name: file.name || `our-home-${Date.now()}`,
      // Optionally pin to a dedicated app folder via parents: [process.env.GOOGLE_DRIVE_FOLDER_ID]
      ...(process.env.GOOGLE_DRIVE_FOLDER_ID
        ? { parents: [process.env.GOOGLE_DRIVE_FOLDER_ID] }
        : {}),
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
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ photo });
}
