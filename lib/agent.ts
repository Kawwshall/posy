import { chatJSON, openaiMode } from "./openai";
import { GiftBrief, GiftProduct, OptionCard } from "./types";
import { money } from "./money";
import { searchLiveProducts } from "./prava-shopping";

// ---------------------------------------------------------------------------
// The gifting agent. Two responsibilities:
//   1. Understand a free-text request into a structured GiftBrief.
//   2. Curate 3 candidate gifts from the merchant catalog + pick a favorite.
// Live path uses OpenAI (structured JSON). Keyless path uses a genuinely
// useful heuristic so the demo always works.
// ---------------------------------------------------------------------------

const RELATIONSHIP_TAGS: Record<string, string[]> = {
  mom: ["mom", "her", "self-care", "cozy"],
  mother: ["mom", "her", "self-care"],
  dad: ["dad", "him", "coffee", "classic"],
  father: ["dad", "him", "classic"],
  brother: ["brother", "him", "tech", "practical"],
  sister: ["sister", "her", "creative", "cozy"],
  wife: ["her", "romantic", "anniversary", "elegant"],
  husband: ["him", "romantic", "practical"],
  girlfriend: ["her", "romantic", "anniversary"],
  boyfriend: ["him", "romantic", "gadget"],
  friend: ["friend", "fun", "hosting"],
  partner: ["romantic", "anniversary"],
  mentor: ["mentor", "thoughtful", "classic"],
  colleague: ["practical", "hosting"],
};

const OCCASION_TAGS: Record<string, string[]> = {
  birthday: ["fun", "treat"],
  anniversary: ["romantic", "anniversary", "elegant", "personalized"],
  wedding: ["wedding", "elegant", "home"],
  housewarming: ["home", "housewarming", "plants"],
  holiday: ["cozy", "treat"],
  christmas: ["cozy", "treat"],
  graduation: ["personalized", "practical"],
  "thank you": ["thoughtful", "treat"],
};

const INTEREST_WORDS = [
  "coffee", "chai", "tea", "tech", "gaming", "plants", "cooking", "cocktails", "running",
  "fitness", "reading", "writing", "photography", "music", "cozy", "sleep",
  "chocolate", "wellness", "spa", "outdoors", "creative", "fashion",
];

function num(text: string, re: RegExp): number | undefined {
  const m = text.match(re);
  return m ? parseInt(m[1], 10) : undefined;
}

// Parse an INR budget from free text. Handles "k" suffix FIRST so "under 10k"
// and "10k" become 10000 (not 10), plus commas and currency words.
export function parseBudget(t: string): number | undefined {
  const pos = (n: number) => (Number.isFinite(n) && n > 0 ? n : undefined);
  // "10k", "under 10k", "~2.5k", "budget 5k"
  let m = t.match(/(?:under|below|max|upto|up ?to|around|about|~|budget|for)?\s*₹?\s*(\d+(?:\.\d+)?)\s*k\b/);
  if (m) return pos(Math.round(parseFloat(m[1]) * 1000));
  // explicit currency: "₹2,500", "rs 2500", "10000 inr"
  m =
    t.match(/₹\s*([\d,]{2,9})/) ||
    t.match(/(?:rs\.?|inr|rupees)\s*([\d,]{2,9})/) ||
    t.match(/([\d,]{3,9})\s*(?:rupees|inr|rs\.?)/);
  if (m) return pos(parseInt(m[1].replace(/,/g, ""), 10));
  // "under / around / max / budget NNNN"
  m = t.match(/(?:under|below|max|upto|up ?to|around|about|~|budget)\s*₹?\s*([\d,]{2,9})/);
  if (m) return pos(parseInt(m[1].replace(/,/g, ""), 10));
  return undefined;
}

export function heuristicBrief(text: string, prev: GiftBrief): GiftBrief {
  const t = text.toLowerCase();
  const brief: GiftBrief = { ...prev };

  const budget = parseBudget(t);
  if (budget) brief.budget = budget;

  // relationship / recipient
  for (const key of Object.keys(RELATIONSHIP_TAGS)) {
    if (new RegExp(`\\b${key}\\b`).test(t)) {
      brief.relationship = key;
      brief.recipient = brief.recipient || key;
      break;
    }
  }

  // occasion
  for (const key of Object.keys(OCCASION_TAGS)) {
    if (t.includes(key)) {
      brief.occasion = key;
      break;
    }
  }

  // deadline: "by Friday", "in 3 days", "next week", "tomorrow"
  const inDays = num(t, /in\s*(\d{1,2})\s*days?/);
  if (inDays) brief.deadlineDays = inDays;
  else if (t.includes("tomorrow")) brief.deadlineDays = 1;
  else if (t.includes("this week") || /\bby\s+(fri|friday|thu|thursday)\b/.test(t)) brief.deadlineDays = 4;
  else if (t.includes("next week")) brief.deadlineDays = 7;

  // interests
  const interests = new Set(brief.interests || []);
  for (const w of INTEREST_WORDS) if (t.includes(w)) interests.add(w);
  if (interests.size) brief.interests = [...interests];

  brief.notes = prev.notes ? `${prev.notes} ${text}` : text;
  return brief;
}

function feasibilityNote(brief: GiftBrief, top: GiftProduct[]): string {
  const rec = top[0];
  // Build a natural lead-in that never produces awkward possessives like
  // "them's". Use "your mom's birthday" when we know both, degrade gracefully.
  let lead: string;
  if (brief.recipient && brief.occasion) lead = `For your ${brief.recipient}'s ${brief.occasion}`;
  else if (brief.recipient) lead = `For your ${brief.recipient}`;
  else if (brief.occasion) lead = `For this ${brief.occasion}`;
  else lead = "For this one";
  const cap = brief.budget ? `, keeping it under ${money(brief.budget)}` : "";
  const why = rec.description.split(".")[0].toLowerCase();
  return `${lead}${cap}, I'd send the ${rec.title.toLowerCase()}. ${why.charAt(0).toUpperCase()}${why.slice(1)}. A couple of other ideas below if you want options.`;
}

const NO_MATCH =
  "I could not find a real product for that right now. Try a different interest, another occasion, or a higher budget.";

export async function curate(
  userText: string,
  prevBrief: GiftBrief
): Promise<OptionCard> {
  const brief = heuristicBrief(userText, prevBrief);
  const budgetOk = (p: GiftProduct) => brief.budget == null || brief.budget <= 0 || p.price <= brief.budget;

  // Real merchant inventory only. No demo catalogue anywhere.
  const liveQuery = [
    "India",
    brief.recipient || "",
    ...(brief.interests || []),
    brief.occasion || "thoughtful",
    "gift",
  ]
    .filter(Boolean)
    .join(" ");
  const live = await searchLiveProducts(liveQuery);
  const withinBudget = live.filter(budgetOk);
  const pool = withinBudget.length ? withinBudget : live;
  const top = pool.slice(0, 3);

  // Nothing real to show: say so honestly rather than inventing a demo item.
  if (top.length === 0) {
    return { products: [], recommendedId: "", reasoning: NO_MATCH, brief };
  }

  if (openaiMode === "mock") {
    return { products: top, recommendedId: top[0].id, reasoning: feasibilityNote(brief, top), brief };
  }

  try {
    const candidates = pool.slice(0, 8).map((p) => ({
      id: p.id,
      title: p.title,
      price: p.price,
      merchant: p.merchant,
      blurb: p.description,
    }));

    const system = `You are Posy, a warm, tasteful gifting concierge that texts like a thoughtful friend.
You help people pick and send a real gift in India, chosen only from real merchant listings. Be concise (2 to 3 sentences), never pushy, never salesy.
You MUST only pick products from the provided candidates. Every candidate is a real merchant product. Respect the stated budget as a hard cap.
Use the rupee sign for money. Sound like a perceptive human friend: specific, warm, a little imperfect.
Write like a person texting: short sentences, plain punctuation. Never use em dashes or en dashes; use commas, periods or parentheses. No emoji.
Mention the real merchant naturally. Never invent a delivery date; say shipping is confirmed at checkout.
Return STRICT JSON with keys:
{
  "brief": {"recipient","relationship","occasion","budget"(number),"interests"(string[]),"deadlineDays"(number),"notes"},
  "recommendedId": string (one of candidate ids),
  "rankedIds": string[] (2-3 candidate ids, best first),
  "message": string (your warm reply recommending the top pick, referencing why it fits)
}`;

    const user = `Their message: "${userText}"
Known so far: ${JSON.stringify(prevBrief)}
Candidate gifts (only choose from these real products): ${JSON.stringify(candidates)}`;

    const out = await chatJSON(system, user);
    const rankedIds: string[] = (out.rankedIds || [out.recommendedId]).filter(Boolean);
    const chosen = rankedIds
      .map((id: string) => pool.find((p) => p.id === id))
      .filter(Boolean) as GiftProduct[];
    const products = (chosen.length ? chosen : top).slice(0, 3);
    const recommendedId =
      out.recommendedId && products.find((p) => p.id === out.recommendedId)
        ? out.recommendedId
        : products[0].id;

    return {
      products,
      recommendedId,
      reasoning: out.message || feasibilityNote(brief, products),
      brief: { ...brief, ...(out.brief || {}) },
    };
  } catch (e) {
    return { products: top, recommendedId: top[0].id, reasoning: feasibilityNote(brief, top), brief };
  }
}

export function etaFor(days: number): string {
  const d = new Date(Date.now() + days * 24 * 3600_000);
  return d.toLocaleDateString("en-IN", { weekday: "long", month: "short", day: "numeric" });
}
