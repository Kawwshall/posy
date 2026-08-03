import { NextRequest, NextResponse } from "next/server";
import { runTurn } from "@/lib/orchestrator";
import { renderForText, sendLinqText } from "@/lib/linq";
import { clearConversation, getConversation, log, setConversation } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STOP = /^\s*(stop|unsubscribe|cancel all|quit)\s*$/i;

// Inbound Linq webhook. Linq delivers event_type "message.received" when a
// person texts our number. We run the agent and reply over the same thread.
export async function POST(req: NextRequest) {
  // Optional shared-secret check (set LINQ_WEBHOOK_SECRET to enforce).
  const secret = process.env.LINQ_WEBHOOK_SECRET;
  if (secret) {
    const got = req.headers.get("x-linq-signature") || req.headers.get("x-webhook-secret") || "";
    if (got !== secret) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  if (body?.event_type !== "message.received") {
    // Acknowledge non-message events (delivery, read, reactions) without acting.
    return NextResponse.json({ ok: true, ignored: body?.event_type || "unknown" });
  }

  const data = body.data || {};
  if (data.direction && data.direction !== "inbound") {
    return NextResponse.json({ ok: true, ignored: "outbound" });
  }
  if (data.sender_handle?.is_me) {
    return NextResponse.json({ ok: true, ignored: "self" });
  }

  const phone: string = data.sender_handle?.handle || "";
  const text: string = (data.parts || []).find((p: any) => p.type === "text")?.value || "";
  if (!phone || !text.trim()) {
    return NextResponse.json({ ok: true, ignored: "empty" });
  }

  // Honor opt-out immediately.
  if (STOP.test(text)) {
    clearConversation(phone);
    await sendLinqText(phone, "You are unsubscribed. Text me anytime to start again.");
    log({ kind: "brief_parsed", title: "Opt-out honored", detail: `${phone} sent STOP` });
    return NextResponse.json({ ok: true, stopped: true });
  }

  try {
    const state = getConversation(phone);
    const result = await runTurn(text, state);
    setConversation(phone, result.state);

    const lines = renderForText(result.messages);
    log({ kind: "brief_parsed", title: "Linq message handled", detail: `${phone}: "${text.slice(0, 60)}" -> ${lines.length} reply part(s)` });

    // Send replies in order so the thread reads naturally.
    for (const line of lines) {
      await sendLinqText(phone, line);
    }
    return NextResponse.json({ ok: true, replies: lines.length });
  } catch (e: any) {
    log({ kind: "error", title: "Linq webhook error", detail: String(e?.message || e) });
    await sendLinqText(phone, "Sorry, I hit a snag. Please try that again.");
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 200 });
  }
}
