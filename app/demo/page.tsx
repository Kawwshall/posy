"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Confetti } from "@/components/Confetti";
import { Mark } from "@/components/Mark";
import {
  AgentState,
  ChatMessage,
  GiftProduct,
  LedgerEntry,
  OptionCard,
  Receipt,
  ApprovalCard as ApprovalCardT,
  PravaMandate,
} from "@/lib/types";

const QUICK_STARTS = [
  "something for my mom's birthday, under $60, by Friday",
  "cozy gift for my sister, around $50",
  "my brother's into coffee and tech — surprise him, max $80",
  "anniversary gift for my wife, something romantic ~$70",
];

export default function DemoPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "Hey — it's Posy. Tell me who it's for, the occasion, and roughly what you'd spend. I'll take it from there.",
    },
  ]);
  const [state, setState] = useState<AgentState>({ brief: {} });
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [trace, setTrace] = useState<LedgerEntry[]>([]);
  const [modes, setModes] = useState<{ prava: string; openai: string; model: string }>();
  const [spend, setSpend] = useState<{ monthSpent: number; monthlyCap: number }>();
  const [celebrate, setCelebrate] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

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
      setModes(d.modes);
      setSpend({ monthSpent: d.monthSpent, monthlyCap: d.guardrails?.monthlyCap });
    } catch {}
  }

  useEffect(() => {
    refreshTrace();
  }, []);

  async function send(text: string) {
    const clean = text.trim();
    if (!clean || typing) return;
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
      setState(data.state);
      // Stagger assistant messages for a natural texting cadence.
      const out: ChatMessage[] = data.messages || [];
      for (let i = 0; i < out.length; i++) {
        await new Promise((r) => setTimeout(r, i === 0 ? 550 : 700));
        setMessages((m) => [...m, out[i]]);
        if (out[i].rich?.kind === "receipt") setCelebrate((c) => c + 1);
      }
    } catch (e) {
      setMessages((m) => [
        ...m,
        { id: "err", role: "assistant", text: "Connection hiccup — try again?" },
      ]);
    } finally {
      setTyping(false);
      refreshTrace();
    }
  }

  return (
    <main className="min-h-screen bg-paper">
      <Confetti trigger={celebrate} />
      {/* top bar */}
      <div className="topbar sticky top-0 z-40 border-b border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-5 py-3">
          <Link href="/" className="flex items-center gap-2">
            <Mark className="h-6 w-6" />
            <span className="font-display text-xl">Posy</span>
          </Link>
          <div className="flex items-center gap-2 text-xs">
            <ModeBadge label="prava" mode={modes?.prava} />
            <ModeBadge label="openai" mode={modes?.openai} extra={modes?.model} />
            <Link href="/dashboard" className="rounded-lg border border-line bg-card px-3 py-1.5 font-medium text-ink hover:bg-paper">
              How the money works →
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-6 px-5 py-8 lg:grid-cols-[400px_1fr]">
        {/* Phone */}
        <div>
          <div className="phone mx-auto max-w-[390px] overflow-hidden">
            {/* status bar + contact */}
            <div className="bg-[#f2f2f7] pt-3">
              <div className="flex items-center justify-between px-6 text-xs font-medium text-black/70">
                <span>9:41</span>
                <span className="mono text-[11px]">Posy</span>
                <span>5G</span>
              </div>
              <div className="mt-2 flex flex-col items-center border-b border-black/5 pb-2">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-blush" style={{ background: "#F0DDCE" }}>
                  <Mark className="h-7 w-7" />
                </div>
                <div className="mt-1 text-sm font-semibold">Posy</div>
                <div className="text-[11px] text-black/40">gifting concierge · iMessage</div>
              </div>
            </div>

            {/* messages */}
            <div
              ref={scrollRef}
              aria-live="polite"
              className="imsg-scroll h-[460px] space-y-2 overflow-y-auto bg-[#f2f2f7] px-3 py-3"
            >
              {started && (
                <div className="py-1 text-center text-[10px] font-medium uppercase tracking-wide text-black/30">
                  iMessage · Today
                </div>
              )}
              {messages.map((m, i) => (
                <div key={m.id}>
                  <MessageView m={m} onAction={send} />
                  {i === lastUserIdx && (
                    <div className="mt-0.5 pr-1 text-right text-[10px] font-medium text-black/35">
                      {typing || i === messages.length - 1 ? "Delivered" : "Read"}
                    </div>
                  )}
                </div>
              ))}
              {typing && <TypingBubble />}
            </div>

            {/* quick starts */}
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

            {/* input */}
            <div className="flex items-center gap-2 bg-[#f2f2f7] px-3 pb-4 pt-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send(input)}
                placeholder="Text Posy…"
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
            secured by Prava · every gift paid with a one-time Visa token
          </p>
        </div>

        {/* Live agent trace */}
        <div className="paper-card p-6 shadow-soft">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="font-display text-xl">Posy shows its work</h2>
            {spend && (
              <span className="mono text-xs text-muted">
                <b className="text-ink">${spend.monthSpent}</b> / ${spend.monthlyCap} this month
              </span>
            )}
          </div>
          <p className="mb-4 text-sm text-muted">
            Every search, every rule it checked, every dollar it moved — written
            down as it happens.
          </p>

          {spend && (
            <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-claret transition-all"
                style={{ width: `${Math.min(100, (spend.monthSpent / (spend.monthlyCap || 1)) * 100)}%` }}
              />
            </div>
          )}

          <div className="max-h-[520px] space-y-px overflow-y-auto">
            {trace.length === 0 && (
              <div className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">
                Text Posy and watch it work.
              </div>
            )}
            {trace.map((e) => (
              <div key={e.id} className="flex gap-3 border-l-2 border-claret/25 py-2.5 pl-4 animate-fade-up">
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-medium text-ink">{e.title}</span>
                    {e.amount != null && (
                      <span className="mono shrink-0 text-xs text-claret">${e.amount.toFixed(2)}</span>
                    )}
                  </div>
                  {e.detail && <p className="mt-0.5 text-xs leading-snug text-muted">{e.detail}</p>}
                  <div className="mono mt-1 text-[10px] uppercase tracking-[0.1em] text-muted/60">
                    {e.kind.replace(/_/g, " ")} · {new Date(e.ts).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

function ModeBadge({ label, mode, extra }: { label: string; mode?: string; extra?: string }) {
  const live = mode === "live";
  return (
    <span
      className="mono flex items-center gap-1.5 rounded-md border border-line bg-card px-2 py-1 text-[10px] uppercase tracking-wide text-muted"
      title={live ? "Live API key detected" : "Running high-fidelity mock — add a key to go live"}
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

function MessageView({ m, onAction }: { m: ChatMessage; onAction: (t: string) => void }) {
  if (m.rich) {
    if (m.rich.kind === "options") return <OptionsCard data={m.rich.data} />;
    if (m.rich.kind === "approval") return <ApprovalCard data={m.rich.data} onAction={onAction} />;
    if (m.rich.kind === "receipt") return <ReceiptCard data={m.rich.data} onAction={onAction} />;
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

function ProductRow({ p, recommended }: { p: GiftProduct; recommended?: boolean }) {
  return (
    <div className={"flex gap-3 rounded-lg border p-2.5 " + (recommended ? "border-claret/30 bg-posy-50" : "border-line bg-card")}>
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-black/[0.03] text-2xl">{p.emoji}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[13px] font-semibold text-ink">{p.title}</span>
          {recommended && <span className="mono shrink-0 rounded bg-claret px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-white">pick</span>}
        </div>
        <div className="text-[11px] text-muted">{p.merchant} · ★{p.rating} · {p.deliveryDays}-day</div>
      </div>
      <div className="mono shrink-0 self-center text-[13px] font-medium text-ink">${p.price}</div>
    </div>
  );
}

function OptionsCard({ data }: { data: OptionCard }) {
  return (
    <div className="flex justify-start">
      <div className="w-[86%] animate-bubble-in space-y-2 rounded-2xl rounded-bl-md border border-line bg-card p-2.5 shadow-soft">
        {data.products.map((p) => (
          <ProductRow key={p.id} p={p} recommended={p.id === data.recommendedId} />
        ))}
      </div>
    </div>
  );
}

function ApprovalCard({ data, onAction }: { data: ApprovalCardT; onAction: (t: string) => void }) {
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
          <div className="flex items-center justify-between rounded-lg bg-blush/60 px-3 py-2" style={{ background: "#F0DDCE80" }}>
            <span className="text-[13px] text-ink">
              Send <b>{data.product.title}</b>
            </span>
            <span className="mono text-[13px] font-medium text-ink">${data.amount}</span>
          </div>
        )}
        {!blocked ? (
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => onAction("send it")}
              className="flex-1 rounded-lg bg-claret py-2 text-[13px] font-semibold text-white transition hover:bg-claret-700 active:scale-[0.98]"
            >
              Approve &amp; send
            </button>
            <button
              onClick={() => onAction("not now")}
              className="rounded-lg border border-line px-3 py-2 text-[13px] font-medium text-muted hover:bg-paper"
            >
              Not now
            </button>
          </div>
        ) : (
          <button
            onClick={() => onAction("find something cheaper")}
            className="mt-2 w-full rounded-lg border border-line py-2 text-[13px] font-medium text-ink hover:bg-paper"
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

function ReceiptCard({ data, onAction }: { data: Receipt; onAction: (t: string) => void }) {
  return (
    <div className="flex justify-start">
      <div className="w-[86%] animate-bubble-in overflow-hidden rounded-2xl rounded-bl-md border border-line bg-card shadow-soft">
        <div className="flex items-center justify-between bg-claret px-4 py-2.5 text-white">
          <span className="flex items-center gap-1.5 text-[13px] font-semibold">
            <Mark className="h-3.5 w-3.5" color="#F4EEE1" /> Gift sent
          </span>
          <span className="mono text-[11px] opacity-90">{data.orderRef}</span>
        </div>
        <div className="space-y-2 p-3">
          <ProductRow p={data.product} />
          <div className="grid grid-cols-2 gap-2 text-[12px]">
            <Info k="recipient" v={data.recipient || "—"} />
            <Info k="arrives" v={data.eta} />
            <Info k="paid with" v={`Visa ···· ${data.card.last4}`} mono />
            <Info k="total" v={`$${data.amount}`} mono />
          </div>
          <div className="rounded-lg px-3 py-2 text-[11px] leading-snug text-stem" style={{ background: "#E7EFE7" }}>
            One-time Visa token — the merchant never sees a reusable card number.
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
          <span>cap ${data.cap}/charge</span>
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
