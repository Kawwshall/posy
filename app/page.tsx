import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Mark } from "@/components/Mark";

export default function Home() {
  return (
    <main className="min-h-screen">
      <Nav />

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-5 pb-16 pt-14 md:pt-20">
        <div className="grid items-center gap-12 md:grid-cols-[1.05fr_0.95fr]">
          <div className="animate-fade-up">
            <p className="mono mb-5 text-[12px] uppercase tracking-[0.18em] text-claret">
              A gifting concierge that lives in your texts
            </p>
            <h1 className="font-display text-[2.7rem] leading-[1.02] md:text-[3.6rem]">
              You meant to send
              <br />
              something. Posy{" "}
              <span className="ink-underline">actually</span> does.
            </h1>
            <p className="mt-6 max-w-md text-[17px] leading-relaxed text-muted">
              You knew it was her birthday. You thought about it Tuesday. Then
              the week happened. Text Posy one line, just who it&apos;s for and
              roughly what you&apos;d spend, and it finds the right thing and
              puts it in the mail. It pays with a card that works exactly once,
              so your real number never leaves your pocket.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/demo"
                className="rounded-lg bg-ink px-5 py-3 font-medium text-paper transition hover:bg-black"
              >
                Text Posy →
              </Link>
              <Link
                href="/dashboard"
                className="rounded-lg border border-line px-5 py-3 font-medium text-ink transition hover:bg-card"
              >
                See how the money works
              </Link>
            </div>
            <p className="mt-5 text-[13px] text-muted">
              No app. No cart. No “create an account to check out.”
            </p>
          </div>

          {/* Text preview */}
          <div className="animate-fade-up md:justify-self-end">
            <div className="mx-auto w-full max-w-[330px] rounded-[28px] border border-line bg-[#ece7db] p-3.5 shadow-soft">
              <div className="mb-3 flex items-center justify-center gap-1.5 text-[12px] font-medium text-muted">
                <Mark className="h-3.5 w-3.5" /> Posy
              </div>
              <div className="space-y-2">
                <B me>something for my mom&apos;s birthday, under $60, needs to land by friday</B>
                <B>
                  Got it. I&apos;d send the hand-rolled silk scarf from Maison
                  Lune. She mentioned wanting one, it&apos;s $58, and it arrives
                  Thursday. Sound right?
                </B>
                <B me>yes please</B>
                <B>
                  Done. Paid with a one-time card, arrives Thu Aug 6.
                  <span className="mono mt-1 block text-[11px] opacity-70">
                    Visa ···· 7789 · $58.00 · order PSY-8QK2R1
                  </span>
                </B>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="rule">
        <div className="mx-auto max-w-5xl px-5 py-16">
          <h2 className="font-display text-3xl">How it actually works</h2>
          <p className="mt-2 max-w-lg text-muted">
            Four steps, and you only do the first one.
          </p>
          <div className="mt-10 grid gap-x-10 gap-y-10 md:grid-cols-2">
            <Step
              n="01"
              title="You text, like you'd text a person"
              body="“Something for my mom's birthday, under $60, needs to land by Friday.” That's the whole interface. No fields, no filters, no app."
            />
            <Step
              n="02"
              title="It picks, and tells you why"
              body="Not ten blue links. Two or three real options and an honest opinion about which one she'd actually like, in a sentence."
            />
            <Step
              n="03"
              title="It checks itself before it spends"
              body="You set the ceiling once. Posy won't cross it, won't touch a category you've blocked, and asks first on anything over your line."
            />
            <Step
              n="04"
              title="It buys, once, and says it's done"
              body="A single-use Visa token pays the merchant. You get a receipt and a delivery date. That card number can never be charged again."
            />
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="rule bg-card">
        <div className="mx-auto max-w-5xl px-5 py-16">
          <div className="grid gap-10 md:grid-cols-[0.9fr_1.1fr]">
            <div>
              <h2 className="font-display text-3xl">
                Where we don&apos;t
                <br /> lose your trust
              </h2>
              <p className="mt-4 max-w-sm text-muted">
                Handing software your card is a big ask. So we made the rules
                boring, strict, and visible. You can read every one of them.
              </p>
              <Link
                href="/dashboard"
                className="mono mt-5 inline-block text-sm text-claret underline underline-offset-4"
              >
                read the whole ledger →
              </Link>
            </div>
            <div className="space-y-5">
              <Rule
                k="one card per gift"
                v="Issued for one merchant, one amount, then dead. Your real card stays in your wallet. The merchant never sees it."
              />
              <Rule
                k="a ceiling you set"
                v="Per gift, per month, and a number above which Posy always stops and asks you first."
              />
              <Rule
                k="everything on the record"
                v="What it searched, why it chose, what it charged, all written down in an append-only log you can open anytime."
              />
              <Rule
                k="recurring, but leashed"
                v="Ask it to remember a birthday and it will, capped per charge, and cancellable in one tap."
              />
            </div>
          </div>
        </div>
      </section>

      {/* Founder note */}
      <section className="rule">
        <div className="mx-auto max-w-2xl px-5 py-16">
          <p className="mono mb-4 text-[12px] uppercase tracking-[0.18em] text-claret">
            why we made this
          </p>
          <p className="font-display text-[1.6rem] leading-snug">
            I have a good mom and a bad memory. I&apos;ve sent enough apology
            flowers to know the problem was never caring. It&apos;s the twenty
            minutes between caring and checkout, which I somehow never have.
          </p>
          <p className="mt-5 text-[17px] leading-relaxed text-muted">
            Posy is the friend who has those twenty minutes, good taste, and a
            card that can&apos;t be misused. You keep the thought. It does the
            errand.
          </p>
          <p className="mt-6 flex items-center gap-2 text-sm text-ink">
            <Mark className="h-4 w-4" /> the Posy team
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="rule bg-ink text-paper">
        <div className="mx-auto max-w-5xl px-5 py-12">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
            <div>
              <div className="flex items-center gap-2">
                <Mark className="h-5 w-5" color="#F4EEE1" bg="#1C1712" />
                <span className="font-display text-lg">Posy</span>
              </div>
              <p className="mt-2 max-w-sm text-sm text-paper/60">
                Text one line. We&apos;ll take it from here.
              </p>
            </div>
            <div className="mono text-[12px] leading-relaxed text-paper/50">
              <div>OpenAI does the thinking.</div>
              <div>Prava moves the money.</div>
              <div>Visa tokens keep it safe.</div>
              <div>Linq puts it in your texts.</div>
            </div>
          </div>
          <p className="mono mt-8 text-[11px] text-paper/40">
            Built in a weekend for the Agentic Commerce Hackathon.
          </p>
        </div>
      </footer>
    </main>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="flex gap-5">
      <div className="mono shrink-0 text-2xl font-medium text-claret/70">{n}</div>
      <div>
        <h3 className="font-display text-xl">{title}</h3>
        <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{body}</p>
      </div>
    </div>
  );
}

function Rule({ k, v }: { k: string; v: string }) {
  return (
    <div className="border-l-2 border-claret/30 pl-4">
      <div className="mono text-[12px] uppercase tracking-[0.12em] text-claret">{k}</div>
      <p className="mt-1 text-[15px] leading-relaxed text-ink/80">{v}</p>
    </div>
  );
}

function B({ children, me }: { children: React.ReactNode; me?: boolean }) {
  return (
    <div className={me ? "flex justify-end" : "flex justify-start"}>
      <div
        className={
          "max-w-[82%] rounded-2xl px-3.5 py-2 text-[13.5px] leading-snug " +
          (me
            ? "rounded-br-md bg-imsg-blue text-white"
            : "rounded-bl-md border border-line bg-white text-ink")
        }
      >
        {children}
      </div>
    </div>
  );
}
