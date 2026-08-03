import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Mark } from "@/components/Mark";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      <Nav />

      <section className="mx-auto flex w-full max-w-5xl flex-1 items-center px-5 py-12">
        <div className="grid w-full items-center gap-12 md:grid-cols-[1fr_0.85fr]">
          <div className="animate-fade-up">
            <p className="mono mb-5 text-[12px] uppercase tracking-[0.18em] text-claret">
              gifting, minus the twenty open tabs
            </p>
            <h1 className="font-display text-[2.9rem] leading-[1.02] md:text-[4rem]">
              You care.
              <br />
              You&apos;re busy.
              <br />
              <span className="ink-underline">Posy does the rest.</span>
            </h1>
            <p className="mt-6 max-w-md text-[17px] leading-relaxed text-muted">
              Text it who the gift is for and what you can spend. It finds
              something good, stays inside your limits, and asks before it pays.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href="sms:+16462395308?body=Activate"
                className="rounded-lg bg-ink px-5 py-3 font-medium text-paper transition hover:bg-black"
              >
                Text Posy →
              </a>
              <Link
                href="/demo"
                className="rounded-lg border border-line px-5 py-3 font-medium text-ink transition hover:bg-card"
              >
                Try it on the web
              </Link>
            </div>
            <p className="mt-4 text-[13px] leading-relaxed text-muted">
              Text <span className="mono text-ink">+1 646 239 5308</span>. Works
              on iMessage, RCS and SMS. No phone handy? The web demo runs
              anywhere.
            </p>
          </div>

          <div className="animate-fade-up md:justify-self-end">
            <div className="mx-auto w-full max-w-[330px] rotate-[0.4deg] rounded-[28px] border border-line bg-[#ece7db] p-3.5 shadow-soft">
              <div className="mb-3 flex items-center justify-center gap-1.5 text-[12px] font-medium text-muted">
                <Mark className="h-3.5 w-3.5" /> Posy
              </div>
              <div className="space-y-2">
                <B me>gift for mum, she loves chai, under ₹5,000</B>
                <B>
                  I&apos;d send the masala chai gift box from Sancha Tea. Warm,
                  easy, and inside your limit at ₹4,060. Send it?
                </B>
                <B me>yep, that&apos;s her</B>
                <B>
                  Done. Paid with a one-time card, every step on record.
                  <span className="mono mt-1 block text-[11px] opacity-70">
                    Visa ···· 7789 · ₹4,060 · sandbox
                  </span>
                </B>
              </div>
            </div>
            <p className="mono mx-auto mt-4 max-w-[310px] text-center text-[10px] leading-relaxed text-muted">
              Sandbox only. No real money moves, and it never pretends an order
              was placed.
            </p>
          </div>
        </div>
      </section>

      <footer className="rule">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-5 py-6 text-sm">
          <Link href="/" className="flex items-center gap-2">
            <Mark className="h-5 w-5" />
            <span className="font-display text-base">Posy</span>
          </Link>
          <nav className="flex items-center gap-5 text-muted">
            <Link href="/demo" className="hover:text-ink">Web demo</Link>
            <Link href="/dashboard" className="hover:text-ink">Money ledger</Link>
            <a href="https://github.com/Kawwshall/posy" className="hover:text-ink">Code</a>
          </nav>
          <p className="mono w-full text-[11px] text-muted/70 md:w-auto">
            Powered by OpenAI, Prava and Linq.
          </p>
        </div>
      </footer>
    </main>
  );
}

function B({ children, me }: { children: React.ReactNode; me?: boolean }) {
  return (
    <div className={me ? "flex justify-end" : "flex justify-start"}>
      <div
        className={
          "max-w-[86%] rounded-2xl px-3.5 py-2 text-[13.5px] leading-snug " +
          (me
            ? "rounded-br-md bg-claret text-white"
            : "rounded-bl-md border border-line bg-white text-ink")
        }
      >
        {children}
      </div>
    </div>
  );
}
