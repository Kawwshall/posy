import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Mark } from "@/components/Mark";

export default function Home() {
  return (
    <main className="min-h-screen">
      <Nav />

      <section className="mx-auto max-w-5xl px-5 pb-16 pt-14 md:pt-20">
        <div className="grid items-center gap-12 md:grid-cols-[1.05fr_0.95fr]">
          <div className="animate-fade-up">
            <p className="mono mb-5 text-[12px] uppercase tracking-[0.18em] text-claret">
              Gifting, minus the twenty open tabs
            </p>
            <h1 className="font-display text-[2.7rem] leading-[1.02] md:text-[3.7rem]">
              You care. You&apos;re busy.
              <br />
              Posy handles the awkward <span className="ink-underline">middle bit.</span>
            </h1>
            <p className="mt-6 max-w-lg text-[17px] leading-relaxed text-muted">
              Tell it who, why, and what you can spend. Posy reads the room,
              makes one honest recommendation, checks your limits, and asks
              before money moves. More thoughtful friend, less shopping feed.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/demo" className="rounded-lg bg-ink px-5 py-3 font-medium text-paper transition hover:bg-black">
                Ask Posy →
              </Link>
              <Link href="/dashboard" className="rounded-lg border border-line px-5 py-3 font-medium text-ink transition hover:bg-card">
                See the trust layer
              </Link>
            </div>
            <p className="mt-5 text-[13px] text-muted">
              India-first · prices in ₹ · every sandbox action labelled
            </p>
          </div>

          <div className="animate-fade-up md:justify-self-end">
            <div className="mx-auto w-full max-w-[340px] rotate-[0.5deg] rounded-[28px] border border-line bg-[#ece7db] p-3.5 shadow-soft">
              <div className="mb-3 flex items-center justify-center gap-1.5 text-[12px] font-medium text-muted">
                <Mark className="h-3.5 w-3.5" /> Posy
              </div>
              <div className="space-y-2">
                <B me>mum&apos;s birthday tomorrow. warm, useful, under ₹2,500</B>
                <B>
                  I&apos;d send the Quiet Evening box. It feels caring without announcing
                  “I panic-bought this.” ₹2,299, inside your limit.
                </B>
                <B me>yeah, that&apos;s her. do it</B>
                <B>
                  Sandbox approved. One-time Visa token, with every decision on record.
                  <span className="mono mt-1 block text-[11px] opacity-70">
                    Visa ···· 7789 · ₹2,299 · sandbox SBX-8QK2R1
                  </span>
                </B>
              </div>
            </div>
            <p className="mono mx-auto mt-4 max-w-[320px] text-center text-[10px] leading-relaxed text-muted">
              This public demo uses labelled inventory and Prava&apos;s sandbox. It never pretends a retail order happened.
            </p>
          </div>
        </div>
      </section>

      <section className="rule">
        <div className="mx-auto max-w-5xl px-5 py-16">
          <p className="mono text-[11px] uppercase tracking-[0.18em] text-claret">the whole loop</p>
          <h2 className="mt-3 font-display text-3xl">Agentic commerce with a conscience.</h2>
          <p className="mt-2 max-w-xl text-muted">Four small steps. You stay in control of the important one.</p>
          <div className="mt-10 grid gap-x-10 gap-y-10 md:grid-cols-2">
            <Step n="01" title="Say what happened" body="Messy human language is the interface: who it is, what happened, and roughly what feels okay to spend." />
            <Step n="02" title="It makes a call" body="OpenAI turns context into a short, tasteful shortlist and explains one real opinion—not ten blue links." />
            <Step n="03" title="Rules before money" body="Budget, per-gift ceiling, monthly cap, blocked categories and explicit approval are checked before a payment session exists." />
            <Step n="04" title="A card that dies after use" body="Prava issues a merchant-and-amount-scoped Visa credential in sandbox. The agent records the result without exposing card data." />
          </div>
        </div>
      </section>

      <section className="rule bg-card">
        <div className="mx-auto grid max-w-5xl gap-10 px-5 py-16 md:grid-cols-[0.9fr_1.1fr]">
          <div>
            <h2 className="font-display text-3xl">Trust is part of the interface.</h2>
            <p className="mt-4 max-w-sm text-muted">
              “AI that spends” sounds unsettling. Fair. So Posy makes its limits boring, strict, and visible.
            </p>
            <Link href="/dashboard" className="mono mt-5 inline-block text-sm text-claret underline underline-offset-4">
              open the money ledger →
            </Link>
          </div>
          <div className="space-y-5">
            <Rule k="no silent spending" v="The recommendation and the payment are separate decisions. You approve before Prava is called." />
            <Rule k="no reusable card" v="Each sandbox credential is scoped to one merchant and one amount, then it is done." />
            <Rule k="no fake success" v="Demo inventory, sandbox payment and real integrations are labelled as what they are." />
            <Rule k="no mystery trail" v="Intent, reasoning, guardrail checks, approval and payment status appear in one readable record." />
          </div>
        </div>
      </section>

      <section className="rule">
        <div className="mx-auto max-w-2xl px-5 py-16">
          <p className="mono mb-4 text-[12px] uppercase tracking-[0.18em] text-claret">why this exists</p>
          <p className="font-display text-[1.7rem] leading-snug">
            I have a good mum and a bad memory. The problem was never caring. It was the twenty minutes between caring and checkout.
          </p>
          <p className="mt-5 text-[17px] leading-relaxed text-muted">
            Posy is the friend who has those twenty minutes, good taste, and a card that cannot wander off and do something stupid.
          </p>
        </div>
      </section>

      <footer className="rule bg-ink text-paper">
        <div className="mx-auto flex max-w-5xl flex-col justify-between gap-8 px-5 py-12 md:flex-row md:items-end">
          <div>
            <div className="flex items-center gap-2"><Mark className="h-5 w-5" color="#F4EEE1" bg="#1C1712" /><span className="font-display text-lg">Posy</span></div>
            <p className="mt-2 text-sm text-paper/60">Say the human bit. We&apos;ll handle the fiddly bit.</p>
          </div>
          <div className="mono text-[12px] leading-relaxed text-paper/50">
            <div>OpenAI understands the intent.</div>
            <div>Prava makes payment single-use.</div>
            <div>You keep the final word.</div>
          </div>
        </div>
      </footer>
    </main>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return <div className="flex gap-5"><div className="mono shrink-0 text-2xl font-medium text-claret/70">{n}</div><div><h3 className="font-display text-xl">{title}</h3><p className="mt-1.5 text-[15px] leading-relaxed text-muted">{body}</p></div></div>;
}

function Rule({ k, v }: { k: string; v: string }) {
  return <div className="border-l-2 border-claret/30 pl-4"><div className="mono text-[12px] uppercase tracking-[0.12em] text-claret">{k}</div><p className="mt-1 text-[15px] leading-relaxed text-ink/80">{v}</p></div>;
}

function B({ children, me }: { children: React.ReactNode; me?: boolean }) {
  return <div className={me ? "flex justify-end" : "flex justify-start"}><div className={"max-w-[86%] rounded-2xl px-3.5 py-2 text-[13.5px] leading-snug " + (me ? "rounded-br-md bg-claret text-white" : "rounded-bl-md border border-line bg-white text-ink")}>{children}</div></div>;
}
