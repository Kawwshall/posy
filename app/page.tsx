import Link from "next/link";
import { Nav } from "@/components/Nav";

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
      <div className="mb-3 grid h-9 w-9 place-items-center rounded-full bg-posy-100 font-semibold text-posy-700">
        {n}
      </div>
      <h3 className="mb-1 font-semibold">{title}</h3>
      <p className="text-sm leading-relaxed text-black/60">{body}</p>
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-medium text-black/70">
      {children}
    </span>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen">
      <Nav />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-posy-200/40 blur-3xl" />
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-16 md:grid-cols-2 md:py-24">
          <div className="animate-fade-up">
            <div className="mb-4 flex flex-wrap gap-2">
              <Pill>🤖 OpenAI agent</Pill>
              <Pill>💳 Visa network tokens</Pill>
              <Pill>🔒 Prava trust layer</Pill>
              <Pill>💬 Lives in your texts</Pill>
            </div>
            <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
              Text one line.
              <br />
              <span className="gradient-text">We handle the whole gift.</span>
            </h1>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-black/60">
              Posy is a gifting concierge you text like a friend. An AI agent
              finds the perfect gift, checks it against <em>your</em> spend
              rules, and buys it with a one-time Visa card — then texts you the
              receipt. No apps, no carts, no card numbers exposed.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href="/demo"
                className="rounded-xl bg-ink px-5 py-3 font-medium text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-black"
              >
                Try texting Posy →
              </Link>
              <Link
                href="/dashboard"
                className="rounded-xl border border-black/10 bg-white px-5 py-3 font-medium text-black/80 transition hover:bg-black/5"
              >
                See the trust dashboard
              </Link>
            </div>
            <p className="mt-4 text-xs text-black/40">
              Runs live with a Prava sandbox key + OpenAI key — and runs fully
              offline with a high-fidelity mock. Every purchase is auditable.
            </p>
          </div>

          {/* Text preview */}
          <div className="animate-fade-up">
            <div className="mx-auto max-w-sm rounded-[36px] bg-[#f2f2f7] p-4 shadow-2xl ring-1 ring-black/5">
              <div className="mb-2 text-center text-xs font-medium text-black/40">
                Messages · Posy
              </div>
              <div className="space-y-2">
                <Bubble me>get mom something nice for her birthday, under $60, arrives by Friday 🎂</Bubble>
                <Bubble>On it. Best pick: a hand-rolled mulberry silk scarf from Maison Lune ($58) — elegant, arrives Thursday, gift-boxed. 🧣</Bubble>
                <Bubble>✅ Within your $60 budget &amp; monthly cap. Tap to send?</Bubble>
                <Bubble me>send it 💛</Bubble>
                <Bubble>
                  Done! Paid with a one-time Visa •••• 7789. Order PSY-8QK2R1.
                  Arrives Thu, Aug 6 to mom. 🎁
                </Bubble>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-5 py-12">
        <h2 className="mb-2 text-2xl font-semibold tracking-tight">
          A real transaction, end to end — in a text thread
        </h2>
        <p className="mb-8 max-w-2xl text-black/60">
          Posy turns one sentence into a completed, policy-checked purchase. The
          agent reasons, the trust layer enforces your limits, and Prava issues a
          single-use Visa credential the merchant charges — you never hand over a
          real card number.
        </p>
        <div className="grid gap-4 md:grid-cols-4">
          <Step n="1" title="You text an intent" body="“Something cozy for my sister, ~$50.” The OpenAI agent extracts recipient, occasion, budget, and taste." />
          <Step n="2" title="It curates + recommends" body="Ranks real gifts across a merchant network and explains why its favorite fits — like a thoughtful friend." />
          <Step n="3" title="Guardrails clear it" body="Every candidate is checked against your per-gift, monthly, and step-up limits before a cent moves." />
          <Step n="4" title="Prava pays, once" body="On your OK, Prava mints a one-time Visa network token, the merchant is charged, and you get a receipt." />
        </div>
      </section>

      {/* Why it matters / tracks */}
      <section className="mx-auto max-w-6xl px-5 py-12">
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
            <div className="text-2xl">💬</div>
            <h3 className="mt-2 font-semibold">Native to messaging</h3>
            <p className="mt-1 text-sm text-black/60">
              No new app to download. Posy lives where people already live — the
              text thread — via Linq&apos;s agent messaging infrastructure.
            </p>
          </div>
          <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
            <div className="text-2xl">💳</div>
            <h3 className="mt-2 font-semibold">Trusted, tokenized payments</h3>
            <p className="mt-1 text-sm text-black/60">
              Purchases on your behalf ride Visa network tokens issued per
              transaction by Prava — zero PCI exposure, scoped to one merchant
              and one amount.
            </p>
          </div>
          <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
            <div className="text-2xl">📓</div>
            <h3 className="mt-2 font-semibold">Provable control</h3>
            <p className="mt-1 text-sm text-black/60">
              An immutable audit ledger shows every decision the agent made and
              why. Set caps, require approvals, pause recurring gifts anytime.
            </p>
          </div>
        </div>
      </section>

      {/* Business */}
      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="rounded-3xl bg-ink p-8 text-white md:p-12">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Gifting is a $250B market run on guilt and last-minute panic.
          </h2>
          <p className="mt-3 max-w-2xl text-white/70">
            People miss birthdays, overpay for rush shipping, and abandon carts.
            Posy captures the intent at the moment it&apos;s felt — in a text —
            and closes the loop with a real, controlled purchase. We earn a take
            rate on GMV plus merchant placement, with recurring occasion mandates
            driving retention.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/demo" className="rounded-xl bg-white px-5 py-3 font-medium text-ink hover:bg-white/90">
              Text Posy now →
            </Link>
            <Link href="/dashboard" className="rounded-xl border border-white/20 px-5 py-3 font-medium text-white hover:bg-white/10">
              Inspect the ledger
            </Link>
          </div>
        </div>
        <p className="mt-6 text-center text-xs text-black/40">
          Built for the Agentic Commerce Hackathon · OpenAI · Visa · Prava · Linq
        </p>
      </section>
    </main>
  );
}

function Bubble({ children, me }: { children: React.ReactNode; me?: boolean }) {
  return (
    <div className={me ? "flex justify-end" : "flex justify-start"}>
      <div
        className={
          "max-w-[80%] rounded-2xl px-3.5 py-2 text-[13px] leading-snug shadow-sm " +
          (me
            ? "rounded-br-md bg-imsg-blue text-white"
            : "rounded-bl-md bg-white text-black")
        }
      >
        {children}
      </div>
    </div>
  );
}
