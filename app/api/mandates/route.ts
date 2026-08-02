import { NextRequest, NextResponse } from "next/server";
import { db, log } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Pause / resume / cancel a mandate. Mirrors Prava's mandate lifecycle tools.
export async function POST(req: NextRequest) {
  const { id, action } = await req.json();
  const m = db().mandates.find((x) => x.id === id);
  if (!m) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (action === "pause") m.status = "paused";
  else if (action === "resume") m.status = "active";
  else if (action === "cancel") m.status = "cancelled";
  else return NextResponse.json({ error: "bad action" }, { status: 400 });

  log({
    kind: "mandate_created",
    title: `Mandate ${action}d · ${m.label}`,
    detail: `Status is now ${m.status}. You are always in control.`,
  });
  return NextResponse.json({ ok: true, mandate: m });
}
