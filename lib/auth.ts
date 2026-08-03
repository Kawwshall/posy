import { NextRequest } from "next/server";
import { kvDel, kvGet, kvPut } from "./kv";

// Minimal GitHub OAuth sign-in. Sessions live in KV; the site works fine when
// this is not configured (the button just hides).

const CLIENT_ID = process.env.GITHUB_CLIENT_ID || "";
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || "";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://posy.getcontios.com";

export const authConfigured = Boolean(CLIENT_ID && CLIENT_SECRET);
export const SESSION_COOKIE = "posy_session";
export const STATE_COOKIE = "posy_oauth_state";

export interface SessionUser {
  login: string;
  name: string;
  avatar: string;
}

function newToken(): string {
  return (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, "");
}

export function githubAuthorizeUrl(state: string): string {
  const p = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: `${APP_URL}/api/auth/github/callback`,
    scope: "read:user",
    state,
    allow_signup: "true",
  });
  return `https://github.com/login/oauth/authorize?${p.toString()}`;
}

export async function exchangeCode(code: string): Promise<string | null> {
  const r = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, code }),
  });
  const d: any = await r.json().catch(() => ({}));
  return d.access_token || null;
}

export async function fetchGithubUser(accessToken: string): Promise<SessionUser | null> {
  const r = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": "posy",
      Accept: "application/vnd.github+json",
    },
  });
  if (!r.ok) return null;
  const u: any = await r.json();
  return { login: u.login, name: u.name || u.login, avatar: u.avatar_url };
}

export async function createSession(user: SessionUser): Promise<string> {
  const t = newToken();
  await kvPut(`session:${t}`, user);
  return t;
}

export async function getSessionFromReq(req: NextRequest): Promise<SessionUser | null> {
  const t = req.cookies.get(SESSION_COOKIE)?.value;
  if (!t) return null;
  return await kvGet<SessionUser>(`session:${t}`);
}

export async function destroySession(req: NextRequest): Promise<void> {
  const t = req.cookies.get(SESSION_COOKIE)?.value;
  if (t) await kvDel(`session:${t}`);
}
