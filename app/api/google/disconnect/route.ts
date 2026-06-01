import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * POST /api/google/disconnect
 * 토글 OFF: 저장된 google_tokens를 삭제하고, 가능하면 Google에서 토큰을 폐기(revoke)합니다.
 * 다시 켜면 OAuth 동의(prompt=consent)로 새 refresh token을 받습니다.
 */
export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("google_tokens")
    .select("refresh_token")
    .eq("user_id", user.id)
    .single();

  // Google 측 토큰 폐기는 best-effort (실패해도 로컬 삭제는 진행).
  if (row?.refresh_token) {
    try {
      await fetch("https://oauth2.googleapis.com/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token: row.refresh_token }),
      });
    } catch {
      // ignore
    }
  }

  await admin.from("google_tokens").delete().eq("user_id", user.id);
  return NextResponse.json({ connected: false });
}
