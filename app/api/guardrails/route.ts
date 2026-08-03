import { NextRequest, NextResponse } from "next/server";
import { db, log } from "@/lib/store";
import { money } from "@/lib/money";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let patch: Record<string, unknown>;
  try {
    patch = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
    return NextResponse.json({ error: "invalid request body" }, { status: 400 });
  }
  const g = db().guardrails;
  for (const key of ["perGiftCap", "monthlyCap", "requireApprovalOver"] as const) {
    if (typeof patch[key] === "number" && patch[key] >= 0) g[key] = patch[key];
  }
  log({ kind: "guardrail_check", title: "Spend policy updated", detail: `Per-gift ${money(g.perGiftCap)} · monthly ${money(g.monthlyCap)} · step-up over ${money(g.requireApprovalOver)}` });
  return NextResponse.json({ ok: true, guardrails: g });
}
