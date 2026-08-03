import { NextRequest, NextResponse } from "next/server";
import { linqMode, sendLinqText } from "@/lib/linq";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Test helper: POST { to, text } to send an outbound Linq message. Handy for
// verifying the integration end to end from a device you own.
export async function POST(req: NextRequest) {
  if (linqMode === "off") {
    return NextResponse.json({ error: "Linq not configured (set LINQ_API_TOKEN and LINQ_NUMBER)" }, { status: 400 });
  }
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const to = String(body?.to || "");
  const text = String(body?.text || "Hello from Posy");
  if (!to) return NextResponse.json({ error: "missing 'to'" }, { status: 400 });
  const r = await sendLinqText(to, text);
  return NextResponse.json(r);
}
