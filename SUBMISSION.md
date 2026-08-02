# Posy — Devpost / submission write-up

> **Tagline:** Text one line. We handle the whole gift.
> An agentic gifting concierge that turns a single text into a real,
> policy-checked purchase paid with a one-time Visa network token via Prava.

## 💡 Inspiration
Everyone has felt it: you're texting a friend, someone mentions their mom's
birthday is Friday, and you think *"I should send something."* Then life
happens — you never open the shopping app, and the moment passes. Gifting intent
is born in conversation and dies in friction. We wanted an agent that catches
that intent in the thread and actually finishes the job — safely, with money.

## 🌸 What it does
You text Posy like a friend: *"Get my mom something nice for her birthday, under
$60, by Friday."* An OpenAI agent understands the recipient, occasion, budget,
taste, and deadline; curates real gifts across a merchant network; and
recommends its favorite with a reason. Every candidate is checked against your
spend guardrails **before** any card exists. On your OK, Prava issues a
single-use Visa network token, the merchant is charged, and Posy texts you a
receipt. Say "remember every year" and it sets up a capped, pausable recurring
mandate. A trust dashboard shows an append-only ledger of everything the agent
did.

## 🛠️ How we built it
- **Next.js 14 / React / TypeScript / Tailwind** — one deployable app: landing, an iMessage-style demo, and a trust dashboard.
- **OpenAI** (`gpt-4o`, structured JSON output) — intent extraction + taste-aware curation + concierge voice. A strong heuristic fallback keeps the demo working with zero keys.
- **Prava** — faithful client for `POST /v1/sessions`, `GET /v1/sessions/{id}/payment-result`, mandate setup, and `POST /v1/mandates/{id}/charge`. Live sandbox when a key is present; a high-fidelity mock (exact payload shapes + the documented sandbox test card) otherwise.
- **A guardrail engine + append-only audit ledger** — the trust layer that makes handing an agent a payment credential actually safe.
- **A channel-agnostic orchestrator** — a turn-by-turn state machine (brief → curate → guardrails → approval → pay → receipt → mandate) that drops onto Linq's iMessage infra without changes.

## 🧗 Challenges we ran into
- **Trust is the product, not a feature.** An agent that can spend money is only useful if you can prove what it did and bound what it can do. We made the guardrail check a hard gate before token issuance, and surfaced every step in a live ledger.
- **Feeling like a text, not a form.** We staged assistant messages with natural cadence and built rich in-thread cards (options, spend check, receipt, mandate) so approvals happen inline.
- **Zero-credential demo fidelity.** We mirrored Prava's exact request/response shapes so the mock is indistinguishable from live — and flips to live the instant a key is added.

## 🏆 Accomplishments we're proud of
- A **real, end-to-end transaction** — reasoning → guardrails → Prava session → one-time Visa token → charge → receipt — completed inside a text thread.
- A genuinely **startup-shaped wedge** (agentic gifting, take-rate on GMV, recurring mandates for retention) — not a demo toy.
- **Deep, load-bearing Prava integration** plus a transparency layer that speaks directly to Visa's and Prava's trust thesis.

## 📚 What we learned
Payment credentials are the easy part; *permission and proof* are the hard part.
The winning pattern for agentic commerce is: narrow-scope, single-use tokens +
explicit user policy + an auditable record. Get that right and autonomous
spending stops being scary.

## 🚀 What's next
- Real Linq iMessage adapter (orchestrator is already channel-agnostic).
- Live Prava `shop_search`/`shop_checkout` across connected merchants.
- Delivery tracking, thank-you-note automation, and a recipient taste graph.

## 🎯 Track alignment
- **Linq:** native to texting — Posy lives in the thread, no app.
- **Visa:** AI purchasing on behalf of a consumer with Visa network tokens + hard spend controls + auditability.
- **Prava:** sessions, one-time tokenized credentials, recurring mandates, guardrails, transparent ledger — Prava is the spine.
- **OpenAI:** the agent that turns one sentence into a finished, safe purchase.
