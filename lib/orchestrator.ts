import { curate, etaFor } from "./agent";
import { findProduct } from "./catalog";
import { checkGuardrails } from "./guardrails";
import {
  createMandate,
  createSession,
  getPaymentResult,
  pravaMode,
} from "./prava";
import { db, log } from "./store";
import {
  AgentState,
  ChatMessage,
  GiftProduct,
  OptionCard,
  Receipt,
} from "./types";

const DEMO_USER = { id: "user_demo_posy", email: "you@posy.gift" };

function msg(m: Omit<ChatMessage, "id">): ChatMessage {
  return { id: "m_" + Math.random().toString(36).slice(2, 10), ...m };
}

const AFFIRM = /\b(yes|yep|yeah|yup|sure|ok|okay|do it|send it|send|go|confirm|confirmed|please do|buy it|purchase|👍|✅)\b/i;
const DECLINE = /\b(no|nope|nah|cancel|stop|wait|don'?t|not now)\b/i;
const RECURRING = /\b(every year|each year|annually|recurring|remember|never miss|every birthday|every month|monthly)\b/i;

function resolveSelection(text: string, opts: OptionCard): string | undefined {
  const t = text.toLowerCase();
  const m = t.match(/\b(?:option|number|#)\s*(\d)\b/) || t.match(/\bthe\s+(\d)(?:st|nd|rd|th)?\b/);
  if (m) {
    const idx = parseInt(m[1], 10) - 1;
    if (opts.products[idx]) return opts.products[idx].id;
  }
  for (const p of opts.products) {
    const words = p.title.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 3);
    if (words.some((w) => t.includes(w))) return p.id;
    if (p.category && t.includes(p.category)) return p.id;
  }
  return undefined;
}

// The core purchase execution: guardrails -> Prava session -> one-time Visa
// network token -> checkout -> receipt. Every step is written to the audit
// ledger so the trust dashboard reflects exactly what the agent did.
async function executePurchase(
  product: GiftProduct,
  brief: OptionCard["brief"],
  giftMessage?: string
): Promise<ChatMessage> {
  const decision = checkGuardrails(product, brief.budget);
  log({
    kind: "guardrail_check",
    title: `Guardrail check · ${product.title}`,
    detail: decision.reasons.join(" "),
    amount: product.price,
    meta: { allowed: decision.allowed, requiresApproval: decision.requiresApproval },
  });

  if (!decision.allowed) {
    log({ kind: "declined", title: "Purchase blocked by guardrails", detail: decision.reasons.join(" "), amount: product.price });
    return msg({
      role: "assistant",
      text: `I held off. ${decision.reasons.join(" ")} Want me to find something within budget instead?`,
    });
  }

  // 1. Create a merchant- & amount-scoped Prava session.
  const session = await createSession({
    userId: DEMO_USER.id,
    userEmail: DEMO_USER.email,
    product,
  });
  log({
    kind: "session_created",
    title: `Prava session opened (${session.mode})`,
    detail: `${product.merchant} · $${product.price} · scoped to this one purchase`,
    amount: product.price,
    meta: { session_id: session.session_id, order_id: session.order_id },
  });

  // 2. Retrieve the single-use tokenized credential (Visa network token).
  const cred = await getPaymentResult(session.session_id);
  log({
    kind: "card_issued",
    title: "One-time Visa network token issued",
    detail: `${cred.brand} •••• ${cred.last4} · single-use · CVV rotates per charge`,
    amount: product.price,
    meta: { last4: cred.last4 },
  });

  // 3. Complete checkout at the merchant with the token, then record it.
  const orderRef = "PSY-" + Math.random().toString(36).slice(2, 8).toUpperCase();
  db().monthSpent += product.price;
  log({
    kind: "charged",
    title: `Charged $${product.price} at ${product.merchant}`,
    detail: `Order ${orderRef} · paid with ${cred.brand} •••• ${cred.last4}`,
    amount: product.price,
  });

  const receipt: Receipt = {
    id: "rcpt_" + Math.random().toString(36).slice(2, 10),
    product,
    amount: product.price,
    card: { brand: cred.brand, last4: cred.last4, network_token: cred.token },
    merchant: product.merchant,
    orderRef,
    giftMessage,
    recipient: brief.recipient,
    eta: etaFor(product.deliveryDays),
    createdAt: new Date().toISOString(),
  };
  db().receipts.unshift(receipt);
  log({ kind: "receipt", title: `Gift on the way to ${brief.recipient || "your recipient"}`, detail: `${product.title} · arrives ${receipt.eta}`, amount: product.price, meta: { receipt_id: receipt.id } });

  return msg({ role: "assistant", rich: { kind: "receipt", data: receipt } });
}

export async function runTurn(
  text: string,
  state: AgentState
): Promise<{ messages: ChatMessage[]; state: AgentState }> {
  const messages: ChatMessage[] = [];
  const next: AgentState = { ...state, brief: { ...state.brief } };

  try {
    // --- Recurring / mandate intent (only meaningful once we've picked something) ---
    if (RECURRING.test(text) && (next.awaitingApprovalFor || next.lastOptions)) {
      const pid = next.awaitingApprovalFor || next.lastOptions?.recommendedId;
      const product = pid ? findProduct(pid) : undefined;
      if (product) {
        const label = `${next.brief.recipient ? next.brief.recipient + "'s " : ""}${next.brief.occasion || "gift"}, ${/month/i.test(text) ? "monthly" : "every year"}`;
        const mandate = await createMandate({
          userId: DEMO_USER.id,
          userEmail: DEMO_USER.email,
          product,
          label,
          frequency: /month/i.test(text) ? "monthly" : "yearly",
          cap: Math.max(product.price, next.brief.budget || product.price),
          maxCharges: /month/i.test(text) ? 12 : 5,
        });
        db().mandates.unshift(mandate);
        log({ kind: "mandate_created", title: `Recurring gift set · ${label}`, detail: `Scope: ${mandate.merchant} · cap $${mandate.cap}/charge · ${mandate.max_charges} charges max · pausable anytime`, amount: mandate.cap, meta: { mandate_id: mandate.id } });
        messages.push(msg({ role: "assistant", text: `Done. I'll handle it ${mandate.recurring_frequency === "yearly" ? "every year" : "every month"}, capped at $${mandate.cap}, and you can call it off anytime.` }));
        messages.push(msg({ role: "assistant", rich: { kind: "mandate", data: mandate } }));
        return { messages, state: next };
      }
    }

    // --- Approval / selection when we're waiting on a go-ahead ---
    if (next.awaitingApprovalFor && next.lastOptions) {
      if (DECLINE.test(text) && !AFFIRM.test(text)) {
        next.awaitingApprovalFor = undefined;
        messages.push(msg({ role: "assistant", text: "No worries, nothing sent. Want me to look for other options or adjust the budget?" }));
        return { messages, state: next };
      }
      const selected = resolveSelection(text, next.lastOptions);
      const affirm = AFFIRM.test(text);
      if (selected || affirm) {
        const targetId = selected || next.awaitingApprovalFor;
        const product = findProduct(targetId)!;
        log({ kind: "approved", title: `You approved: ${product.title}`, detail: `$${product.price} · passkey-confirmed`, amount: product.price });
        const receiptMsg = await executePurchase(product, next.lastOptions.brief);
        messages.push(receiptMsg);
        next.awaitingApprovalFor = undefined;
        if (receiptMsg.rich?.kind === "receipt") {
          messages.push(msg({ role: "assistant", text: `Sent. Want me to remember this one, so you never have to think about it again?` }));
        }
        return { messages, state: next };
      }
      // Otherwise fall through and treat as a refined brief.
    }

    // --- New or refined gifting brief ---
    log({ kind: "brief_parsed", title: "New request received", detail: text });
    const options = await curate(text, next.brief);
    next.brief = options.brief;
    next.lastOptions = options;

    log({ kind: "search", title: "Searched merchant network", detail: `${options.products.length} strong matches across ${new Set(options.products.map((p) => p.merchant)).size} merchants` });

    const rec = findProduct(options.recommendedId)!;
    const decision = checkGuardrails(rec, options.brief.budget);
    log({ kind: "curation", title: `Recommended: ${rec.title}`, detail: options.reasoning, amount: rec.price });

    messages.push(msg({ role: "assistant", text: options.reasoning }));
    messages.push(msg({ role: "assistant", rich: { kind: "options", data: options } }));
    messages.push(
      msg({
        role: "assistant",
        rich: {
          kind: "approval",
          data: {
            product: rec,
            amount: rec.price,
            guardrail: decision,
            giftMessage: undefined,
          },
        },
      })
    );

    if (decision.allowed) {
      next.awaitingApprovalFor = rec.id;
      log({ kind: "approval_requested", title: "Awaiting your approval", detail: `${rec.title} · $${rec.price}`, amount: rec.price });
    }

    return { messages, state: next };
  } catch (e: any) {
    log({ kind: "error", title: "Agent error", detail: String(e?.message || e) });
    messages.push(msg({ role: "assistant", text: `Hmm, I hit a snag: ${String(e?.message || e)}. Mind trying that again?` }));
    return { messages, state: next };
  }
}

export { pravaMode };
