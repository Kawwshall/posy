import { NextResponse } from "next/server";
import { configureContactCard, linqMode } from "@/lib/linq";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Configure the "Posy" contact card (name + logo) on the Linq number. Call once
// after deploy (the image_url must be publicly reachable). Idempotent.
export async function POST() {
  if (linqMode === "off") {
    return NextResponse.json({ error: "Linq not configured" }, { status: 400 });
  }
  const r = await configureContactCard();
  return NextResponse.json(r);
}

export async function GET() {
  return POST();
}
