import { NextRequest, NextResponse } from "next/server";
import { db, log } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Pause / resume / cancel a mandate. Mirrors Prava's mandate lifecycle tools.
export async function POST(req: NextRequest) {
  let body: { id?: unknown; action?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const { id, action } = body;
  if (typeof id !== "string" || typeof action !== "string") {
    return NextResponse.json({ error: "id and action are required" }, { status: 400 });
  }
  const m = db().mandates.find((x) => x.id === id);
  if (!m) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (action === "pause" && m.status === "active") m.status = "paused";
  else if (action === "resume" && m.status === "paused") m.status = "active";
  else if (action === "cancel" && m.status !== "cancelled") m.status = "cancelled";
  else if (!["pause", "resume", "cancel"].includes(action)) {
    return NextResponse.json({ error: "bad action" }, { status: 400 });
  } else {
    return NextResponse.json({ error: `cannot ${action} a ${m.status} mandate` }, { status: 409 });
  }

  log({
    kind: "mandate_created",
    title: `Mandate ${action}d · ${m.label}`,
    detail: `Status is now ${m.status}. You are always in control.`,
  });
  return NextResponse.json({ ok: true, mandate: m });
}
