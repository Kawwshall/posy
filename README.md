# Posy

**Text one line. We handle the whole gift.**

Posy is an India-first agentic gifting concierge you text like a friend. An
OpenAI agent works out who the gift is for, the occasion, and the budget,
curates real options, checks each one against your spend rules, and completes a
purchase with a one-time Visa credential issued by Prava. Then it texts you the
receipt. No app, no cart, no card numbers exposed.

Built for the Agentic Commerce Hackathon. OpenAI does the thinking, Prava moves
the money, Visa tokens keep it safe, and it lives in your texts.

## The problem

Gifting intent is born in conversation and dies in friction. You know it is her
birthday, you think about it on Tuesday, then the week eats you alive. Every
tool today makes you stop, open an app, browse, and check out, so the moment
passes. Posy catches the intent in the thread and finishes the job.

## What Posy does

1. **You text an intent.** "Gift for my mom for her birthday, under 2500, she
   loves chai and cozy things." The agent extracts recipient, occasion, budget,
   taste, and deadline.
2. **It curates and recommends.** It pulls candidates (live Prava UCP merchant
   inventory when connected, a clearly labelled demo catalog otherwise), then
   picks a favourite and says why, in a sentence, like a thoughtful friend.
3. **Guardrails clear it.** Every candidate is checked against your per-gift
   cap, rolling monthly cap, and step-up approval line before any card exists.
4. **Prava pays, once.** On approval, Prava opens a merchant and amount scoped
   session. The person completes secure card entry and passkey approval, and a
   single-use Visa credential is issued. The browser never sees a reusable card.
5. **You get a receipt** and can turn the occasion into a recurring mandate
   that is capped, merchant scoped, and cancellable in one tap.

Everything the agent does is written to an append-only record you can open at
any time.

## Honesty about what runs

This is a sandbox build. In live mode it uses real OpenAI reasoning and the real
Prava sandbox approval surface. The final merchant execution is a documented
Prava sandbox result: no real money moves and no retail order is placed.
Products sourced from live Prava merchant search are labelled as such, and demo
catalog items are always labelled as demo ideas. Delivery dates are never
invented for live merchant products; shipping is confirmed at checkout.

## Track fit

| Track | How Posy fits |
|---|---|
| Linq (agent messaging) | Posy is native to texting. The orchestrator is channel agnostic and drops onto Linq iMessage infrastructure. |
| Visa (Intelligent Commerce) | Every purchase is an agent buying on behalf of a consumer with a one-time Visa network token, issued per transaction with hard spend controls and a full audit trail. |
| Prava (payments and trust) | Deep integration: sessions, payment-result, report-status, revoke, recurring mandates, and Prava Pay wallet product discovery. Prava is the spine, not a bolt-on. |
| OpenAI | The agent brain: structured intent extraction, taste aware curation, and a warm, concise, human voice. |

## Architecture

```
text thread (Linq adapter)
      |
      v
orchestrator  ->  OpenAI (structured JSON: parse brief + curate)
  state machine
      |
      +--> guardrails (spend policy, checked before any card)
      +--> Prava payments (session -> approval + passkey -> one-time Visa token -> report status)
      +--> Prava Pay shopping (Ed25519 signed live UCP product search)
      +--> records (append-only money ledger + action log)
```

- `lib/orchestrator.ts` turn by turn state machine (brief, curate, guardrails, approval, pay, receipt, mandate).
- `lib/agent.ts` OpenAI intent extraction and curation, with a heuristic fallback.
- `lib/prava.ts` Prava client (sessions, payment-result, report-status, revoke, mandates). Live sandbox when a key is present, high-fidelity mock otherwise.
- `lib/prava-shopping.ts` Prava Pay wallet agent for live UCP product discovery, request signed with Ed25519.
- `lib/guardrails.ts` the spend policy engine every purchase must pass.
- `lib/store.ts` in-memory account (records, mandates, receipts, spend).
- `app/demo` the texting UI plus a hideable records drawer (money ledger and every action).
- `app/dashboard` the trust dashboard (guardrails, mandates, ledger).

## Stack

Next.js (App Router) and React on `vinext` (Vite RSC), deployed to Cloudflare
Workers via OpenAI Apps hosting.

## Run it

```bash
npm install
cp .env.example .env.local   # optional, leave blank to run the mock
npm run dev                  # http://localhost:3000
```

- `/` the pitch
- `/demo` text Posy and watch it work; tap the lock to open your records
- `/dashboard` inspect and adjust the trust layer

### Going live

Set the values in `.env.local`:

- `OPENAI_API_KEY` and optional `OPENAI_MODEL` for live reasoning.
- `PRAVA_SECRET_KEY` (sk_test from dashboard.prava.space) and `PRAVA_BASE_URL`
  for the real sandbox payment flow.
- `PRAVA_AGENT_ID` and `PRAVA_AGENT_PRIVATE_KEY` to enable live UCP product
  discovery through Prava Pay.

The mode badges in the UI show which integrations are live. Nothing else in the
code changes.

## Payment transparency by design

- One-time credentials scoped to one merchant and one amount. Nothing stored or
  reusable.
- Policy before payment. No credential is issued until guardrails clear the
  purchase.
- Explicit approval for large spend, done through Prava secure entry and
  passkey.
- Append-only record of every reasoning step, guardrail check, session, and
  credential.
- Recurring mandates are merchant scoped, capped, and cancellable any time.

## What is next

- Real Linq iMessage adapter (the orchestrator is already channel agnostic).
- Broaden live Prava UCP checkout across more merchants and categories.
- Delivery tracking and thank-you note automation over text.
- Recipient memory and a taste graph for better curation over time.
