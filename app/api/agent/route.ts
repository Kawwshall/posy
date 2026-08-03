import { NextRequest, NextResponse } from "next/server";
import { runTurn } from "@/lib/orchestrator";
import { AgentState } from "@/lib/types";
import { hydratePending, persistPending } from "@/lib/kv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid request body" }, { status: 400 });
  }
  const input = body as { text?: unknown; state?: unknown };
  const text = typeof input.text === "string" ? input.text : "";
  const candidate = input.state;
  const state: AgentState = candidate && typeof candidate === "object" && "brief" in candidate
    ? candidate as AgentState
    : { brief: {} };
  if (!text.trim()) {
    return NextResponse.json({ error: "empty message" }, { status: 400 });
  }
  await hydratePending(state);
  const result = await runTurn(text, state);
  await persistPending(state.pendingPaymentId, result.state);
  return NextResponse.json(result);
}
