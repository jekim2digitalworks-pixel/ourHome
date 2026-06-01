import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Scopes requested from Google. Calendar (read/write events) + Drive file scope
 * (only files this app creates), plus basic profile for the account email.
 */
export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/drive.file",
  "openid",
  "email",
  "profile",
];

/** Bare OAuth2 client configured from env. */
export function getOAuthClient(): OAuth2Client {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    process.env.GOOGLE_REDIRECT_URI!
  );
}

/**
 * Consent URL. `access_type=offline` + `prompt=consent` is what guarantees a
 * refresh_token is issued (Google only returns it on the first consent unless
 * you force the prompt).
 */
export function getConsentUrl(state: string): string {
  return getOAuthClient().generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GOOGLE_SCOPES,
    state,
    include_granted_scopes: true,
  });
}

/**
 * Exchange the one-time code for tokens and persist the refresh_token.
 * Returns the email of the connected Google account.
 */
export async function exchangeCodeAndStore(code: string, userId: string) {
  const client = getOAuthClient();
  const { tokens } = await client.getToken(code);

  if (!tokens.refresh_token) {
    // Happens if the user previously consented and Google withheld a new
    // refresh token. Force re-consent by revoking at myaccount.google.com.
    throw new Error("No refresh_token returned — revoke prior access and retry with prompt=consent.");
  }

  const admin = createAdminClient();
  await admin.from("google_tokens").upsert({
    user_id: userId,
    refresh_token: tokens.refresh_token,
    access_token: tokens.access_token ?? null,
    scope: tokens.scope ?? null,
    expiry_date: tokens.expiry_date ?? null,
  });

  client.setCredentials(tokens);
  const oauth2 = google.oauth2({ version: "v2", auth: client });
  const { data } = await oauth2.userinfo.get();
  return data.email ?? null;
}

/**
 * Return an authorized OAuth2 client for a user, transparently refreshing the
 * access token when it is missing or within 60s of expiry. Any rotated tokens
 * are written back to Supabase so the refresh chain never breaks.
 */
export async function getAuthorizedClient(userId: string): Promise<OAuth2Client> {
  const admin = createAdminClient();
  const { data: row, error } = await admin
    .from("google_tokens")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !row) {
    throw new Error("Google account not connected for this user.");
  }

  const client = getOAuthClient();
  client.setCredentials({
    refresh_token: row.refresh_token,
    access_token: row.access_token ?? undefined,
    expiry_date: row.expiry_date ?? undefined,
  });

  // Persist Google's silent token rotation (incl. occasional refresh_token swap).
  client.on("tokens", async (tokens) => {
    await admin
      .from("google_tokens")
      .update({
        access_token: tokens.access_token ?? row.access_token,
        refresh_token: tokens.refresh_token ?? row.refresh_token,
        expiry_date: tokens.expiry_date ?? row.expiry_date,
        scope: tokens.scope ?? row.scope,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);
  });

  const expired = !row.expiry_date || row.expiry_date - Date.now() < 60_000;
  if (expired) {
    // getAccessToken() refreshes using the refresh_token and fires 'tokens'.
    await client.getAccessToken();
  }

  return client;
}
