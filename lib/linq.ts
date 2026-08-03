import { ChatMessage } from "./types";
import { money } from "./money";

// ---------------------------------------------------------------------------
// Linq channel adapter. Linq is the messaging infrastructure that puts Posy in
// a real iMessage/RCS/SMS thread. Inbound texts arrive via webhook; replies go
// out through the Partner API v3.
//   Send:    POST /api/partner/v3/chats  { from, to[], message.parts[] }
//   Inbound: webhook event_type "message.received"
// ---------------------------------------------------------------------------

const BASE = process.env.LINQ_BASE_URL || "https://api.linqapp.com/api/partner/v3";
const TOKEN = process.env.LINQ_API_TOKEN || "";
const FROM = process.env.LINQ_NUMBER || "";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://posy.getcontios.com";

export const linqMode: "live" | "off" = TOKEN && FROM ? "live" : "off";

// Configure the "Posy" contact card (name + logo) on our number so recipients
// can save us as a real contact instead of a bare number. Idempotent.
export async function configureContactCard() {
  if (linqMode === "off") return { ok: false, skipped: true };
  const payload = {
    phone_number: FROM,
    first_name: "Posy",
    image_url: `${APP_URL}/posy-contact.png`,
  };
  const headers = { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" };
  // Upsert: create, and if one already exists (409) update it via PATCH.
  let res = await fetch(`${BASE}/contact_card`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  if (res.status === 409) {
    res = await fetch(`${BASE}/contact_card?phone_number=${encodeURIComponent(FROM)}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ first_name: "Posy", image_url: `${APP_URL}/posy-contact.png` }),
    });
  }
  const body = await res.text();
  return { ok: res.ok, status: res.status, body: body.slice(0, 300) };
}

let cardEnsured = false;
export async function ensureContactCard() {
  if (cardEnsured || linqMode === "off") return;
  try {
    await configureContactCard();
    cardEnsured = true;
  } catch (e) {
    console.error("[linq] configure contact card failed", e);
  }
}

// Share the configured contact card into a chat (iMessage only, needs a prior
// outbound message in the thread).
export async function shareContactCard(chatId: string) {
  if (linqMode === "off" || !chatId) return { ok: false, skipped: true };
  const res = await fetch(`${BASE}/chats/${chatId}/share_contact_card`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  return { ok: res.ok, status: res.status };
}

// Send a plain-text message to a recipient over Linq.
export async function sendLinqText(to: string, text: string) {
  if (linqMode === "off") {
    console.info("[linq:off] would send to", to, "→", text.slice(0, 80));
    return { ok: false, skipped: true };
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(`${BASE}/chats`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [to],
        message: { parts: [{ type: "text", value: text }] },
      }),
      signal: controller.signal,
    });
    const body = await res.text();
    if (!res.ok) {
      console.error("[linq] send failed", res.status, body.slice(0, 300));
      return { ok: false, status: res.status };
    }
    return { ok: true };
  } finally {
    clearTimeout(timeout);
  }
}

// Render the agent's rich messages into plain text lines suitable for a text
// thread. No emoji, no em dashes, links only after the first message.
export function renderForText(messages: ChatMessage[]): string[] {
  const out: string[] = [];
  for (const m of messages) {
    if (!m.rich) {
      if (m.text) out.push(m.text);
      continue;
    }
    if (m.rich.kind === "options") {
      const d = m.rich.data;
      const lines = d.products.map((p, i) => {
        const star = p.id === d.recommendedId ? " (my pick)" : "";
        return `${i + 1}. ${p.title} - ${money(p.price)} from ${p.merchant}${star}`;
      });
      out.push(lines.join("\n") + "\nReply with a number, or say 'send it' for my pick.");
    } else if (m.rich.kind === "approval") {
      const d = m.rich.data;
      if (!d.guardrail.allowed) {
        out.push(`Spend check: ${d.guardrail.reasons.join(" ")}`);
      } else {
        out.push(`Spend check passed. Reply 'yes' to send ${d.product.title} for ${money(d.amount)}, or 'no'.`);
      }
    } else if (m.rich.kind === "payment") {
      const d = m.rich.data;
      out.push(
        `To pay, open the secure Prava window: ${d.approvalUrl}\nSandbox test card 4622 9431 2313 7789, exp 12/27, cvv 757, otp 456789.\nOr reply 'done' to complete the sandbox checkout for this demo.`
      );
    } else if (m.rich.kind === "receipt") {
      const r = m.rich.data;
      out.push(
        `Gift sent. ${r.product.title} for ${money(r.amount)} to ${r.recipient || "your recipient"}. Paid with Visa ending ${r.card.last4}, order ${r.orderRef}, arrives ${r.eta}.`
      );
    } else if (m.rich.kind === "mandate") {
      const md = m.rich.data;
      out.push(`Recurring gift set: ${md.label}. Capped at ${money(md.cap)} per charge, ${md.recurring_frequency}. Cancel anytime.`);
    }
  }
  return out.filter(Boolean);
}
