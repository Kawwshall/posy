import { NextRequest, NextResponse } from "next/server";
import { STATE_COOKIE, authConfigured, githubAuthorizeUrl } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  if (!authConfigured) {
    return NextResponse.json({ error: "GitHub sign-in is not configured yet." }, { status: 503 });
  }
  const state = crypto.randomUUID();
  const res = NextResponse.redirect(githubAuthorizeUrl(state));
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
