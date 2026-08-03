// Shared domain types for Posy · the agentic gifting concierge.

export type Money = number; // stored in whole INR rupees

export interface GiftProduct {
  id: string;
  title: string;
  description: string;
  price: Money;
  currency: "INR";
  externalProductId?: string;
  variantId?: string;
  imageUrl?: string;
  merchant: string;
  merchantUrl: string;
  category: string;
  tags: string[];
  rating: number; // 0-5
  deliveryDays: number;
  availabilityLabel?: string;
  source: "demo" | "merchant";
}

export interface GiftBrief {
  recipient?: string; // "mom", "my brother Sam"
  relationship?: string;
  occasion?: string; // "birthday", "anniversary"
  budget?: Money; // hard cap
  interests?: string[];
  deadlineDays?: number;
  notes?: string;
}

// ---- Prava payment primitives (mirrors docs.prava.space shapes) ----

export interface PravaSession {
  session_id: string;
  session_token: string;
  iframe_url: string;
  order_id: string;
  expires_at: string;
  mode: "live" | "mock";
}

export interface PravaCredentials {
  token: string; // Visa network token (virtual card number)
  dynamic_cvv: string; // single-use CVV
  expiry_month: string;
  expiry_year: string;
  brand: string; // "Visa"
  last4: string;
}

export type PravaPaymentStatus = "pending" | "processing" | "awaiting_result" | "completed" | "failed";

export interface PravaPaymentResult {
  status: PravaPaymentStatus;
  txnRefId?: string;
  credentials?: PravaCredentials;
  error?: { code?: string; message?: string };
}

export interface PendingPayment {
  sessionId: string;
  orderId: string;
  productId: string;
  product?: GiftProduct;
  approvalUrl: string;
  expiresAt: string;
  brief: GiftBrief;
  status: PravaPaymentStatus;
  mode: "live" | "mock";
}

export interface PaymentApprovalCard {
  sessionId: string;
  product: GiftProduct;
  approvalUrl: string;
  expiresAt: string;
  status: PravaPaymentStatus;
  mode: "live" | "mock";
}

export interface PravaMandate {
  id: string;
  merchant: string;
  merchant_scope: "listed" | "any";
  recurring_frequency: "one_time" | "weekly" | "monthly" | "yearly";
  cap: Money; // per-charge cap
  max_charges: number;
  charges_used: number;
  status: "active" | "paused" | "cancelled";
  label: string; // human label e.g. "Mom's birthday, every year"
  created_at: string;
  valid_until?: string;
}

// ---- Guardrails / trust layer ----

export interface Guardrails {
  perGiftCap: Money; // default hard cap per gift
  monthlyCap: Money; // rolling monthly spend cap
  requireApprovalOver: Money; // amounts above this need explicit user OK
  blockedCategories: string[];
}

export type GuardrailDecision = {
  allowed: boolean;
  requiresApproval: boolean;
  reasons: string[];
};

// ---- Audit ledger ----

export type LedgerKind =
  | "brief_parsed"
  | "search"
  | "curation"
  | "guardrail_check"
  | "approval_requested"
  | "approved"
  | "session_created"
  | "card_issued"
  | "charged"
  | "receipt"
  | "mandate_created"
  | "mandate_charged"
  | "declined"
  | "error";

export interface LedgerEntry {
  id: string;
  ts: string;
  kind: LedgerKind;
  title: string;
  detail?: string;
  amount?: Money;
  meta?: Record<string, unknown>;
}

export interface Receipt {
  id: string;
  product: GiftProduct;
  amount: Money;
  // Never persist or return the payment credential after checkout. Receipts
  // only need the non-sensitive network and last four digits.
  card: { brand: string; last4: string };
  merchant: string;
  orderRef: string;
  giftMessage?: string;
  recipient?: string;
  eta: string;
  createdAt: string;
  environment?: "mock" | "sandbox" | "production";
}

// ---- Chat / agent transport ----

export type ChatRole = "user" | "assistant";

export type RichKind = "options" | "approval" | "payment" | "receipt" | "mandate" | "trace";

export interface OptionCard {
  products: GiftProduct[];
  recommendedId: string;
  reasoning: string;
  brief: GiftBrief;
}

export interface ApprovalCard {
  product: GiftProduct;
  amount: Money;
  guardrail: GuardrailDecision;
  giftMessage?: string;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  text?: string;
  rich?:
    | { kind: "options"; data: OptionCard }
    | { kind: "approval"; data: ApprovalCard }
    | { kind: "payment"; data: PaymentApprovalCard }
    | { kind: "receipt"; data: Receipt }
    | { kind: "mandate"; data: PravaMandate }
    | { kind: "trace"; data: LedgerEntry[] };
  pending?: boolean;
}

export interface AgentState {
  brief: GiftBrief;
  lastOptions?: OptionCard;
  awaitingApprovalFor?: string; // product id
  pendingPaymentId?: string; // server-held Prava session id
}
