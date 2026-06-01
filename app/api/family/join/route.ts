import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/family/join { code }
 * 초대 코드(= 가족 id)로 기존 가족에 합류합니다.
 */
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { code } = (await req.json()) as { code?: string };
  const trimmed = code?.trim();
  if (!trimmed) return NextResponse.json({ error: "초대 코드를 입력하세요" }, { status: 400 });

  const admin = createAdminClient();
  const { data: fam } = await admin
    .from("families")
    .select("id, name")
    .eq("id", trimmed)
    .single();
  if (!fam) {
    return NextResponse.json({ error: "유효하지 않은 초대 코드예요" }, { status: 404 });
  }

  await admin.from("users").update({ family_id: fam.id }).eq("id", user.id);
  return NextResponse.json({ family: fam });
}
