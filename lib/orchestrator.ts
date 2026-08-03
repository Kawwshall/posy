import { curate, etaFor } from "./agent";
import { findProduct } from "./catalog";
import { checkGuardrails } from "./guardrails";
import {
  createMandate,
  createSession,
  getPaymentResult,
  pravaEnvironment,
  pravaMode,
  reportPaymentStatus,
  revokeSession,
  sandboxTestCard,
} from "./prava";
import { db, log } from "./store";
import {
  AgentState,
  ChatMessage,
  GiftProduct,
  OptionCard,
  PaymentApprovalCard,
  Receipt,
} from "./types";
import { money } from "./money";

const DEMO_USER = { id: "user_demo_posy", email: "you@posy.gift" };

function msg(m: Omit<ChatMessage, "id">): ChatMessage {
  return { id: "m_" + Math.random().toString(36).slice(2, 10), ...m };
}

const AFFIRM = /\b(yes|yep|yeah|yup|sure|ok|okay|do it|send it|send|go|confirm|confirmed|please do|buy it|purchase|👍|✅)\b/i;
const DECLINE = /\b(no|nope|nah|cancel|stop|wait|don'?t|not now)\b/i;
const RECURRING = /\b(every year|each year|annually|recurring|remember|never miss|every birthday|every month|monthly)\b/i;
const CHECK_PAYMENT = /\b(i('| a)?ve approved|approved with prava|check payment|check status|continue checkout|payment done)\b/i;
const SIMULATE = /\b(simulate sandbox settlement|complete sandbox checkout|demo settle|simulate settlement|settle|pay now|pay|done)\b/i;

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

function firstAllowedProduct(options: OptionCard): GiftProduct | undefined {
  return options.products.find(
    (product) => checkGuardrails(product, options.brief.budget).allowed
  );
}

function optionProduct(options: OptionCard | undefined, id: string): GiftProduct | undefined {
  return options?.products.find((product) => product.id === id) || findProduct(id);
}

function paymentCard(payment: ReturnType<typeof db>["pendingPayments"][string], product: GiftProduct): ChatMessage {
  const data: PaymentApprovalCard = {
    sessionId: payment.sessionId,
    product,
    approvalUrl: payment.approvalUrl,
    expiresAt: payment.expiresAt,
    status: payment.status,
    mode: payment.mode,
  };
  return msg({ role: "assistant", rich: { kind: "payment", data } });
}

async function beginPurchase(
  product: GiftProduct,
  brief: OptionCard["brief"],
): Promise<{ message: ChatMessage; sessionId?: string }> {
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
    return {
      message: msg({
        role: "assistant",
        text: `I held off. ${decision.reasons.join(" ")} Want me to find something within budget instead?`,
      }),
    };
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
    detail: `${product.merchant} · ${money(product.price)} · scoped to this one purchase`,
    amount: product.price,
    meta: { session_id: session.session_id, order_id: session.order_id },
  });

  db().pendingPayments[session.session_id] = {
    sessionId: session.session_id,
    orderId: session.order_id,
    productId: product.id,
    product,
    approvalUrl: session.iframe_url,
    expiresAt: session.expires_at,
    brief,
    status: "pending",
    mode: session.mode,
  };

  log({
    kind: "approval_requested",
    title: "Prava approval required",
    detail: `${product.title} · secure card entry and passkey approval`,
    amount: product.price,
  });

  return {
    message: paymentCard(db().pendingPayments[session.session_id], product),
    sessionId: session.session_id,
  };
}

async function finalizePurchase(sessionId: string, giftMessage?: string): Promise<ChatMessage[]> {
  const payment = db().pendingPayments[sessionId];
  if (!payment) {
    return [msg({ role: "assistant", text: "That payment session is no longer active. Please choose the gift again." })];
  }
  const product = payment.product || findProduct(payment.productId);
  if (!product) {
    delete db().pendingPayments[sessionId];
    return [msg({ role: "assistant", text: "That product is no longer available. I can find a fresh option." })];
  }

  const result = await getPaymentResult(sessionId);
  payment.status = result.status;
  if (result.status === "pending" || result.status === "processing") {
    return [
      msg({ role: "assistant", text: "Prava is still waiting for secure card entry and passkey approval. Finish that window, then tap check again." }),
      paymentCard(payment, product),
    ];
  }
  if (result.status === "failed") {
    delete db().pendingPayments[sessionId];
    log({ kind: "declined", title: "Prava authorization failed", detail: result.error?.message || "Payment authorization was declined.", amount: product.price });
    return [msg({ role: "assistant", text: "Prava could not authorize that sandbox payment. Nothing was ordered or charged." })];
  }
  if (result.status !== "awaiting_result" || !result.credentials || !result.txnRefId) {
    return [msg({ role: "assistant", text: "Prava has not issued a usable sandbox credential yet. Please check the approval window and try again." })];
  }

  if (pravaEnvironment === "production") {
    throw new Error("Production merchant checkout is not enabled. The credential was not used or reported as charged.");
  }

  // In Prava sandbox, reporting APPROVED is the documented merchant-execution
  // simulator. No retail order or real-money charge is created here.
  await reportPaymentStatus(sessionId, result.txnRefId, true, product.price, product.id);
  const cred = result.credentials;
  log({
    kind: "card_issued",
    title: "One-time Visa sandbox credential issued",
    detail: `${cred.brand} •••• ${cred.last4} · never exposed to the browser`,
    amount: product.price,
    meta: { last4: cred.last4 },
  });

  const orderRef = "SBX-" + payment.orderId.slice(-8).toUpperCase();
  db().monthSpent += product.price;
  log({
    kind: "charged",
    title: `Sandbox checkout approved · ${money(product.price)}`,
    detail: `${product.merchant} · ${orderRef} · no real-money charge`,
    amount: product.price,
  });

  const receipt: Receipt = {
    id: "rcpt_" + Math.random().toString(36).slice(2, 10),
    product,
    amount: product.price,
    card: { brand: cred.brand, last4: cred.last4 },
    merchant: product.merchant,
    orderRef,
    giftMessage,
    recipient: payment.brief.recipient,
    eta: etaFor(product.deliveryDays),
    createdAt: new Date().toISOString(),
    environment: pravaEnvironment,
  };
  db().receipts.unshift(receipt);
  delete db().pendingPayments[sessionId];
  log({ kind: "receipt", title: "Prava sandbox checkout completed", detail: `${product.title} · sandbox result reported`, amount: product.price, meta: { receipt_id: receipt.id } });

  return [
    msg({ role: "assistant", rich: { kind: "receipt", data: receipt } }),
    msg({ role: "assistant", text: "Sandbox purchase complete. No real money moved and no retail order was placed." }),
  ];
}

// A deterministic, clearly-labelled sandbox settlement for demos. It does not
// depend on the hosted card page succeeding: it settles with the documented
// Prava sandbox test credential so a demo or video always reaches a receipt.
// It is still sandbox only. No real money moves and no retail order is placed.
async function finalizeSimulated(sessionId: string): Promise<ChatMessage[]> {
  const payment = db().pendingPayments[sessionId];
  if (!payment) {
    return [msg({ role: "assistant", text: "That payment session is no longer active. Please choose the gift again." })];
  }
  const product = payment.product || findProduct(payment.productId);
  if (!product) {
    delete db().pendingPayments[sessionId];
    return [msg({ role: "assistant", text: "That product is no longer available. I can find a fresh option." })];
  }

  const card = sandboxTestCard();
  log({
    kind: "card_issued",
    title: "Sandbox test credential settled (simulated)",
    detail: `${card.brand} •••• ${card.last4} · documented Prava sandbox test card`,
    amount: product.price,
    meta: { last4: card.last4, simulated: true },
  });

  const orderRef = "SBX-" + payment.orderId.slice(-8).toUpperCase();
  db().monthSpent += product.price;
  log({
    kind: "charged",
    title: `Sandbox settlement simulated · ${money(product.price)}`,
    detail: `${product.merchant} · ${orderRef} · no real money, no retail order`,
    amount: product.price,
  });

  const receipt: Receipt = {
    id: "rcpt_" + Math.random().toString(36).slice(2, 10),
    product,
    amount: product.price,
    card: { brand: card.brand, last4: card.last4 },
    merchant: product.merchant,
    orderRef,
    recipient: payment.brief.recipient,
    eta: etaFor(product.deliveryDays),
    createdAt: new Date().toISOString(),
    environment: pravaEnvironment,
  };
  db().receipts.unshift(receipt);
  delete db().pendingPayments[sessionId];
  log({ kind: "receipt", title: "Sandbox checkout completed (simulated for demo)", detail: `${product.title}`, amount: product.price, meta: { receipt_id: receipt.id, simulated: true } });

  return [
    msg({ role: "assistant", rich: { kind: "receipt", data: receipt } }),
    msg({ role: "assistant", text: "Settled in the Prava sandbox for the demo. This path uses the documented sandbox test card, so no real money moved and no retail order was placed." }),
  ];
}

export async function runTurn(
  text: string,
  state: AgentState
): Promise<{ messages: ChatMessage[]; state: AgentState }> {
  const messages: ChatMessage[] = [];
  const next: AgentState = { ...state, brief: { ...state.brief } };

  try {
    if (next.pendingPaymentId) {
      const pending = db().pendingPayments[next.pendingPaymentId];
      if (!pending) {
        next.pendingPaymentId = undefined;
      } else if (DECLINE.test(text) && !AFFIRM.test(text)) {
        await revokeSession(next.pendingPaymentId);
        delete db().pendingPayments[next.pendingPaymentId];
        next.pendingPaymentId = undefined;
        messages.push(msg({ role: "assistant", text: "Payment cancelled. The Prava session was revoked and nothing was charged." }));
        return { messages, state: next };
      } else if (SIMULATE.test(text)) {
        const finalized = await finalizeSimulated(next.pendingPaymentId);
        messages.push(...finalized);
        next.pendingPaymentId = undefined;
        return { messages, state: next };
      } else if (CHECK_PAYMENT.test(text) || AFFIRM.test(text)) {
        const finalized = await finalizePurchase(next.pendingPaymentId);
        messages.push(...finalized);
        if (!db().pendingPayments[next.pendingPaymentId]) next.pendingPaymentId = undefined;
        return { messages, state: next };
      } else {
        const product = pending.product || findProduct(pending.productId);
        messages.push(msg({ role: "assistant", text: "Finish the secure Prava approval first, or say cancel." }));
        if (product) messages.push(paymentCard(pending, product));
        return { messages, state: next };
      }
    }

    // --- Recurring / mandate intent (only meaningful once we've picked something) ---
    if (RECURRING.test(text) && (next.awaitingApprovalFor || next.lastOptions)) {
      const pid = next.awaitingApprovalFor || next.lastOptions?.recommendedId;
      const product = pid ? optionProduct(next.lastOptions, pid) : undefined;
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
        log({ kind: "mandate_created", title: `Recurring gift set · ${label}`, detail: `Scope: ${mandate.merchant} · cap ${money(mandate.cap)}/charge · ${mandate.max_charges} charges max · pausable anytime`, amount: mandate.cap, meta: { mandate_id: mandate.id } });
        messages.push(msg({ role: "assistant", text: `Done. I'll handle it ${mandate.recurring_frequency === "yearly" ? "every year" : "every month"}, capped at ${money(mandate.cap)}, and you can call it off anytime.` }));
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
        const product = optionProduct(next.lastOptions, targetId);
        if (!product) {
          next.awaitingApprovalFor = undefined;
          messages.push(msg({ role: "assistant", text: "That option is no longer available. I can find a fresh set for you." }));
          return { messages, state: next };
        }
        log({ kind: "approved", title: `Checkout selected: ${product.title}`, detail: `${money(product.price)} · Prava approval still required`, amount: product.price });
        const started = await beginPurchase(product, next.lastOptions.brief);
        messages.push(started.message);
        next.awaitingApprovalFor = undefined;
        next.pendingPaymentId = started.sessionId;
        return { messages, state: next };
      }
      // Otherwise fall through and treat as a refined brief.
    }

    // --- New or refined gifting brief ---
    log({ kind: "brief_parsed", title: "New request received", detail: text });
    const options = await curate(text, next.brief);
    next.brief = options.brief;
    next.lastOptions = options;

    const liveCount = options.products.filter((product) => product.source === "merchant").length;
    log({
      kind: "search",
      title: liveCount ? "Searched live Prava UCP inventory" : "Used clearly labelled demo fallback",
      detail: liveCount
        ? `${liveCount} live merchant listings considered; price and availability refreshed for this request.`
        : `${options.products.length} demo ideas considered because live merchant search returned no suitable INR listing.`,
    });

    const allowedProduct = firstAllowedProduct(options);
    const originalRecommendation = optionProduct(options, options.recommendedId);
    if (!originalRecommendation) {
      messages.push(msg({
        role: "assistant",
        text: "I couldn't find an available gift that matches those details. Try a different interest, deadline, or budget.",
      }));
      next.awaitingApprovalFor = undefined;
      return { messages, state: next };
    }

    if (!allowedProduct) {
      const blocked = checkGuardrails(originalRecommendation, options.brief.budget);
      log({ kind: "curation", title: "No purchasable match", detail: blocked.reasons.join(" "), amount: originalRecommendation.price });
      log({ kind: "declined", title: "Recommendation held by guardrails", detail: blocked.reasons.join(" "), amount: originalRecommendation.price });
      messages.push(msg({
        role: "assistant",
        text: `I held off because I couldn't find a catalog match inside all your limits. ${blocked.reasons.join(" ")} Raise the budget or account ceiling and I'll try again.`,
      }));
      next.awaitingApprovalFor = undefined;
      return { messages, state: next };
    }

    const rec = allowedProduct;

    // The model may prefer a product that the account policy blocks. Keep its
    // shortlist, but move the first actually purchasable option into the pick.
    if (options.recommendedId !== allowedProduct.id) {
      options.recommendedId = allowedProduct.id;
      options.reasoning = `I found a close match that also stays inside your account limits: ${allowedProduct.title.toLowerCase()} for ${money(allowedProduct.price)}.`;
    }
    if (!options.products.some((product) => product.id === allowedProduct.id)) {
      options.products = [allowedProduct, ...options.products].slice(0, 3);
    }
    next.lastOptions = options;
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
      log({ kind: "approval_requested", title: "Awaiting your approval", detail: `${rec.title} · ${money(rec.price)}`, amount: rec.price });
    } else {
      next.awaitingApprovalFor = undefined;
    }

    return { messages, state: next };
  } catch (e: any) {
    log({ kind: "error", title: "Agent error", detail: String(e?.message || e) });
    messages.push(msg({ role: "assistant", text: "The secure checkout hit a temporary problem. Nothing was charged. Please try again or cancel this payment." }));
    return { messages, state: next };
  }
}

export { pravaMode };
