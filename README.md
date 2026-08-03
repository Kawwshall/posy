# Posy

**You care. You're busy. Posy does the rest.**

Posy is a gifting concierge you text. Tell it who the gift is for and what you
can spend. It finds something good, stays inside your limits, and asks before it
pays. Then it pays with a card that works once.

- **Live:** https://posy.getcontios.com
- **Text it:** +1 646 239 5308 (send `Activate` once, then a gift request). Works on iMessage, RCS and SMS.
- **Code:** https://github.com/Kawwshall/posy

Built for the Agentic Commerce Hackathon. India-first, prices in rupees.

## What it does

1. You say the messy human version: "gift for my mum, she loves chai, under 5000."
2. OpenAI reads the intent and picks a short, honest shortlist with one real opinion.
3. Spend rules run in plain code before any money is involved: per-gift cap, monthly cap, blocked categories, and a step-up approval line.
4. On your yes, Prava opens a merchant and amount scoped session and issues a one-time Visa credential. You get a receipt.
5. Say "remember every year" and it sets up a capped, cancellable recurring mandate.

Every step is written to a plain record you can read.

## Honest about what runs

This is a sandbox build.

- OpenAI reasoning is live.
- Product search is live through Prava Pay when a real listing fits the budget. When it does not, Posy shows clearly labelled demo ideas.
- Payment is the Prava sandbox. No real money moves and no retail order is placed. The app says so.
- Delivery dates are never invented for live merchant products. Shipping is confirmed at checkout.

## Two ways to use it

- **Text:** the same agent lives in a real message thread through Linq. iMessage senders also get a "Posy" contact card (name and logo). Sandbox only replies to activated recipients, so text `Activate` first. STOP unsubscribes.
- **Web:** `posy.getcontios.com/demo` runs the same agent for anyone, on any device. Approve, then reply "done" to settle the sandbox checkout without depending on the hosted card page.

## How it is built

- Next.js (App Router) and React on `vinext` (Vite RSC), deployed to Cloudflare Workers via OpenAI Apps hosting.
- `lib/orchestrator.ts`: the turn by turn agent (brief, curate, guardrails, approval, pay, receipt, mandate).
- `lib/agent.ts`: OpenAI intent and curation, with a heuristic fallback.
- `lib/prava.ts`: Prava client (sessions, payment result, report status, revoke, mandates).
- `lib/prava-shopping.ts`: Prava Pay live product search, signed with Ed25519.
- `lib/guardrails.ts`: the spend policy every purchase must pass.
- `lib/linq.ts` and `app/api/linq/*`: the text channel (send, inbound webhook, contact card).
- `app/demo` and `app/dashboard`: the web thread and the money ledger plus action log.

## Run it

```bash
npm install
cp .env.example .env.local   # optional, leave blank to run the mock
npm run dev                  # http://localhost:3000
```

- `/` the pitch
- `/demo` text Posy on the web, tap the lock for your records
- `/dashboard` spend limits, mandates, receipts, and the action log

### Going live

Set the keys in `.env.local` for local dev. On Cloudflare they are Worker
secrets and vars, not `.env.local`. See `.env.example` for every value:
`OPENAI_API_KEY`, `PRAVA_SECRET_KEY`, `PRAVA_AGENT_ID` and
`PRAVA_AGENT_PRIVATE_KEY` for live search, and `LINQ_API_TOKEN` plus
`LINQ_NUMBER` for the text channel.

## Track fit

- **Linq:** Posy lives in a real text thread. iMessage, RCS and SMS, with a branded contact card.
- **Visa:** every purchase is an agent buying for a person with a one-time Visa network token, inside hard spend controls, on the record.
- **Prava:** sessions, one-time credentials, recurring mandates, guardrails, and live product search. Prava is the spine.
- **OpenAI:** the agent that turns one sentence into a safe, finished purchase.
