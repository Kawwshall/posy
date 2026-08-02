# Posy — 90-second demo script (for the video + live judging)

**Goal:** show a real, controlled purchase completed inside a text thread, and
make the trust layer the hero. Keep energy warm and fast.

---

### 0:00 — Hook (landing page `/`)
> "Everyone means to send the gift. Almost nobody does — the moment passes in a
> text thread. Posy catches it *there* and finishes the job."

Point at the four chips: **OpenAI agent · Visa network tokens · Prava trust
layer · Lives in your texts.**

### 0:12 — The text (`/demo`)
Type (or tap the quick-start):
> **"Get my mom something nice for her birthday, under $60, by Friday 🎂"**

While it "types," narrate:
> "An OpenAI agent is pulling out the recipient, the occasion, the budget, and
> the deadline."

### 0:25 — Curation + the trust moment
Three gift options appear with a **Top Pick**, plus a **Spend check** card:
> "It curated real gifts across a merchant network and picked a favorite — and
> notice: before anything can be bought, it runs a **guardrail check** against
> my caps. Green means cleared."

Gesture to the **live agent trace** on the right:
> "Everything it does is on the record — search, reasoning, the guardrail
> decision. Nothing happens off the books."

### 0:45 — Approve → real payment
Tap **🔐 Approve & send**. As the receipt lands:
> "On my OK, **Prava mints a one-time Visa network token** — single-use, scoped
> to this one merchant and amount. The merchant gets charged; my real card is
> never exposed. Here's the receipt: order number, card ending 7789, arrives
> Tuesday."

Point to the trace filling in: **session opened → Visa token issued → charged →
receipt**, and the **spend meter** ticking up.

### 1:05 — Recurring (retention story)
Reply:
> **"yes, remember mom's birthday every year"**

> "That sets up a **Prava mandate** — capped per charge, merchant-scoped, and I
> can pause or cancel anytime. That's how Posy becomes a habit, not a one-off."

### 1:15 — Trust dashboard (`/dashboard`)
> "And here's the whole trust layer: my spend guardrails — drag a slider and the
> agent's behavior changes instantly — my recurring mandates, every receipt, and
> an append-only audit ledger of every action."

### 1:25 — Close
> "Agentic commerce only works if you can trust the agent with money. Posy is
> that — a gift concierge in your texts, powered by OpenAI, paid with Visa
> network tokens through Prava, with proof and control built in. Text one line;
> we handle the whole gift."

---

## Judge Q&A cheat sheet
- **Is it a real transaction?** Yes — `POST /v1/sessions` → `GET /payment-result` → one-time Visa token → charge → receipt. Add a Prava sandbox key and it hits the live sandbox with the documented test card; no code changes.
- **Where's the OpenAI usage?** Structured intent extraction + taste-aware curation + the conversational voice (`gpt-4o`, JSON mode), with a heuristic fallback so the demo never breaks.
- **Linq fit?** The product is native to texting; the orchestrator is channel-agnostic and drops onto Linq's iMessage infra.
- **Visa fit?** An AI agent purchasing on behalf of a consumer using Visa network tokens, with per-transaction scoping, spend controls, and full auditability.
- **Business model?** Take rate on GMV + merchant placement; recurring occasion mandates drive retention in a ~$250B market.
- **What's mocked vs real today?** Payment rails + agent are real (or live-ready). The merchant catalog stands in for Prava `shop_search`; swapping it in is a drop-in.
