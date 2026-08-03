// Durable key-value state for the text channel. Cloudflare runs each webhook
// in a fresh, stateless isolate, so in-memory conversation state is lost
// between messages. This persists per-user conversation state and pending
// payments in Cloudflare KV. Falls back to an in-memory map for local dev.

type KVLike = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
};

const mem = new Map<string, { v: string; exp?: number }>();
const memKV: KVLike = {
  async get(k) {
    const e = mem.get(k);
    if (!e) return null;
    if (e.exp && Date.now() > e.exp) {
      mem.delete(k);
      return null;
    }
    return e.v;
  },
  async put(k, v, opts) {
    mem.set(k, { v, exp: opts?.expirationTtl ? Date.now() + opts.expirationTtl * 1000 : undefined });
  },
  async delete(k) {
    mem.delete(k);
  },
};

let cached: KVLike | null | undefined;
async function binding(): Promise<KVLike | null> {
  if (cached !== undefined) return cached;
  try {
    // cloudflare:workers is a runtime-only module in the Workers isolate.
    // @ts-ignore - not resolvable outside the Cloudflare runtime
    const mod: any = await import(/* @vite-ignore */ "cloudflare:workers");
    cached = (mod?.env?.POSY_KV as KVLike) ?? null;
  } catch {
    cached = null;
  }
  return cached;
}

async function kv(): Promise<KVLike> {
  return (await binding()) ?? memKV;
}

const TTL = 60 * 60 * 24; // one day

export async function kvGet<T>(key: string): Promise<T | null> {
  const s = await (await kv()).get(key);
  if (!s) return null;
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

export async function kvPut(key: string, value: unknown): Promise<void> {
  await (await kv()).put(key, JSON.stringify(value), { expirationTtl: TTL });
}

export async function kvDel(key: string): Promise<void> {
  await (await kv()).delete(key);
}

export async function kvMode(): Promise<"kv" | "memory"> {
  return (await binding()) ? "kv" : "memory";
}

// ---- higher level helpers (import lazily to avoid load-order issues) ----

import type { AgentState } from "./types";
import { db } from "./store";
import type { PendingPayment } from "./types";

export async function loadConversation(phone: string): Promise<AgentState> {
  return (await kvGet<AgentState>(`conv:${phone}`)) ?? { brief: {} };
}

export async function saveConversation(phone: string, state: AgentState): Promise<void> {
  await kvPut(`conv:${phone}`, state);
}

export async function clearConversationKV(phone: string): Promise<void> {
  await kvDel(`conv:${phone}`);
}

// Load the pending payment referenced by state into the in-memory db so the
// synchronous orchestrator can see it. Call before runTurn.
export async function hydratePending(state: AgentState): Promise<void> {
  const id = state.pendingPaymentId;
  if (!id) return;
  const p = await kvGet<PendingPayment>(`pay:${id}`);
  if (p) db().pendingPayments[id] = p;
}

// Persist pending-payment changes after runTurn: save a new one, delete a
// consumed one.
export async function persistPending(prevId: string | undefined, nextState: AgentState): Promise<void> {
  const nextId = nextState.pendingPaymentId;
  if (nextId && db().pendingPayments[nextId]) {
    await kvPut(`pay:${nextId}`, db().pendingPayments[nextId]);
  }
  if (prevId && prevId !== nextId) {
    await kvDel(`pay:${prevId}`);
  }
}
