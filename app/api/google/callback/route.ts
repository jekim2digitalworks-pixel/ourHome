import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exchangeCodeAndStore } from "@/lib/google/oauth";

/**
 * GET /api/google/callback
 * Google redirects here with `code` + `state` (the user id we sent). We verify
 * the session still matches that id, then exchange + persist the refresh token.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const origin = url.origin;

  if (!code || !state) {
    return NextResponse.redirect(`${origin}/dashboard?google=error`);
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // CSRF guard: the logged-in user must equal the id we stashed in `state`.
  if (!user || user.id !== state) {
    return NextResponse.redirect(`${origin}/dashboard?google=mismatch`);
  }

  try {
    await exchangeCodeAndStore(code, user.id);
    return NextResponse.redirect(`${origin}/dashboard?google=connected`);
  } catch (e) {
    console.error("Google token exchange failed:", e);
    return NextResponse.redirect(`${origin}/dashboard?google=error`);
  }
}
