import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { runTurn } from "@/lib/orchestrator";
import { renderForText, sendLinqText } from "@/lib/linq";
import { clearConversation, getConversation, log, setConversation } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STOP = /^\s*(stop|unsubscribe|cancel all|quit)\s*$/i;

// Inbound Linq webhook. Linq delivers event_type "message.received" when a
// person texts our number. We MUST acknowledge fast (Linq cancels slow
// webhooks), so we return 200 immediately and run the agent + replies in the
// background via after() (bubbled to the Worker's waitUntil).
export async function POST(req: NextRequest) {
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
    return NextResponse.json({ ok: true, ignored: body?.event_type || "unknown" });
  }
  const data = body.data || {};
  if ((data.direction && data.direction !== "inbound") || data.sender_handle?.is_me) {
    return NextResponse.json({ ok: true, ignored: "not-inbound" });
  }

  const phone: string = data.sender_handle?.handle || "";
  const text: string = (data.parts || []).find((p: any) => p.type === "text")?.value || "";
  console.log(`[linq] inbound from ${phone}: "${text.slice(0, 80)}"`);

  if (!phone || !text.trim()) {
    return NextResponse.json({ ok: true, ignored: "empty" });
  }

  // Do the slow work (OpenAI + Prava + outbound sends) AFTER responding.
  after(async () => {
    try {
      if (STOP.test(text)) {
        clearConversation(phone);
        await sendLinqText(phone, "You are unsubscribed. Text me anytime to start again.");
        return;
      }
      const state = getConversation(phone);
      const result = await runTurn(text, state);
      setConversation(phone, result.state);
      const lines = renderForText(result.messages);
      log({ kind: "brief_parsed", title: "Linq message handled", detail: `${phone}: "${text.slice(0, 60)}" -> ${lines.length} reply part(s)` });
      console.log(`[linq] replying to ${phone} with ${lines.length} part(s)`);
      for (const line of lines) {
        const r = await sendLinqText(phone, line);
        console.log(`[linq] sent part -> ${JSON.stringify(r)}`);
      }
    } catch (e: any) {
      console.error("[linq] background error", e?.message || e);
      try {
        await sendLinqText(phone, "Sorry, I hit a snag. Please try that again.");
      } catch {}
    }
  });

  // Acknowledge immediately so Linq does not cancel/retry.
  return NextResponse.json({ ok: true, queued: true });
}
