"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
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
  "Get my mom something nice for her birthday, under $60, by Friday 🎂",
  "Cozy gift for my sister, around $50",
  "My brother's into coffee and tech — surprise him, max $80",
  "Anniversary gift for my wife, something romantic ~$70",
];

const KIND_ICON: Record<string, string> = {
  brief_parsed: "📝",
  search: "🔎",
  curation: "✨",
  guardrail_check: "🛡️",
  approval_requested: "⏳",
  approved: "👍",
  session_created: "🔗",
  card_issued: "💳",
  charged: "💸",
  receipt: "🎁",
  mandate_created: "🔁",
  mandate_charged: "🔁",
  declined: "🚫",
  error: "⚠️",
};

export default function DemoPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "Hi! I'm Posy 🌸 Tell me who you're shopping for, the occasion, and a budget — I'll find the perfect gift and handle the whole thing.",
    },
  ]);
  const [state, setState] = useState<AgentState>({ brief: {} });
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [trace, setTrace] = useState<LedgerEntry[]>([]);
  const [modes, setModes] = useState<{ prava: string; openai: string; model: string }>();
  const [spend, setSpend] = useState<{ monthSpent: number; monthlyCap: number }>();
  const scrollRef = useRef<HTMLDivElement>(null);

  const started = messages.length > 1;

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
    <main className="min-h-screen bg-gradient-to-b from-posy-50 to-white">
      {/* top bar */}
      <div className="glass sticky top-0 z-40 border-b border-black/5">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-posy-600 text-white">🌸</span>
            Posy
          </Link>
          <div className="flex items-center gap-2 text-xs">
            <ModeBadge label="Prava" mode={modes?.prava} />
            <ModeBadge label="OpenAI" mode={modes?.openai} extra={modes?.model} />
            <Link href="/dashboard" className="rounded-lg border border-black/10 bg-white px-3 py-1.5 font-medium hover:bg-black/5">
              Trust dashboard →
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
                <span>Posy 🌸</span>
                <span>5G</span>
              </div>
              <div className="mt-2 flex flex-col items-center border-b border-black/5 pb-2">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-posy-500 text-2xl text-white">🌸</div>
                <div className="mt-1 text-sm font-semibold">Posy</div>
                <div className="text-[11px] text-black/40">Gifting concierge · iMessage</div>
              </div>
            </div>

            {/* messages */}
            <div ref={scrollRef} className="imsg-scroll h-[460px] space-y-2 overflow-y-auto bg-[#f2f2f7] px-3 py-3">
              {messages.map((m) => (
                <MessageView key={m.id} m={m} onAction={send} />
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
                className="grid h-9 w-9 place-items-center rounded-full bg-imsg-blue text-white disabled:opacity-40"
                aria-label="Send"
              >
                ↑
              </button>
            </div>
          </div>
        </div>

        {/* Live agent trace */}
        <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight">Live agent trace</h2>
            {spend && (
              <span className="text-xs text-black/50">
                Month: <b className="text-black/80">${spend.monthSpent}</b> / ${spend.monthlyCap}
              </span>
            )}
          </div>
          <p className="mb-4 text-sm text-black/50">
            Everything the agent does — reasoning, guardrail checks, the Prava
            session, the one-time Visa token — is recorded here in real time.
          </p>

          {spend && (
            <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-black/5">
              <div
                className="h-full rounded-full bg-posy-500 transition-all"
                style={{ width: `${Math.min(100, (spend.monthSpent / (spend.monthlyCap || 1)) * 100)}%` }}
              />
            </div>
          )}

          <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
            {trace.length === 0 && (
              <div className="rounded-xl border border-dashed border-black/10 p-6 text-center text-sm text-black/40">
                Send Posy a message to watch the agent act.
              </div>
            )}
            {trace.map((e) => (
              <div key={e.id} className="flex gap-3 rounded-xl border border-black/5 bg-black/[0.015] p-3 animate-fade-up">
                <div className="text-lg leading-none">{KIND_ICON[e.kind] || "•"}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">{e.title}</span>
                    {e.amount != null && (
                      <span className="shrink-0 text-xs font-semibold text-posy-700">${e.amount}</span>
                    )}
                  </div>
                  {e.detail && <p className="mt-0.5 text-xs leading-snug text-black/55">{e.detail}</p>}
                  <div className="mt-1 text-[10px] uppercase tracking-wide text-black/30">
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
      className={
        "rounded-full px-2.5 py-1 font-medium " +
        (live ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")
      }
      title={live ? "Live API key detected" : "Running high-fidelity mock — add a key to go live"}
    >
      {label}: {mode || "…"}
      {extra && live ? ` (${extra})` : ""}
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
          (me ? "rounded-br-md bg-imsg-blue text-white" : "rounded-bl-md bg-white text-black")
        }
      >
        {m.text}
      </div>
    </div>
  );
}

function ProductRow({ p, recommended }: { p: GiftProduct; recommended?: boolean }) {
  return (
    <div className={"flex gap-3 rounded-xl border p-2.5 " + (recommended ? "border-posy-300 bg-posy-50" : "border-black/5 bg-white")}>
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-black/[0.03] text-2xl">{p.emoji}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[13px] font-semibold">{p.title}</span>
          {recommended && <span className="shrink-0 rounded-full bg-posy-600 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">Top pick</span>}
        </div>
        <div className="text-[11px] text-black/50">{p.merchant} · ⭐ {p.rating} · {p.deliveryDays}-day</div>
      </div>
      <div className="shrink-0 text-[13px] font-bold text-black/80">${p.price}</div>
    </div>
  );
}

function OptionsCard({ data }: { data: OptionCard }) {
  return (
    <div className="flex justify-start">
      <div className="w-[86%] animate-bubble-in space-y-2 rounded-2xl rounded-bl-md bg-white p-2.5 shadow-sm">
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
      <div className="w-[86%] animate-bubble-in rounded-2xl rounded-bl-md bg-white p-3 shadow-sm ring-1 ring-black/5">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-lg">🛡️</span>
          <span className="text-[13px] font-semibold">Spend check</span>
        </div>
        <ul className="mb-2 space-y-1">
          {data.guardrail.reasons.map((r, i) => (
            <li key={i} className={"text-[12px] leading-snug " + (blocked ? "text-red-600" : "text-black/60")}>
              {blocked ? "🚫" : "✅"} {r}
            </li>
          ))}
        </ul>
        {!blocked && (
          <div className="flex items-center justify-between rounded-xl bg-black/[0.03] px-3 py-2">
            <span className="text-[13px]">
              Send <b>{data.product.title}</b> — <b>${data.amount}</b>
            </span>
          </div>
        )}
        {!blocked ? (
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => onAction("send it")}
              className="flex-1 rounded-xl bg-imsg-blue py-2 text-[13px] font-semibold text-white hover:brightness-95"
            >
              🔐 Approve &amp; send
            </button>
            <button
              onClick={() => onAction("not now")}
              className="rounded-xl border border-black/10 px-3 py-2 text-[13px] font-medium text-black/60 hover:bg-black/5"
            >
              Not now
            </button>
          </div>
        ) : (
          <button
            onClick={() => onAction("find something cheaper")}
            className="mt-2 w-full rounded-xl border border-black/10 py-2 text-[13px] font-medium text-black/70 hover:bg-black/5"
          >
            Find something in budget →
          </button>
        )}
        <p className="mt-2 text-center text-[10px] text-black/35">
          Approval mints a single-use Visa network token via Prava
        </p>
      </div>
    </div>
  );
}

function ReceiptCard({ data, onAction }: { data: Receipt; onAction: (t: string) => void }) {
  return (
    <div className="flex justify-start">
      <div className="w-[86%] animate-bubble-in overflow-hidden rounded-2xl rounded-bl-md bg-white shadow-sm ring-1 ring-black/5">
        <div className="bg-gradient-to-r from-posy-600 to-posy-400 px-4 py-2.5 text-white">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold">🎁 Gift sent</span>
            <span className="text-[11px] opacity-90">{data.orderRef}</span>
          </div>
        </div>
        <div className="space-y-2 p-3">
          <ProductRow p={data.product} />
          <div className="grid grid-cols-2 gap-2 text-[12px]">
            <Info k="Recipient" v={data.recipient || "—"} />
            <Info k="Arrives" v={data.eta} />
            <Info k="Paid with" v={`${data.card.brand} •••• ${data.card.last4}`} />
            <Info k="Total" v={`$${data.amount}`} />
          </div>
          <div className="rounded-lg bg-emerald-50 px-3 py-2 text-[11px] leading-snug text-emerald-800">
            🔒 Paid with a one-time Visa network token — the merchant never sees a
            reusable card number. Full record in your{" "}
            <Link href="/dashboard" className="underline">trust dashboard</Link>.
          </div>
        </div>
      </div>
    </div>
  );
}

function MandateCard({ data }: { data: PravaMandate }) {
  return (
    <div className="flex justify-start">
      <div className="w-[86%] animate-bubble-in rounded-2xl rounded-bl-md bg-white p-3 shadow-sm ring-1 ring-black/5">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-lg">🔁</span>
          <span className="text-[13px] font-semibold">Recurring gift set</span>
        </div>
        <div className="text-[13px] font-medium">{data.label}</div>
        <div className="mt-1 grid grid-cols-2 gap-1.5 text-[11px] text-black/55">
          <span>Cap: ${data.cap}/charge</span>
          <span>Frequency: {data.recurring_frequency}</span>
          <span>Merchant scope: {data.merchant_scope}</span>
          <span>Max charges: {data.max_charges}</span>
        </div>
        <p className="mt-2 text-[10px] text-black/35">Pausable & cancellable anytime from your dashboard.</p>
      </div>
    </div>
  );
}

function Info({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-lg bg-black/[0.03] px-2.5 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-black/40">{k}</div>
      <div className="font-medium text-black/80">{v}</div>
    </div>
  );
}
