<div align="center">

# 🌸 Posy

### Text one line. We handle the whole gift.

**An agentic gifting concierge you text like a friend.**
An OpenAI agent finds the perfect gift, checks it against *your* spend rules,
and buys it with a **one-time Visa network token via Prava** — then texts you
the receipt. No apps, no carts, no card numbers exposed.

*Built for the Agentic Commerce Hackathon — OpenAI · Visa · Prava · Linq*

</div>

---

## The problem

Gifting is a ~$250B market run on guilt and last-minute panic. People miss
birthdays, overpay for rush shipping, and abandon carts. The *intent* to give
a gift is felt in a fleeting moment — usually while texting someone — but every
tool today forces you to stop, open an app, browse, and check out. The intent
evaporates.

## What Posy does

Posy captures that intent where it lives — **your text thread** — and closes the
loop with a real, controlled purchase:

1. **You text an intent.** *"Get my mom something nice for her birthday, under $60, by Friday."* An OpenAI agent extracts recipient, occasion, budget, taste, and deadline.
2. **It curates and recommends.** The agent ranks real gifts across a merchant network and explains *why* its favorite fits — like a thoughtful friend, not a search box.
3. **Guardrails clear it.** Every candidate is checked against your per-gift cap, rolling monthly cap, and step-up approval threshold **before any card is issued.**
4. **Prava pays, once.** On your approval, Prava mints a **single-use Visa network token** scoped to that one merchant and amount. The merchant is charged; you never expose a reusable card number.
5. **You get a receipt** — and can turn the occasion into a recurring **mandate** ("never miss mom's birthday") that's capped and pausable anytime.

Everything the agent does is written to an **append-only audit ledger** — the
trust layer that makes autonomous spending safe.

## Why this wins the niche + the sponsor tracks

| Track | How Posy hits it |
|---|---|
| **Linq** (agent messaging) | Posy is *native to texting*. No app to download — it lives in the thread, the exact surface Linq's iMessage agent infra powers. |
| **Visa** (Intelligent Commerce) | Every purchase is an AI agent buying *on behalf of a consumer* using **Visa network tokens**, issued per-transaction with hard spend controls and full auditability — Visa's agentic-commerce thesis, shipped. |
| **Prava** (payments + trust) | Deep integration: `sessions` → one-time tokenized credentials, recurring `mandates`, `guardrails`, and a transparent ledger. Prava is load-bearing, not bolted on. |
| **OpenAI** | The agent brain: structured intent extraction, taste-aware curation, and a warm, concise conversational voice. |

## Architecture

```
   iMessage-style thread  ──┐
   (Linq channel adapter)   │
                            ▼
                    ┌───────────────┐   OpenAI (structured JSON)
   user intent ───▶ │  Orchestrator │◀──────────────────────────┐
                    │  (state mach.)│   parse brief + curate     │
                    └───────┬───────┘                            │
                            │                                    │
              ┌─────────────┼──────────────┐                     │
              ▼             ▼              ▼                      │
        ┌──────────┐  ┌──────────┐  ┌────────────┐        ┌──────────────┐
        │Guardrails│  │  Prava   │  │Audit ledger│        │ Gift catalog │
        │ (policy) │  │ payments │  │ (append-   │        │ (merchant    │
        └──────────┘  └────┬─────┘  │  only)     │        │  network)    │
                           │        └────────────┘        └──────────────┘
                           ▼
        POST /v1/sessions ─▶ GET /payment-result ─▶ one-time Visa token
        POST /v1/mandates/{id}/charge  (recurring)
```

- **`lib/orchestrator.ts`** — the turn-by-turn agent state machine (brief → curate → guardrails → approval → pay → receipt → mandate).
- **`lib/agent.ts`** — OpenAI-powered intent extraction + gift curation, with a strong heuristic fallback.
- **`lib/prava.ts`** — faithful Prava client (sessions, payment-result, mandates, mandate-charge). Live sandbox when a key is present; high-fidelity mock otherwise.
- **`lib/guardrails.ts`** — the spend policy engine every purchase must pass.
- **`lib/store.ts`** — in-memory account (ledger, mandates, receipts, spend).
- **`app/demo`** — the iMessage texting UI + live agent trace.
- **`app/dashboard`** — the trust dashboard (guardrails, mandates lifecycle, receipts, full ledger).

## Run it

```bash
npm install
cp .env.example .env.local   # optional — leave blank to run the mock
npm run dev                  # http://localhost:3000
```

- **`/`** — the pitch / landing page
- **`/demo`** — text Posy and watch the agent act (left: thread, right: live trace)
- **`/dashboard`** — inspect and adjust the trust layer

### Going live (real transaction)

Drop a `PRAVA_SECRET_KEY` (sk_test_… from [dashboard.prava.space](https://dashboard.prava.space))
and an `OPENAI_API_KEY` into `.env.local`. No code changes — the mode badges in
the UI flip to **live**, and purchases hit the real Prava sandbox. Use the
documented sandbox test card `4622 9431 2313 7789`, CVV `757`, exp `12/27`,
OTP `456789`.

## Payment transparency (by design)

- **One-time credentials.** Each purchase gets its own Visa network token + dynamic CVV, scoped to one merchant and one amount. Nothing is stored or reusable.
- **Policy before payment.** No card is ever minted until the guardrail engine clears the purchase against your caps.
- **Explicit approval for large spend.** Anything over your auto-approve threshold requires a passkey-style OK in the thread.
- **Append-only ledger.** Every reasoning step, guardrail check, session, token issuance, and charge is recorded and visible.
- **Revocable recurring.** Mandates are merchant-scoped, capped, and pausable/cancellable anytime.

## What's next

- Real Linq iMessage channel adapter (the orchestrator is already channel-agnostic).
- Live Prava `shop_search`/`shop_checkout` across the connected merchant network (the catalog is a drop-in stand-in).
- Delivery tracking + thank-you-note automation over text.
- Recipient memory & taste graph for better curation over time.

---

<div align="center">
Made with 🌸 for people who mean to send the gift — and now actually do.
</div>
