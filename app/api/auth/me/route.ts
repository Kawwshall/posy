import { NextRequest, NextResponse } from "next/server";
import { authConfigured, getSessionFromReq } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getSessionFromReq(req);
  return NextResponse.json({ configured: authConfigured, user: user || null });
}
