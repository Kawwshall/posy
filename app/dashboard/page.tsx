"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Guardrails, LedgerEntry, PravaMandate, Receipt } from "@/lib/types";

interface StateResp {
  guardrails: Guardrails;
  ledger: LedgerEntry[];
  mandates: PravaMandate[];
  receipts: Receipt[];
  monthSpent: number;
  modes: { prava: string; openai: string; model: string };
}

const KIND_ICON: Record<string, string> = {
  brief_parsed: "📝", search: "🔎", curation: "✨", guardrail_check: "🛡️",
  approval_requested: "⏳", approved: "👍", session_created: "🔗", card_issued: "💳",
  charged: "💸", receipt: "🎁", mandate_created: "🔁", mandate_charged: "🔁",
  declined: "🚫", error: "⚠️",
};

export default function Dashboard() {
  const [d, setD] = useState<StateResp>();

  async function load() {
    const r = await fetch("/api/state");
    setD(await r.json());
  }
  useEffect(() => {
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, []);

  async function saveGuardrail(patch: Partial<Guardrails>) {
    await fetch("/api/guardrails", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    load();
  }

  async function mandateAction(id: string, action: string) {
    await fetch("/api/mandates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    load();
  }

  async function reset() {
    await fetch("/api/reset", { method: "POST" });
    load();
  }

  if (!d) return <div className="p-10 text-black/40">Loading…</div>;

  const pct = Math.min(100, (d.monthSpent / (d.guardrails.monthlyCap || 1)) * 100);

  return (
    <main className="min-h-screen bg-[#fafafa]">
      <div className="glass sticky top-0 z-40 border-b border-black/5">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-posy-600 text-white">🌸</span>
            Posy · Trust dashboard
          </Link>
          <div className="flex items-center gap-2 text-xs">
            <span className={"rounded-full px-2.5 py-1 font-medium " + (d.modes.prava === "live" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>
              Prava: {d.modes.prava}
            </span>
            <span className={"rounded-full px-2.5 py-1 font-medium " + (d.modes.openai === "live" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>
              OpenAI: {d.modes.openai}
            </span>
            <button onClick={reset} className="rounded-lg border border-black/10 bg-white px-3 py-1.5 font-medium hover:bg-black/5">
              Reset demo
            </button>
            <Link href="/demo" className="rounded-lg bg-ink px-3 py-1.5 font-medium text-white hover:bg-black">
              Text Posy →
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-5 py-8">
        {/* top stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <div className="text-xs uppercase tracking-wide text-black/40">Spent this month</div>
            <div className="mt-1 text-3xl font-semibold">${d.monthSpent}</div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-black/5">
              <div className="h-full rounded-full bg-posy-500 transition-all" style={{ width: `${pct}%` }} />
            </div>
            <div className="mt-1 text-xs text-black/40">of ${d.guardrails.monthlyCap} monthly cap</div>
          </Card>
          <Card>
            <div className="text-xs uppercase tracking-wide text-black/40">Gifts sent</div>
            <div className="mt-1 text-3xl font-semibold">{d.receipts.length}</div>
            <div className="mt-2 text-xs text-black/40">Each paid with a one-time Visa network token</div>
          </Card>
          <Card>
            <div className="text-xs uppercase tracking-wide text-black/40">Active mandates</div>
            <div className="mt-1 text-3xl font-semibold">{d.mandates.filter((m) => m.status === "active").length}</div>
            <div className="mt-2 text-xs text-black/40">Recurring occasions on autopilot</div>
          </Card>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          {/* left column: guardrails + mandates + receipts */}
          <div className="space-y-6">
            <Card>
              <h2 className="mb-1 text-lg font-semibold">Spend guardrails</h2>
              <p className="mb-4 text-sm text-black/50">
                Hard limits the agent must obey before any card is issued. Change
                these and the agent&apos;s behavior changes instantly.
              </p>
              <div className="space-y-4">
                <Slider label="Per-gift cap" value={d.guardrails.perGiftCap} min={20} max={300} step={5} onChange={(v) => saveGuardrail({ perGiftCap: v })} />
                <Slider label="Monthly cap" value={d.guardrails.monthlyCap} min={100} max={2000} step={50} onChange={(v) => saveGuardrail({ monthlyCap: v })} />
                <Slider label="Auto-approve under" value={d.guardrails.requireApprovalOver} min={0} max={200} step={5} onChange={(v) => saveGuardrail({ requireApprovalOver: v })} />
              </div>
              <p className="mt-3 text-xs text-black/40">
                Amounts above the auto-approve threshold require an explicit
                passkey-style approval in the text thread.
              </p>
            </Card>

            <Card>
              <h2 className="mb-1 text-lg font-semibold">Recurring mandates</h2>
              <p className="mb-4 text-sm text-black/50">
                Standing authorizations (e.g. “Mom&apos;s birthday, every year”).
                Merchant-scoped and capped — pause or cancel anytime.
              </p>
              {d.mandates.length === 0 && <Empty>No mandates yet. Ask Posy to “remember” an occasion.</Empty>}
              <div className="space-y-3">
                {d.mandates.map((m) => (
                  <div key={m.id} className="rounded-xl border border-black/5 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold">{m.label}</div>
                        <div className="mt-0.5 text-xs text-black/50">
                          {m.merchant} · ${m.cap}/charge · {m.recurring_frequency} · {m.charges_used}/{m.max_charges} used
                        </div>
                      </div>
                      <StatusPill status={m.status} />
                    </div>
                    <div className="mt-2 flex gap-2">
                      {m.status !== "cancelled" && (
                        <>
                          {m.status === "active" ? (
                            <MiniBtn onClick={() => mandateAction(m.id, "pause")}>Pause</MiniBtn>
                          ) : (
                            <MiniBtn onClick={() => mandateAction(m.id, "resume")}>Resume</MiniBtn>
                          )}
                          <MiniBtn danger onClick={() => mandateAction(m.id, "cancel")}>Cancel</MiniBtn>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <h2 className="mb-1 text-lg font-semibold">Receipts</h2>
              {d.receipts.length === 0 && <Empty>No purchases yet.</Empty>}
              <div className="space-y-2">
                {d.receipts.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 rounded-xl border border-black/5 p-2.5">
                    <div className="grid h-10 w-10 place-items-center rounded-lg bg-black/[0.03] text-xl">{r.product.emoji}</div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{r.product.title}</div>
                      <div className="text-xs text-black/50">{r.merchant} · {r.orderRef} · Visa •••• {r.card.last4}</div>
                    </div>
                    <div className="text-sm font-semibold">${r.amount}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* right column: audit ledger */}
          <Card>
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Audit ledger</h2>
              <span className="text-xs text-black/40">{d.ledger.length} events</span>
            </div>
            <p className="mb-4 text-sm text-black/50">
              An append-only record of every action the agent took. This is what
              makes autonomous spending trustworthy — nothing happens off the books.
            </p>
            <div className="max-h-[720px] space-y-2 overflow-y-auto pr-1">
              {d.ledger.map((e) => (
                <div key={e.id} className="flex gap-3 rounded-xl border border-black/5 bg-black/[0.012] p-3">
                  <div className="text-lg leading-none">{KIND_ICON[e.kind] || "•"}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">{e.title}</span>
                      {e.amount != null && <span className="shrink-0 text-xs font-semibold text-posy-700">${e.amount}</span>}
                    </div>
                    {e.detail && <p className="mt-0.5 text-xs leading-snug text-black/55">{e.detail}</p>}
                    <div className="mt-1 text-[10px] uppercase tracking-wide text-black/30">
                      {e.kind.replace(/_/g, " ")} · {new Date(e.ts).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">{children}</div>;
}
function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-dashed border-black/10 p-5 text-center text-sm text-black/40">{children}</div>;
}
function MiniBtn({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} className={"rounded-lg px-3 py-1.5 text-xs font-medium " + (danger ? "text-red-600 hover:bg-red-50" : "text-black/70 hover:bg-black/5") + " border border-black/10"}>
      {children}
    </button>
  );
}
function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-700",
    paused: "bg-amber-100 text-amber-700",
    cancelled: "bg-black/10 text-black/50",
  };
  return <span className={"rounded-full px-2.5 py-1 text-xs font-medium " + (map[status] || "")}>{status}</span>;
}
function Slider({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-black/60">{label}</span>
        <span className="font-semibold">${value}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseInt(e.target.value, 10))} className="w-full accent-posy-600" />
    </div>
  );
}
