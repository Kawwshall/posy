"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Mark, Swatch } from "@/components/Mark";
import { Guardrails, LedgerEntry, PravaMandate, Receipt } from "@/lib/types";
import { money } from "@/lib/money";

interface StateResp {
  guardrails: Guardrails;
  ledger: LedgerEntry[];
  mandates: PravaMandate[];
  receipts: Receipt[];
  monthSpent: number;
  modes: { prava: string; openai: string; model: string };
}

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

  if (!d) return <div className="p-10 text-muted">Loading…</div>;

  const pct = Math.min(100, (d.monthSpent / (d.guardrails.monthlyCap || 1)) * 100);

  return (
    <main className="min-h-screen bg-paper">
      <div className="topbar sticky top-0 z-40 border-b border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-5 py-3">
          <Link href="/" className="flex items-center gap-2">
            <Mark className="h-6 w-6" />
            <span className="font-display text-xl">Posy</span>
            <span className="mono text-[11px] uppercase tracking-widest text-muted">/ the ledger</span>
          </Link>
          <div className="flex items-center gap-2">
            <ModeChip label="prava" mode={d.modes.prava} />
            <ModeChip label="openai" mode={d.modes.openai} />
            <button onClick={reset} className="rounded-lg border border-line bg-card px-3 py-1.5 text-sm font-medium text-ink hover:bg-paper">
              Reset
            </button>
            <Link href="/demo" className="rounded-lg bg-ink px-3 py-1.5 text-sm font-medium text-paper hover:bg-black">
              Ask Posy →
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-5 py-8">
        <header className="mb-8">
          <h1 className="font-display text-3xl">How the money works</h1>
          <p className="mt-1 max-w-xl text-muted">
            Every rule Posy follows and every sandbox rupee it has touched, in plain sight.
          </p>
        </header>

        {/* top stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <Label>spent this month</Label>
            <div className="mono mt-1 text-3xl font-medium text-ink">{money(d.monthSpent)}</div>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-line">
              <div className="h-full rounded-full bg-claret transition-all" style={{ width: `${pct}%` }} />
            </div>
            <div className="mono mt-1.5 text-[11px] text-muted">of {money(d.guardrails.monthlyCap)} you allowed</div>
          </Card>
          <Card>
            <Label>gifts sent</Label>
            <div className="mono mt-1 text-3xl font-medium text-ink">{d.receipts.length}</div>
            <div className="mt-2 text-xs text-muted">each on its own single-use card</div>
          </Card>
          <Card>
            <Label>on autopilot</Label>
            <div className="mono mt-1 text-3xl font-medium text-ink">{d.mandates.filter((m) => m.status === "active").length}</div>
            <div className="mt-2 text-xs text-muted">occasions it remembers for you</div>
          </Card>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          {/* left column */}
          <div className="space-y-6">
            <Card>
              <h2 className="font-display text-xl">Your ceiling</h2>
              <p className="mb-4 mt-1 text-sm text-muted">
                Posy can&apos;t cross these. Drag a line and it changes its mind
                on the very next gift.
              </p>
              <div className="space-y-4">
                <Slider label="most per gift" value={d.guardrails.perGiftCap} min={500} max={10000} step={250} onChange={(v) => saveGuardrail({ perGiftCap: v })} />
                <Slider label="most per month" value={d.guardrails.monthlyCap} min={2500} max={50000} step={500} onChange={(v) => saveGuardrail({ monthlyCap: v })} />
                <Slider label="ask me above" value={d.guardrails.requireApprovalOver} min={0} max={7500} step={250} onChange={(v) => saveGuardrail({ requireApprovalOver: v })} />
              </div>
              <p className="mt-3 text-xs text-muted">
                Anything over that last line, Posy stops and asks you first, right
                in the thread.
              </p>
            </Card>

            <Card>
              <h2 className="font-display text-xl">Standing gifts</h2>
              <p className="mb-4 mt-1 text-sm text-muted">
                Occasions Posy remembers so you don&apos;t. Capped per charge, and
                off in one tap.
              </p>
              {d.mandates.length === 0 && <Empty>Nothing yet. Ask Posy to “remember” a birthday.</Empty>}
              <div className="space-y-3">
                {d.mandates.map((m) => (
                  <div key={m.id} className="rounded-lg border border-line p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold text-ink">{m.label}</div>
                        <div className="mono mt-0.5 text-[11px] text-muted">
                          {m.merchant} · {money(m.cap)}/charge · {m.recurring_frequency} · {m.charges_used}/{m.max_charges} used
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
              <h2 className="font-display text-xl">Money ledger</h2>
              <p className="mb-3 mt-1 text-sm text-muted">
                Who it went to, and how much. One line per gift.
              </p>
              <div className="space-y-2">
                {d.receipts.length === 0 && <Empty>Nothing bought yet.</Empty>}
                {d.receipts.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 rounded-lg border border-line p-2.5">
                    <Swatch title={r.product.title} category={r.product.category} className="h-10 w-10 text-base" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-ink">
                        {r.product.title} <span className="font-normal text-muted">for {r.recipient || "someone"}</span>
                      </div>
                      <div className="mono text-[11px] text-muted">{r.merchant} · {r.orderRef} · Visa ···· {r.card.last4}</div>
                    </div>
                    <div className="mono text-sm font-medium text-ink">{money(r.amount)}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* right column: ledger */}
          <Card>
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-xl">Every action</h2>
              <span className="mono text-[11px] text-muted">{d.ledger.length} events</span>
            </div>
            <p className="mb-4 mt-1 text-sm text-muted">
              Every move Posy made, newest first. Nothing happens off this list.
            </p>
            <div className="max-h-[720px] overflow-y-auto">
              {d.ledger.map((e) => (
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
          </Card>
        </div>
      </div>
    </main>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="paper-card p-6 shadow-soft">{children}</div>;
}
function Label({ children }: { children: React.ReactNode }) {
  return <div className="mono text-[11px] uppercase tracking-[0.14em] text-muted">{children}</div>;
}
function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-dashed border-line p-5 text-center text-sm text-muted">{children}</div>;
}
function MiniBtn({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} className={"rounded-lg border border-line px-3 py-1.5 text-xs font-medium " + (danger ? "text-red-700 hover:bg-red-50" : "text-ink hover:bg-paper")}>
      {children}
    </button>
  );
}
function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "text-stem",
    paused: "text-claret",
    cancelled: "text-muted",
  };
  return <span className={"mono text-[11px] uppercase tracking-wide " + (map[status] || "")}>{status}</span>;
}
function ModeChip({ label, mode }: { label: string; mode: string }) {
  const live = mode === "live";
  return (
    <span className="mono flex items-center gap-1.5 rounded-md border border-line bg-card px-2 py-1 text-[10px] uppercase tracking-wide text-muted">
      <span className={"h-1.5 w-1.5 rounded-full " + (live ? "bg-stem" : "bg-claret/50")} />
      {label} {mode}
    </span>
  );
}
function Slider({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-sm">
        <span className="text-muted">{label}</span>
        <span className="mono font-medium text-ink">{money(value)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseInt(e.target.value, 10))} className="w-full accent-claret" />
    </div>
  );
}
