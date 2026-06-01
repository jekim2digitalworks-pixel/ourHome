import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /auth/callback?code=...&next=/dashboard
 * Supabase의 매직링크/Google OAuth(PKCE)는 1회용 `code`를 붙여 이 라우트로 돌아옵니다.
 * code를 세션으로 교환해 인증 쿠키를 굽고, Google 로그인인 경우엔 함께 발급된
 * provider_refresh_token을 우리 google_tokens 테이블에 저장합니다(서버에서 캘린더·
 * 드라이브 API를 호출할 때 이 refresh token으로 access token을 갱신합니다).
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/dashboard";
  const origin = url.origin;

  if (code) {
    const supabase = createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.session) {
      // Google provider로 로그인한 경우에만 토큰이 실려옵니다.
      const { provider_refresh_token, provider_token, user } = data.session;
      if (provider_refresh_token) {
        const admin = createAdminClient();
        await admin.from("google_tokens").upsert({
          user_id: user.id,
          refresh_token: provider_refresh_token,
          access_token: provider_token ?? null,
          // provider_token은 ~1시간 후 만료 → null로 두면 첫 API 호출 시 자동 갱신.
          expiry_date: null,
        });
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error("Auth code exchange failed:", error?.message);
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
