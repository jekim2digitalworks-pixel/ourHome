import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/family/create { name }
 * 새 가족 그룹을 만들고 현재 사용자를 그 가족에 소속시킵니다.
 * 새 가족을 만든 직후엔 본인의 family_id가 아직 없어 RLS SELECT가 막히므로
 * admin 클라이언트(RLS 우회)로 처리합니다.
 */
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { name } = (await req.json()) as { name?: string };
  const admin = createAdminClient();

  const { data: me } = await admin.from("users").select("family_id").eq("id", user.id).single();
  if (me?.family_id) {
    return NextResponse.json({ error: "이미 가족에 속해 있습니다" }, { status: 400 });
  }

  const { data: fam, error } = await admin
    .from("families")
    .insert({ name: name?.trim() || "our home", created_by: user.id })
    .select()
    .single();
  if (error || !fam) {
    return NextResponse.json({ error: error?.message ?? "생성 실패" }, { status: 500 });
  }

  await admin.from("users").update({ family_id: fam.id }).eq("id", user.id);
  return NextResponse.json({ family: fam });
}
