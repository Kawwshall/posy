import { NextRequest, NextResponse } from "next/server";
import { runTurn } from "@/lib/orchestrator";
import { AgentState } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const text: string = (body?.text || "").toString();
  const state: AgentState = body?.state || { brief: {} };
  if (!text.trim()) {
    return NextResponse.json({ error: "empty message" }, { status: 400 });
  }
  const result = await runTurn(text, state);
  return NextResponse.json(result);
}
