import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  STATE_COOKIE,
  createSession,
  exchangeCode,
  fetchGithubUser,
} from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://posy.getcontios.com";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const saved = req.cookies.get(STATE_COOKIE)?.value;

  const fail = () => NextResponse.redirect(`${APP_URL}/?auth=error`);

  if (!code || !state || !saved || state !== saved) return fail();

  const token = await exchangeCode(code);
  if (!token) return fail();
  const user = await fetchGithubUser(token);
  if (!user) return fail();

  const session = await createSession(user);
  const res = NextResponse.redirect(`${APP_URL}/?auth=ok`);
  res.cookies.set(SESSION_COOKIE, session, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 86400,
  });
  res.cookies.set(STATE_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
