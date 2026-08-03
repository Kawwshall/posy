"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Confetti } from "@/components/Confetti";
import { Mark, Swatch } from "@/components/Mark";
import { money } from "@/lib/money";
import {
  AgentState,
  ChatMessage,
  GiftProduct,
  LedgerEntry,
  OptionCard,
  PaymentApprovalCard as PaymentApprovalCardT,
  Receipt,
  ApprovalCard as ApprovalCardT,
  PravaMandate,
} from "@/lib/types";

const QUICK_STARTS = [
  "mum's birthday tomorrow. warm, useful, under ₹2,500",
  "my sister has had a rough week. something cozy around ₹2,000",
  "brother is a coffee nerd. keep it below ₹2,200",
  "anniversary next week. personal, not cheesy, under ₹3,000",
];

export default function DemoPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "Hey, it's Posy. Tell me who it's for, the occasion, and roughly what you'd spend. I'll take it from there.",
    },
  ]);
  const [state, setState] = useState<AgentState>({ brief: {} });
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [trace, setTrace] = useState<LedgerEntry[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [modes, setModes] = useState<{ prava: string; pravaEnvironment?: string; shopping?: string; openai: string; model: string }>();
  const [spend, setSpend] = useState<{ monthSpent: number; monthlyCap: number }>();
  const [celebrate, setCelebrate] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [tab, setTab] = useState<"ledger" | "activity">("ledger");
  const scrollRef = useRef<HTMLDivElement>(null);
  const sendingRef = useRef(false);

  const started = messages.length > 1;
  const lastUserIdx = (() => {
    for (let i = messages.length - 1; i >= 0; i--) if (messages[i].role === "user") return i;
    return -1;
  })();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  async function refreshTrace() {
    try {
      const r = await fetch("/api/state");
      const d = await r.json();
      setTrace(d.ledger || []);
      setReceipts(d.receipts || []);
      setModes(d.modes);
      setSpend({ monthSpent: d.monthSpent, monthlyCap: d.guardrails?.monthlyCap });
    } catch {}
  }

  useEffect(() => {
    refreshTrace();
  }, []);

  async function send(text: string) {
    const clean = text.trim();
    if (!clean || sendingRef.current) return;
    sendingRef.current = true;
    setInput("");
    const userMsg: ChatMessage = {
      id: "u_" + Math.random().toString(36).slice(2, 8),
      role: "user",
      text: clean,
    };
    setMessages((m) => [...m, userMsg]);
    setTyping(true);

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: clean, state }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Request failed");
      setState(data.state);
      const out: ChatMessage[] = data.messages || [];
      for (let i = 0; i < out.length; i++) {
        await new Promise((r) => setTimeout(r, i === 0 ? 550 : 700));
        setMessages((m) => [...m, out[i]]);
        if (out[i].rich?.kind === "receipt") {
          setCelebrate((c) => c + 1);
          refreshTrace();
        }
      }
    } catch (e) {
      setMessages((m) => [
        ...m,
        { id: "err", role: "assistant", text: "Connection hiccup, try again?" },
      ]);
    } finally {
      sendingRef.current = false;
      setTyping(false);
      refreshTrace();
    }
  }

  return (
    <main className="min-h-screen bg-paper">
      <Confetti trigger={celebrate} />

      {/* top bar */}
      <div className="topbar sticky top-0 z-30 border-b border-line">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2 px-5 py-3">
          <Link href="/" className="flex items-center gap-2">
            <Mark className="h-6 w-6" />
            <span className="font-display text-xl">Posy</span>
          </Link>
          <div className="flex items-center gap-2">
            <ModeBadge label="prava" mode={modes?.prava} extra={modes?.pravaEnvironment} />
            <ModeBadge label="catalog" mode={modes?.shopping} />
            <ModeBadge label="openai" mode={modes?.openai} extra={modes?.model} />
          </div>
        </div>
      </div>

      {/* centered phone */}
      <div className="mx-auto max-w-md px-5 py-10">
        <div className="phone overflow-hidden">
          <div className="bg-[#f2f2f7] pt-3">
            <div className="flex items-center justify-between px-6 text-xs font-medium text-black/70">
              <span>9:41</span>
              <span className="mono text-[11px]">Posy</span>
              <span>5G</span>
            </div>
            <div className="mt-2 flex flex-col items-center border-b border-black/5 pb-2">
              <div className="grid h-12 w-12 place-items-center rounded-full" style={{ background: "#F0DDCE" }}>
                <Mark className="h-7 w-7" bg="#F0DDCE" />
              </div>
              <div className="mt-1 text-sm font-semibold">Posy</div>
              <div className="text-[11px] text-black/40">a gifting concierge, not a search box</div>
            </div>
          </div>

          <div
            ref={scrollRef}
            aria-live="polite"
            className="imsg-scroll h-[440px] space-y-2 overflow-y-auto bg-[#f2f2f7] px-3 py-3"
          >
            {started && (
              <div className="py-1 text-center text-[10px] font-medium uppercase tracking-wide text-black/30">
                Posy · Today
              </div>
            )}
            {messages.map((m, i) => (
              <div key={m.id}>
                <MessageView m={m} onAction={send} disabled={typing || i < lastUserIdx} />
                {i === lastUserIdx && (
                  <div className="mt-0.5 pr-1 text-right text-[10px] font-medium text-black/35">
                    {typing || i === messages.length - 1 ? "Delivered" : "Read"}
                  </div>
                )}
              </div>
            ))}
            {typing && <TypingBubble />}
          </div>

          {!started && (
            <div className="space-y-1.5 bg-[#f2f2f7] px-3 pb-1">
              {QUICK_STARTS.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="w-full rounded-2xl border border-imsg-blue/30 bg-white px-3 py-2 text-left text-[12.5px] text-imsg-blue transition hover:bg-imsg-blue/5"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 bg-[#f2f2f7] px-3 pb-4 pt-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send(input)}
              placeholder="Tell Posy what happened…"
              className="flex-1 rounded-full border border-black/10 bg-white px-4 py-2 text-sm outline-none focus:border-imsg-blue"
            />
            <button
              onClick={() => send(input)}
              disabled={!input.trim() || typing}
              className="grid h-9 w-9 place-items-center rounded-full bg-imsg-blue text-white shadow-sm transition active:scale-90 disabled:opacity-40"
              aria-label="Send message"
            >
              ↑
            </button>
          </div>
        </div>

        <p className="mono mt-3 text-center text-[11px] text-muted">
          live OpenAI reasoning · real merchant products via Prava · sandbox payments
        </p>
      </div>

      {/* Records: a lock that sneaks in a drawer, not an always-on panel */}
      <RecordsButton
        open={drawerOpen}
        onClick={() => setDrawerOpen((v) => !v)}
        count={receipts.length}
      />
      <RecordsDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        tab={tab}
        setTab={setTab}
        trace={trace}
        receipts={receipts}
        spend={spend}
      />
    </main>
  );
}

/* ---------- Records: lock button + slide-in drawer ---------- */

function LockGlyph({ open, className = "h-4 w-4" }: { open?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.2" />
      {open ? (
        <path d="M8 10.5V7a4 4 0 0 1 7.5-1.9" />
      ) : (
        <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
      )}
      <circle cx="12" cy="15.3" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

function RecordsButton({ open, onClick, count }: { open: boolean; onClick: () => void; count: number }) {
  return (
    <button
      onClick={onClick}
      aria-label="Open records"
      className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full border border-line bg-ink px-4 py-2.5 text-sm font-medium text-paper shadow-phone transition hover:bg-black"
    >
      <LockGlyph open={open} />
      Records
      {count > 0 && (
        <span className="mono grid h-5 min-w-5 place-items-center rounded-full bg-claret px-1 text-[11px] text-white">
          {count}
        </span>
      )}
    </button>
  );
}

function RecordsDrawer({
  open,
  onClose,
  tab,
  setTab,
  trace,
  receipts,
  spend,
}: {
  open: boolean;
  onClose: () => void;
  tab: "ledger" | "activity";
  setTab: (t: "ledger" | "activity") => void;
  trace: LedgerEntry[];
  receipts: Receipt[];
  spend?: { monthSpent: number; monthlyCap: number };
}) {
  return (
    <>
      <div
        onClick={onClose}
        className={
          "fixed inset-0 z-40 bg-ink/20 transition-opacity duration-300 " +
          (open ? "opacity-100" : "pointer-events-none opacity-0")
        }
      />
      <aside
        className={
          "fixed right-0 top-0 z-50 flex h-full w-full max-w-[400px] flex-col border-l border-line bg-paper shadow-phone transition-transform duration-300 ease-out " +
          (open ? "translate-x-0" : "translate-x-full")
        }
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="flex items-center gap-2">
            <LockGlyph className="h-4 w-4 text-claret" />
            <span className="font-display text-lg">Your records</span>
          </div>
          <button onClick={onClose} aria-label="Close records" className="rounded-lg px-2 py-1 text-muted hover:bg-card">
            ✕
          </button>
        </div>

        <div className="flex gap-1 border-b border-line px-4 pt-3">
          <Tab active={tab === "ledger"} onClick={() => setTab("ledger")}>Money ledger</Tab>
          <Tab active={tab === "activity"} onClick={() => setTab("activity")}>Every action</Tab>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {tab === "ledger" ? (
            <LedgerView receipts={receipts} spend={spend} />
          ) : (
            <ActivityView trace={trace} />
          )}
        </div>

        <div className="border-t border-line px-5 py-3">
          <Link href="/dashboard" className="mono text-[12px] text-claret underline underline-offset-4">
            open the full dashboard →
          </Link>
        </div>
      </aside>
    </>
  );
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={
        "mono rounded-t-lg px-3 py-2 text-[11px] uppercase tracking-wide transition " +
        (active ? "border-b-2 border-claret text-ink" : "text-muted hover:text-ink")
      }
    >
      {children}
    </button>
  );
}

function LedgerView({ receipts, spend }: { receipts: Receipt[]; spend?: { monthSpent: number; monthlyCap: number } }) {
  return (
    <div>
      <div className="mb-4 rounded-lg border border-line bg-card p-4">
        <div className="mono text-[11px] uppercase tracking-[0.14em] text-muted">spent this month</div>
        <div className="mono mt-1 text-2xl font-medium text-ink">
          {money(spend?.monthSpent ?? 0)}
          <span className="text-sm text-muted"> / {money(spend?.monthlyCap ?? 0)}</span>
        </div>
      </div>
      {receipts.length === 0 ? (
        <Empty>No gifts sent yet. Every purchase shows up here: who it went to, and how much.</Empty>
      ) : (
        <div className="divide-y divide-line">
          {receipts.map((r) => (
            <div key={r.id} className="flex items-center gap-3 py-3">
              <Swatch title={r.product.title} category={r.product.category} className="h-10 w-10 text-base" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-ink">{r.product.title}</div>
                <div className="mono text-[11px] text-muted">
                  to {r.recipient || "someone"} · {new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · Visa ···· {r.card.last4}
                </div>
              </div>
              <div className="mono shrink-0 text-sm font-medium text-ink">{money(r.amount)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ActivityView({ trace }: { trace: LedgerEntry[] }) {
  if (trace.length === 0) return <Empty>Nothing yet. Ask Posy and every step it takes shows up here.</Empty>;
  return (
    <div>
      {trace.map((e) => (
        <div key={e.id} className="border-l-2 border-claret/25 py-2.5 pl-4">
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate text-sm font-medium text-ink">{e.title}</span>
            {e.amount != null && <span className="mono shrink-0 text-xs text-claret">{money(e.amount)}</span>}
          </div>
          {e.detail && <p className="mt-0.5 text-xs leading-snug text-muted">{e.detail}</p>}
          <div className="mono mt-1 text-[10px] uppercase tracking-[0.1em] text-muted/60">
            {e.kind.replace(/_/g, " ")} · {new Date(e.ts).toLocaleTimeString()}
          </div>
        </div>
      ))}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-dashed border-line p-6 text-center text-sm leading-relaxed text-muted">{children}</div>;
}

/* ---------- chat + rich cards ---------- */

function ModeBadge({ label, mode, extra }: { label: string; mode?: string; extra?: string }) {
  const live = mode === "live";
  return (
    <span
      className="mono flex items-center gap-1.5 rounded-md border border-line bg-card px-2 py-1 text-[10px] uppercase tracking-wide text-muted"
      title={live ? "Live API key detected" : "Running high-fidelity mock. Add a key to go live."}
    >
      <span className={"h-1.5 w-1.5 rounded-full " + (live ? "bg-stem" : "bg-claret/50")} />
      {label} {mode || "…"}
      {extra && live ? ` ${extra}` : ""}
    </span>
  );
}

function TypingBubble() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-white px-4 py-3 shadow-sm">
        <span className="tick h-2 w-2 rounded-full bg-black/30" style={{ animationDelay: "0ms" }} />
        <span className="tick h-2 w-2 rounded-full bg-black/30" style={{ animationDelay: "200ms" }} />
        <span className="tick h-2 w-2 rounded-full bg-black/30" style={{ animationDelay: "400ms" }} />
      </div>
    </div>
  );
}

function MessageView({ m, onAction, disabled }: { m: ChatMessage; onAction: (t: string) => void; disabled: boolean }) {
  if (m.rich) {
    if (m.rich.kind === "options") return <OptionsCard data={m.rich.data} onAction={onAction} disabled={disabled} />;
    if (m.rich.kind === "approval") return <ApprovalCard data={m.rich.data} onAction={onAction} disabled={disabled} />;
    if (m.rich.kind === "payment") return <PaymentApprovalCard data={m.rich.data} onAction={onAction} disabled={disabled} />;
    if (m.rich.kind === "receipt") return <ReceiptCard data={m.rich.data} />;
    if (m.rich.kind === "mandate") return <MandateCard data={m.rich.data} />;
  }
  const me = m.role === "user";
  return (
    <div className={me ? "flex justify-end" : "flex justify-start"}>
      <div
        className={
          "max-w-[82%] animate-bubble-in whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-[14px] leading-snug shadow-sm " +
          (me ? "rounded-br-md bg-imsg-blue text-white" : "rounded-bl-md bg-white text-ink")
        }
      >
        {m.text}
      </div>
    </div>
  );
}

function PaymentApprovalCard({ data, onAction, disabled }: { data: PaymentApprovalCardT; onAction: (t: string) => void; disabled: boolean }) {
  const mock = data.mode === "mock";
  return (
    <div className="flex justify-start">
      <div className="w-[86%] animate-bubble-in rounded-2xl rounded-bl-md border border-line bg-card p-3 shadow-soft">
        <div className="mono mb-1 text-[10px] uppercase tracking-[0.12em] text-claret">Prava secure approval</div>
        <div className="text-[13px] font-semibold text-ink">{data.product.title}</div>
        <div className="mt-1 text-[11px] leading-snug text-muted">
          {mock
            ? "Mock mode: simulate the approval to continue the offline demo."
            : "Open Prava, enter the sandbox test card below, complete OTP and passkey, then check status. Or settle in-sandbox for the demo."}
        </div>

        {!mock && (
          <div className="mono mt-2 rounded-lg border border-line bg-paper px-3 py-2 text-[11px] leading-relaxed text-ink">
            <div className="mb-1 text-[9px] uppercase tracking-[0.14em] text-claret">Prava sandbox test card</div>
            <div>card 4622 9431 2313 7789</div>
            <div>exp 12/27 · cvv 757 · otp 456789</div>
          </div>
        )}

        <div className="mt-3 flex flex-col gap-2">
          {!mock && (
            <a
              href={data.approvalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-claret py-2 text-center text-[13px] font-semibold text-white transition hover:bg-claret-700"
            >
              Open secure Prava checkout ↗
            </a>
          )}
          <button
            type="button"
            onClick={() => onAction(mock ? "payment done" : "I've approved with Prava")}
            disabled={disabled}
            className="rounded-lg border border-line py-2 text-[13px] font-medium text-ink hover:bg-paper disabled:cursor-default disabled:opacity-50"
          >
            {mock ? "Simulate approval" : "I’ve approved, check status"}
          </button>
          {!mock && (
            <button
              type="button"
              onClick={() => onAction("simulate sandbox settlement")}
              disabled={disabled}
              className="rounded-lg border border-line py-2 text-[13px] font-medium text-ink hover:bg-paper disabled:cursor-default disabled:opacity-50"
            >
              Complete sandbox checkout (demo)
            </button>
          )}
          <button
            type="button"
            onClick={() => onAction("cancel payment")}
            disabled={disabled}
            className="text-[11px] text-muted underline-offset-2 hover:underline disabled:opacity-50"
          >
            Cancel payment
          </button>
        </div>
        <p className="mono mt-2 text-center text-[9px] text-muted/70">session {data.sessionId.slice(-10)} · expires {new Date(data.expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
      </div>
    </div>
  );
}

function ProductRow({ p, recommended }: { p: GiftProduct; recommended?: boolean }) {
  return (
    <div className={"flex gap-3 rounded-lg border p-2.5 " + (recommended ? "border-claret/30 bg-posy-50" : "border-line bg-card")}>
      {p.imageUrl ? (
        <img src={p.imageUrl} alt="" className="h-12 w-12 shrink-0 rounded-lg border border-line object-cover" />
      ) : (
        <Swatch title={p.title} category={p.category} />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[13px] font-semibold text-ink">{p.title}</span>
          {recommended && <span className="mono shrink-0 rounded bg-claret px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-white">pick</span>}
        </div>
        <div className="text-[11px] text-muted">
          {p.merchant}
          {p.rating > 0 ? ` · ★${p.rating}` : ""}
          {" · shipping at checkout"}
        </div>
      </div>
      <div className="mono shrink-0 self-center text-[13px] font-medium text-ink">{money(p.price)}</div>
    </div>
  );
}

function OptionsCard({ data, onAction, disabled }: { data: OptionCard; onAction: (t: string) => void; disabled: boolean }) {
  return (
    <div className="flex justify-start">
      <div className="w-[86%] animate-bubble-in space-y-2 rounded-2xl rounded-bl-md border border-line bg-card p-2.5 shadow-soft">
        {data.products.map((p, index) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onAction(`option ${index + 1}`)}
            disabled={disabled}
            className="block w-full rounded-lg text-left transition hover:ring-2 hover:ring-claret/20 disabled:cursor-default disabled:opacity-70 disabled:hover:ring-0"
            aria-label={`Choose option ${index + 1}: ${p.title}`}
          >
            <ProductRow p={p} recommended={p.id === data.recommendedId} />
          </button>
        ))}
        <p className="px-1 pt-0.5 text-[10px] text-muted">Tap any option to choose it.</p>
      </div>
    </div>
  );
}

function ApprovalCard({ data, onAction, disabled }: { data: ApprovalCardT; onAction: (t: string) => void; disabled: boolean }) {
  const blocked = !data.guardrail.allowed;
  return (
    <div className="flex justify-start">
      <div className="w-[86%] animate-bubble-in rounded-2xl rounded-bl-md border border-line bg-card p-3 shadow-soft">
        <div className="mono mb-2 text-[10px] uppercase tracking-[0.12em] text-claret">spend check</div>
        <ul className="mb-2 space-y-1">
          {data.guardrail.reasons.map((r, i) => (
            <li key={i} className={"flex gap-1.5 text-[12px] leading-snug " + (blocked ? "text-red-700" : "text-ink/70")}>
              <span className={blocked ? "text-red-600" : "text-stem"}>{blocked ? "✕" : "✓"}</span> {r}
            </li>
          ))}
        </ul>
        {!blocked && (
          <div className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: "#F0DDCE80" }}>
            <span className="text-[13px] text-ink">
              Send <b>{data.product.title}</b>
            </span>
            <span className="mono text-[13px] font-medium text-ink">{money(data.amount)}</span>
          </div>
        )}
        {!blocked ? (
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => onAction("send it")}
              disabled={disabled}
              className="flex-1 rounded-lg bg-claret py-2 text-[13px] font-semibold text-white transition hover:bg-claret-700 active:scale-[0.98] disabled:cursor-default disabled:opacity-50"
            >
              Approve &amp; send
            </button>
            <button
              onClick={() => onAction("not now")}
              disabled={disabled}
              className="rounded-lg border border-line px-3 py-2 text-[13px] font-medium text-muted hover:bg-paper disabled:cursor-default disabled:opacity-50"
            >
              Not now
            </button>
          </div>
        ) : (
          <button
            onClick={() => onAction("find something cheaper")}
            disabled={disabled}
            className="mt-2 w-full rounded-lg border border-line py-2 text-[13px] font-medium text-ink hover:bg-paper disabled:cursor-default disabled:opacity-50"
          >
            Find something in budget →
          </button>
        )}
        <p className="mono mt-2 text-center text-[10px] text-muted/70">
          approval issues a single-use Visa token via Prava
        </p>
      </div>
    </div>
  );
}

function ReceiptCard({ data }: { data: Receipt }) {
  const sandbox = data.environment === "sandbox" || data.environment === "mock";
  return (
    <div className="flex justify-start">
      <div className="w-[86%] animate-bubble-in overflow-hidden rounded-2xl rounded-bl-md border border-line bg-card shadow-soft">
        <div className="flex items-center justify-between bg-claret px-4 py-2.5 text-white">
          <span className="flex items-center gap-1.5 text-[13px] font-semibold">
            <Mark className="h-3.5 w-3.5" color="#F4EEE1" bg="#8E2C3F" /> {sandbox ? "Sandbox checkout" : "Gift sent"}
          </span>
          <span className="mono text-[11px] opacity-90">{data.orderRef}</span>
        </div>
        <div className="space-y-2 p-3">
          <ProductRow p={data.product} />
          <div className="grid grid-cols-2 gap-2 text-[12px]">
            <Info k="recipient" v={data.recipient || "someone"} />
            <Info k={sandbox ? "demo ETA" : "arrives"} v={data.eta} />
            <Info k="paid with" v={`Visa ···· ${data.card.last4}`} mono />
            <Info k="total" v={money(data.amount)} mono />
          </div>
          <div className="rounded-lg px-3 py-2 text-[11px] leading-snug text-stem" style={{ background: "#E7EFE7" }}>
            {sandbox ? "Prava sandbox authorization. No real money moved and no retail order was placed." : "One-time Visa token. The merchant never sees a reusable card number."}
            Full record in{" "}
            <Link href="/dashboard" className="underline">the ledger</Link>.
          </div>
        </div>
      </div>
    </div>
  );
}

function MandateCard({ data }: { data: PravaMandate }) {
  return (
    <div className="flex justify-start">
      <div className="w-[86%] animate-bubble-in rounded-2xl rounded-bl-md border border-line bg-card p-3 shadow-soft">
        <div className="mono mb-1 text-[10px] uppercase tracking-[0.12em] text-claret">recurring gift set</div>
        <div className="text-[13px] font-medium text-ink">{data.label}</div>
        <div className="mono mt-1.5 grid grid-cols-2 gap-1.5 text-[11px] text-muted">
          <span>cap {money(data.cap)}/charge</span>
          <span>{data.recurring_frequency}</span>
          <span>scope: {data.merchant_scope}</span>
          <span>max {data.max_charges} charges</span>
        </div>
        <p className="mt-2 text-[10px] text-muted/70">Pause or cancel anytime from the dashboard.</p>
      </div>
    </div>
  );
}

function Info({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="rounded-lg bg-black/[0.03] px-2.5 py-1.5">
      <div className="mono text-[10px] uppercase tracking-wide text-muted/70">{k}</div>
      <div className={(mono ? "mono " : "") + "font-medium text-ink"}>{v}</div>
    </div>
  );
}
