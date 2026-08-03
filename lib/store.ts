import { AgentState, Guardrails, LedgerEntry, PendingPayment, PravaMandate, Receipt } from "./types";

// Simple in-memory store for the demo. One shared "account" so the conversation
// demo and the trust dashboard stay in sync in a single running instance.
// (In production this is a per-user DB row.)

interface DB {
  guardrails: Guardrails;
  ledger: LedgerEntry[];
  mandates: PravaMandate[];
  receipts: Receipt[];
  pendingPayments: Record<string, PendingPayment>;
  conversations: Record<string, AgentState>;
  monthSpent: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __POSY_DB__: DB | undefined;
}

function seed(): DB {
  return {
    guardrails: {
      perGiftCap: 5000,
      monthlyCap: 15000,
      requireApprovalOver: 2500,
      blockedCategories: ["alcohol-restricted", "gift-cards"],
    },
    ledger: [
      {
        id: "led_seed",
        ts: new Date().toISOString(),
        kind: "brief_parsed",
        title: "Posy account initialized",
        detail: "Spend guardrails active. Cards are issued one-time via Prava (Visa network tokens).",
      },
    ],
    mandates: [],
    receipts: [],
    pendingPayments: {},
    conversations: {},
    monthSpent: 0,
  };
}

// Per-sender agent state for channel conversations (e.g. Linq/iMessage), keyed
// by phone number. In production this is a per-user DB row.
export function getConversation(key: string): AgentState {
  return db().conversations[key] || { brief: {} };
}

export function setConversation(key: string, state: AgentState) {
  db().conversations[key] = state;
}

export function clearConversation(key: string) {
  delete db().conversations[key];
}

export function db(): DB {
  if (!global.__POSY_DB__) global.__POSY_DB__ = seed();
  return global.__POSY_DB__;
}

export function resetDb() {
  global.__POSY_DB__ = seed();
}

export function log(entry: Omit<LedgerEntry, "id" | "ts">): LedgerEntry {
  const e: LedgerEntry = {
    id: "led_" + Math.random().toString(36).slice(2, 10),
    ts: new Date().toISOString(),
    ...entry,
  };
  db().ledger.unshift(e);
  return e;
}
