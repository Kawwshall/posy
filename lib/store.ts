import { Guardrails, LedgerEntry, PravaMandate, Receipt } from "./types";

// Simple in-memory store for the demo. One shared "account" so the texting
// demo and the trust dashboard stay in sync in a single running instance.
// (In production this is a per-user DB row.)

interface DB {
  guardrails: Guardrails;
  ledger: LedgerEntry[];
  mandates: PravaMandate[];
  receipts: Receipt[];
  monthSpent: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __POSY_DB__: DB | undefined;
}

function seed(): DB {
  return {
    guardrails: {
      perGiftCap: 150,
      monthlyCap: 500,
      requireApprovalOver: 75,
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
    monthSpent: 0,
  };
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
