import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getConsentUrl } from "@/lib/google/oauth";

/**
 * GET /api/google/connect
 * Kicks off the OAuth2 consent flow. We pass the Supabase user id through the
 * `state` param so the callback can attribute the tokens to the right user.
 */
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  return NextResponse.redirect(getConsentUrl(user.id));
}
