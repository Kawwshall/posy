import { NextResponse } from "next/server";
import { db } from "@/lib/store";
import { pravaEnvironment, pravaMode } from "@/lib/prava";
import { openaiMode, OPENAI_MODEL } from "@/lib/openai";
import { pravaShoppingMode } from "@/lib/prava-shopping";
import { linqMode } from "@/lib/linq";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const d = db();
  return NextResponse.json({
    guardrails: d.guardrails,
    ledger: d.ledger,
    mandates: d.mandates,
    receipts: d.receipts,
    monthSpent: d.monthSpent,
    modes: { prava: pravaMode, pravaEnvironment, shopping: pravaShoppingMode, openai: openaiMode, model: OPENAI_MODEL, linq: linqMode },
  });
}
