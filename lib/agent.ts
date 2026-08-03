import { CATALOG } from "./catalog";
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

export function heuristicBrief(text: string, prev: GiftBrief): GiftBrief {
  const t = text.toLowerCase();
  const brief: GiftBrief = { ...prev };

  // budget: "₹2500", "under 2500", "2.5k", "2500 rupees"
  const budget =
    num(t, /₹\s*(\d{2,6})/) ??
    num(t, /(?:under|below|max|upto|up to|around|about|~)\s*₹?\s*(\d{2,6})/) ??
    num(t, /(\d{2,6})\s*(?:rupees|inr|rs\.?)/) ??
    (() => {
      const m = t.match(/(?:under|below|max|around|about|~)?\s*(\d+(?:\.\d+)?)\s*k\b/);
      return m ? Math.round(Number(m[1]) * 1000) : undefined;
    })();
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

export function scoreProducts(brief: GiftBrief): GiftProduct[] {
  // What someone explicitly says they're into should dominate. It's the
  // clearest signal of taste. Relationship/occasion are softer context.
  const interestTags = new Set((brief.interests || []).map((x) => x.toLowerCase()));
  const contextTags = new Set<string>();
  if (brief.relationship) (RELATIONSHIP_TAGS[brief.relationship] || []).forEach((x) => contextTags.add(x));
  if (brief.occasion) (OCCASION_TAGS[brief.occasion] || []).forEach((x) => contextTags.add(x));

  const scored = CATALOG.map((p) => {
    let score = 0;
    for (const tag of p.tags) {
      if (interestTags.has(tag)) score += 6; // stated interest: heavy
      if (contextTags.has(tag)) score += 2; // inferred context: light
    }
    // budget fit: reward spending a healthy fraction, hard-penalize over-budget
    if (brief.budget != null) {
      if (p.price > brief.budget) score -= 100;
      else {
        const ratio = p.price / brief.budget;
        if (ratio >= 0.6 && ratio <= 0.98) score += 4;
        else if (ratio >= 0.4) score += 2.5;
        else score += 1;
      }
    }
    // deadline feasibility
    if (brief.deadlineDays != null && p.deliveryDays > brief.deadlineDays) score -= 6;
    score += p.rating * 0.5; // gentle quality nudge, not a tie-breaker that overrides fit
    return { p, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.filter((s) => s.score > -50).map((s) => s.p);
}

function feasibilityNote(brief: GiftBrief, top: GiftProduct[]): string {
  const rec = top[0];
  const who = brief.recipient ? `your ${brief.recipient}` : "them";
  const occ = brief.occasion || "gift";
  const cap = brief.budget ? `, keeping it under ${money(brief.budget)}` : "";
  const why = rec.description.split(".")[0].toLowerCase();
  return `For ${who}'s ${occ}${cap}, I'd send the ${rec.title.toLowerCase()}. ${why.charAt(0).toUpperCase()}${why.slice(1)}. A couple of other ideas below if you want options.`;
}

export async function curate(
  userText: string,
  prevBrief: GiftBrief
): Promise<OptionCard> {
  // Always compute a heuristic brief + ranking as the safety net.
  const brief = heuristicBrief(userText, prevBrief);
  const ranked = scoreProducts(brief);
  const liveQuery = [
    "India",
    ...(brief.interests || []),
    brief.occasion || "thoughtful",
    "gift box INR",
  ].join(" ");
  const live = await searchLiveProducts(liveQuery);
  const withinBudget = live.filter((product) => brief.budget == null || product.price <= brief.budget);
  const candidatePool = withinBudget.length ? withinBudget : live.length ? live : ranked;
  const top = candidatePool.slice(0, 3);

  if (openaiMode === "mock" || top.length === 0) {
    const picks = top.length ? top : CATALOG.slice(0, 3);
    return {
      products: picks,
      recommendedId: picks[0].id,
      reasoning: feasibilityNote(brief, picks),
      brief,
    };
  }

  // Live: let OpenAI refine the brief + choose from the shortlisted catalog.
  try {
    const catalogForModel = candidatePool.slice(0, 8).map((p) => ({
      id: p.id,
      title: p.title,
      price: p.price,
      category: p.category,
      tags: p.tags,
      delivery: p.source === "merchant" ? "shipping time confirmed only at checkout" : `${p.deliveryDays} days (demo estimate)`,
      blurb: p.description,
      merchant: p.merchant,
      source: p.source,
    }));

    const system = `You are Posy, a warm, tasteful gifting concierge that texts like a thoughtful friend.
You help people pick and send the perfect gift in India. Be concise (2-3 sentences), never pushy, never salesy.
You MUST only pick products from the provided candidates. Respect the stated budget as a hard cap.
Use ₹ for money. Sound like a perceptive human friend: specific, warm, a little imperfect. Never claim a demo catalog item is live merchant inventory.
Write like a person texting: short sentences, plain punctuation. Never use em dashes or en dashes; use commas, periods, or parentheses instead. No emoji.
When the selected product source is merchant, mention the real merchant naturally. When it is demo, explicitly call it a demo idea.
Never invent or infer a delivery date for live merchant products. Say shipping is confirmed at checkout.
Return STRICT JSON with keys:
{
  "brief": {"recipient","relationship","occasion","budget"(number),"interests"(string[]),"deadlineDays"(number),"notes"},
  "recommendedId": string (one of candidate ids),
  "rankedIds": string[] (2-3 candidate ids, best first),
  "message": string (your warm text-message reply recommending the top pick, referencing why it fits)
}`;

    const user = `Their message: "${userText}"
Known so far: ${JSON.stringify(prevBrief)}
Candidate gifts (only choose from these): ${JSON.stringify(catalogForModel)}`;

    const out = await chatJSON(system, user);
    const rankedIds: string[] = (out.rankedIds || [out.recommendedId]).filter(
      Boolean
    );
    const chosen = rankedIds
      .map((id: string) => candidatePool.find((p) => p.id === id))
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
    // Any OpenAI hiccup: fall back gracefully to the heuristic result.
    const picks = top.length ? top : CATALOG.slice(0, 3);
    return {
      products: picks,
      recommendedId: picks[0].id,
      reasoning: feasibilityNote(brief, picks),
      brief,
    };
  }
}

export function etaFor(days: number): string {
  const d = new Date(Date.now() + days * 24 * 3600_000);
  return d.toLocaleDateString("en-IN", { weekday: "long", month: "short", day: "numeric" });
}
