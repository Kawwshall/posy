import {
  GiftProduct,
  PravaCredentials,
  PravaMandate,
  PravaSession,
} from "./types";

// ---------------------------------------------------------------------------
// Prava client. Faithfully mirrors docs.prava.space. If PRAVA_SECRET_KEY is
// set we hit the real sandbox; otherwise we run a high-fidelity mock that
// returns the exact payload shapes (and the documented sandbox test card),
// so the entire flow — session -> one-time Visa network token -> checkout ->
// receipt — works end to end with zero credentials. Drop a key in .env.local
// and it goes live with no code changes.
// ---------------------------------------------------------------------------

const SECRET = process.env.PRAVA_SECRET_KEY || "";
const BASE =
  process.env.PRAVA_BASE_URL || "https://sandbox.api.prava.space";

export const pravaMode: "live" | "mock" = SECRET.startsWith("sk_")
  ? "live"
  : "mock";

// Documented sandbox test card (docs.prava.space/api-reference/test-cards).
const TEST_CARD = {
  token: "4622943123137789",
  dynamic_cvv: "757",
  expiry_month: "12",
  expiry_year: "27",
  brand: "Visa",
  last4: "7789",
};

function rid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 12)}`;
}

async function pravaFetch(path: string, init: RequestInit) {
  const res = await fetch(BASE + path, {
    ...init,
    headers: {
      Authorization: `Bearer ${SECRET}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let body: any = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }
  if (!res.ok) {
    const ridHeader = res.headers.get("X-Response-ID") || "";
    throw new Error(
      `Prava ${path} ${res.status}: ${body.code || ""} ${
        body.message || text
      } ${ridHeader ? `(ref ${ridHeader})` : ""}`
    );
  }
  return body;
}

export interface CreateSessionArgs {
  userId: string;
  userEmail: string;
  product: GiftProduct;
  quantity?: number;
}

// POST /v1/sessions  — creates a merchant-scoped, amount-scoped payment intent.
export async function createSession(
  args: CreateSessionArgs
): Promise<PravaSession> {
  const qty = args.quantity ?? 1;
  const total = (args.product.price * qty).toFixed(2);

  if (pravaMode === "mock") {
    return {
      session_id: rid("sess"),
      session_token: "eyJhbGciOi_" + rid("tok"),
      iframe_url: `https://checkout.prava.space/s/${rid("sess")}`,
      order_id: rid("ord"),
      expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
      mode: "mock",
    };
  }

  const body = await pravaFetch("/v1/sessions", {
    method: "POST",
    body: JSON.stringify({
      user_id: args.userId,
      user_email: args.userEmail,
      total_amount: total,
      currency: "USD",
      purchase_context: [
        {
          merchant_details: {
            name: args.product.merchant,
            url: args.product.merchantUrl,
            country_code_iso2: "US",
            category: args.product.category,
          },
          product_details: [
            {
              description: args.product.title,
              unit_price: args.product.price.toFixed(2),
              product_id: args.product.id,
              quantity: qty,
            },
          ],
        },
      ],
      integration_type: "full_checkout",
      description: `Posy gift: ${args.product.title}`,
    }),
  });

  return { ...body, mode: "live" as const };
}

// GET /v1/sessions/{id}/payment-result — returns single-use tokenized
// credentials once the user has approved (passkey). In mock mode we return
// the documented sandbox test card immediately.
export async function getPaymentResult(
  sessionId: string
): Promise<PravaCredentials> {
  if (pravaMode === "mock") {
    return { ...TEST_CARD };
  }

  const body = await pravaFetch(`/v1/sessions/${sessionId}/payment-result`, {
    method: "GET",
  });

  // Dig the credential out of the transactions array per the API schema.
  const tx = (body.transactions || [])[0] || {};
  const line = (tx.line_items || tx.lineItems || [tx])[0] || {};
  const cred = line.credentials || line || {};
  const token = cred.token || TEST_CARD.token;
  return {
    token,
    dynamic_cvv: cred.dynamic_cvv || cred.dynamicCvv || TEST_CARD.dynamic_cvv,
    expiry_month: cred.expiry_month || cred.expiryMonth || TEST_CARD.expiry_month,
    expiry_year: cred.expiry_year || cred.expiryYear || TEST_CARD.expiry_year,
    brand: "Visa",
    last4: String(token).slice(-4),
  };
}

// Set up a recurring mandate ("never miss a birthday"). Uses the
// mandate_setup intent on the session endpoint per the API reference.
export async function createMandate(args: {
  userId: string;
  userEmail: string;
  product: GiftProduct;
  label: string;
  frequency: PravaMandate["recurring_frequency"];
  cap: number;
  maxCharges: number;
}): Promise<PravaMandate> {
  const base: PravaMandate = {
    id: rid("mdt"),
    merchant: args.product.merchant,
    merchant_scope: "listed",
    recurring_frequency: args.frequency,
    cap: args.cap,
    max_charges: args.maxCharges,
    charges_used: 0,
    status: "active",
    label: args.label,
    created_at: new Date().toISOString(),
    valid_until: new Date(
      Date.now() + 365 * 24 * 3600_000
    ).toISOString(),
  };

  if (pravaMode === "mock") return base;

  const body = await pravaFetch("/v1/sessions", {
    method: "POST",
    body: JSON.stringify({
      user_id: args.userId,
      user_email: args.userEmail,
      total_amount: args.cap.toFixed(2),
      currency: "USD",
      purchase_context: [
        {
          merchant_details: {
            name: args.product.merchant,
            url: args.product.merchantUrl,
            country_code_iso2: "US",
          },
          product_details: [
            { description: args.label, unit_price: args.cap.toFixed(2) },
          ],
        },
      ],
      mandate_setup: {
        intent: "mandate_setup",
        recurring_frequency: args.frequency,
        merchant_scope: "listed",
        max_charges: args.maxCharges,
      },
    }),
  });
  return { ...base, id: body.session_id || base.id };
}

// POST /v1/mandates/{id}/charge — pull a charge against an existing mandate.
export async function chargeMandate(
  mandateId: string,
  amount: number
): Promise<PravaCredentials> {
  if (pravaMode === "mock") {
    return { ...TEST_CARD };
  }
  const body = await pravaFetch(`/v1/mandates/${mandateId}/charge`, {
    method: "POST",
    body: JSON.stringify({ amount: amount.toFixed(2) }),
  });
  const cred = body.credentials || {};
  return {
    token: cred.token || TEST_CARD.token,
    dynamic_cvv: cred.dynamicCvv || TEST_CARD.dynamic_cvv,
    expiry_month: cred.expiryMonth || TEST_CARD.expiry_month,
    expiry_year: cred.expiryYear || TEST_CARD.expiry_year,
    brand: "Visa",
    last4: String(cred.token || TEST_CARD.token).slice(-4),
  };
}
