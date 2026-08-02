import { NextRequest, NextResponse } from "next/server";
import { db, log } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const patch = await req.json();
  const g = db().guardrails;
  for (const key of ["perGiftCap", "monthlyCap", "requireApprovalOver"] as const) {
    if (typeof patch[key] === "number" && patch[key] >= 0) g[key] = patch[key];
  }
  log({ kind: "guardrail_check", title: "Spend policy updated", detail: `Per-gift $${g.perGiftCap} · monthly $${g.monthlyCap} · step-up over $${g.requireApprovalOver}` });
  return NextResponse.json({ ok: true, guardrails: g });
}
