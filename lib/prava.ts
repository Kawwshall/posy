import {
  GiftProduct,
  PravaCredentials,
  PravaMandate,
  PravaPaymentResult,
  PravaSession,
} from "./types";

// ---------------------------------------------------------------------------
// Prava client. Faithfully mirrors docs.prava.space. If PRAVA_SECRET_KEY is
// set we hit the real sandbox; otherwise we run a high-fidelity mock that
// returns the exact payload shapes (and the documented sandbox test card),
// so the entire flow · session -> one-time Visa network token -> checkout ->
// receipt · works end to end with zero credentials. Drop a key in .env.local
// and it goes live with no code changes.
// ---------------------------------------------------------------------------

const SECRET = process.env.PRAVA_SECRET_KEY || "";
const BASE =
  process.env.PRAVA_BASE_URL || "https://sandbox.api.prava.space";

export const pravaMode: "live" | "mock" = SECRET.startsWith("sk_")
  ? "live"
  : "mock";
export const pravaEnvironment: "mock" | "sandbox" | "production" =
  pravaMode === "mock" ? "mock" : BASE.includes("sandbox") ? "sandbox" : "production";

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
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  const res = await fetch(BASE + path, {
    ...init,
    headers: {
      Authorization: `Bearer ${SECRET}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    signal: controller.signal,
  }).finally(() => clearTimeout(timeout));
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
      `Prava ${path} ${res.status}: ${body.error?.code || body.code || ""} ${
        body.error?.message || body.message || "Request failed"
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

// POST /v1/sessions  · creates a merchant-scoped, amount-scoped payment intent.
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

  const callbackUrl = process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://")
    ? `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/demo?prava=return`
    : undefined;
  const body = await pravaFetch("/v1/sessions", {
    method: "POST",
    body: JSON.stringify({
      user_id: args.userId,
      user_email: args.userEmail,
      total_amount: total,
      currency: "INR",
      purchase_context: [
        {
          merchant_details: {
            name: args.product.merchant,
            url: args.product.merchantUrl,
            country_code_iso2: "IN",
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
      ...(callbackUrl ? { callback_url: callbackUrl } : {}),
      description: `Posy gift: ${args.product.title}`,
    }),
  });

  return { ...body, mode: "live" as const };
}

// GET /v1/sessions/{id}/payment-result · returns single-use tokenized
// credentials once the user has approved (passkey). In mock mode we return
// the documented sandbox test card immediately.
export async function getPaymentResult(sessionId: string): Promise<PravaPaymentResult> {
  if (pravaMode === "mock") {
    return { status: "awaiting_result", txnRefId: rid("tli"), credentials: { ...TEST_CARD } };
  }

  const body = await pravaFetch(`/v1/sessions/${sessionId}/payment-result`, {
    method: "GET",
  });

  const status = String(body.status || "pending") as PravaPaymentResult["status"];
  const tx = (body.transactions || [])[0] || {};
  const line = (tx.line_items || tx.lineItems || [tx])[0] || {};
  const cred = line.credentials || line;
  const token = cred.token || cred.network_token || cred.networkToken;
  if (status !== "awaiting_result" || !token) {
    return {
      status,
      txnRefId: line.txn_ref_id || line.txnRefId,
      error: line.error || tx.error || body.error,
    };
  }
  return {
    status,
    txnRefId: line.txn_ref_id || line.txnRefId,
    credentials: {
      token,
      dynamic_cvv: cred.dynamic_cvv || cred.dynamicCvv || "",
      expiry_month: cred.expiry_month || cred.expiryMonth || "",
      expiry_year: cred.expiry_year || cred.expiryYear || "",
      brand: cred.brand || "Visa",
      last4: String(token).slice(-4),
    },
  };
}

export async function reportPaymentStatus(
  sessionId: string,
  txnRefId: string,
  approved: boolean,
  amount: number,
  productId: string
) {
  if (pravaMode === "mock") return { status: "confirmed", visa_confirmation: "SUCCESS" };
  return pravaFetch(`/v1/sessions/${sessionId}/report-status`, {
    method: "POST",
    body: JSON.stringify({
      txn_ref_id: txnRefId,
      txn_status: approved ? "APPROVED" : "DECLINED",
      txn_type: "PURCHASE",
      authorization_code: approved ? "POSY-SANDBOX" : undefined,
      response_code: approved ? "00" : "05",
      amount_paid: amount.toFixed(2),
      product_statuses: [
        {
          product_id: productId,
          status: approved ? "COMPLETED" : "FAILED",
          amount_paid: approved ? amount.toFixed(2) : "0.00",
        },
      ],
    }),
  });
}

export async function revokeSession(sessionId: string) {
  if (pravaMode === "mock") return { status: "revoked" };
  return pravaFetch(`/v1/sessions/${sessionId}/revoke`, {
    method: "POST",
    body: JSON.stringify({}),
  });
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
      currency: "INR",
      purchase_context: [
        {
          merchant_details: {
            name: args.product.merchant,
            url: args.product.merchantUrl,
            country_code_iso2: "IN",
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

// POST /v1/mandates/{id}/charge · pull a charge against an existing mandate.
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
  const token = cred.token || cred.network_token || cred.networkToken;
  if (!token) {
    throw new Error("Prava did not return a payment credential for this mandate charge.");
  }
  return {
    token,
    dynamic_cvv: cred.dynamic_cvv || cred.dynamicCvv || "",
    expiry_month: cred.expiry_month || cred.expiryMonth || "",
    expiry_year: cred.expiry_year || cred.expiryYear || "",
    brand: cred.brand || "Visa",
    last4: String(token).slice(-4),
  };
}
