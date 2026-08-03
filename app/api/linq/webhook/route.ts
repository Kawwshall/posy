import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { runTurn } from "@/lib/orchestrator";
import { ensureContactCard, renderForText, sendLinqText, shareContactCard } from "@/lib/linq";
import { log } from "@/lib/store";
import { AgentState } from "@/lib/types";
import { clearConversationKV, hydratePending, kvGet, persistPending, saveConversation } from "@/lib/kv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STOP = /^\s*(stop|unsubscribe|cancel all|quit)\s*$/i;
const ACTIVATE = /^\s*activate\s*$/i;

// Inbound Linq webhook. Linq delivers event_type "message.received" when a
// person texts our number. We acknowledge fast (Linq cancels slow webhooks),
// then run the agent + replies in the background via after(). Conversation and
// pending-payment state live in KV, because each webhook runs in a fresh,
// stateless Cloudflare isolate.
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
  const chatId: string = data.chat?.id || "";
  const service: string = data.sender_handle?.service || data.chat?.owner_handle?.service || "";
  console.log(`[linq] inbound from ${phone} (${service}): "${text.slice(0, 80)}"`);

  if (!phone || !text.trim()) {
    return NextResponse.json({ ok: true, ignored: "empty" });
  }

  after(async () => {
    try {
      if (STOP.test(text)) {
        await clearConversationKV(phone);
        await sendLinqText(phone, "You are unsubscribed. Text me anytime to start again.");
        return;
      }

      const existing = await kvGet<AgentState>(`conv:${phone}`);
      const isNewSender = !existing;
      const state: AgentState = existing ?? { brief: {} };

      async function offerCard() {
        if (isNewSender && /imessage/i.test(service) && chatId) {
          await ensureContactCard();
          const c = await shareContactCard(chatId);
          console.log(`[linq] shared contact card -> ${JSON.stringify(c)}`);
        }
      }

      // "Activate" is a Linq sandbox keyword. If it reaches us, greet the person
      // instead of treating it as a gift request.
      if (ACTIVATE.test(text)) {
        await sendLinqText(
          phone,
          "You are all set. Tell me who a gift is for, the occasion, and what you can spend. For example: gift for my mum, she loves chai, under 5000."
        );
        await offerCard();
        await saveConversation(phone, state);
        return;
      }

      await hydratePending(state);
      const result = await runTurn(text, state);
      await persistPending(state.pendingPaymentId, result.state);
      await saveConversation(phone, result.state);

      const lines = renderForText(result.messages);
      log({ kind: "brief_parsed", title: "Linq message handled", detail: `${phone}: "${text.slice(0, 60)}" -> ${lines.length} reply part(s)` });
      console.log(`[linq] replying to ${phone} with ${lines.length} part(s)`);
      for (const line of lines) {
        const r = await sendLinqText(phone, line);
        console.log(`[linq] sent part -> ${JSON.stringify(r)}`);
      }
      await offerCard();
    } catch (e: any) {
      console.error("[linq] background error", e?.message || e);
      try {
        await sendLinqText(phone, "Sorry, I hit a snag. Please try that again.");
      } catch {}
    }
  });

  return NextResponse.json({ ok: true, queued: true });
}
