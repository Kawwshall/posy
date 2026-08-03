import { createPrivateKey, sign } from "node:crypto";
import { GiftProduct } from "./types";

const WALLET_API = "https://pay-api.prava.space";
const AGENT_ID = process.env.PRAVA_AGENT_ID || "";
const PRIVATE_KEY = process.env.PRAVA_AGENT_PRIVATE_KEY || "";

type SearchHit = {
  product_id: string;
  merchant: string;
  title: string;
  image_url?: string;
};

type Variant = {
  id: string;
  label: string;
  priceAmount: number;
  currency: string;
  available: boolean;
  image?: string;
  merchantDomain: string;
};

function signature(timestamp: string, body: string): string {
  const key = createPrivateKey({
    key: Buffer.from(PRIVATE_KEY, "base64"),
    format: "der",
    type: "pkcs8",
  });
  return sign(null, Buffer.from(timestamp + body), key).toString("base64");
}

async function post(path: string, body: Record<string, unknown>) {
  if (!AGENT_ID || !PRIVATE_KEY) throw new Error("Prava shopping agent is not connected");
  const raw = JSON.stringify(body);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(WALLET_API + path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Agent-Id": AGENT_ID,
        "X-Timestamp": timestamp,
        "X-Signature": signature(timestamp, raw),
        "X-Skill-Name": "prava-shopping",
      },
      body: raw,
      signal: controller.signal,
      cache: "no-store",
    });
    const data = await response.json();
    if (!response.ok || data?.success === false) {
      throw new Error(data?.error?.message || `Prava shopping failed (${response.status})`);
    }
    return data.data;
  } finally {
    clearTimeout(timeout);
  }
}

function words(value: string): string[] {
  return [...new Set(value.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 3))].slice(0, 18);
}

async function hydrate(hit: SearchHit): Promise<GiftProduct | undefined> {
  const data = await post("/v1/wallet/shop/product", {
    product_id: hit.product_id,
    merchantDomain: hit.merchant,
  });
  const product = data?.product;
  // Accept any purchasable variant with a price. Merchants return a mix of
  // currencies (many Shopify stores price in USD even when they ship to India),
  // so we no longer require INR. Prefer an INR variant, then cheapest.
  const variants: Variant[] = (product?.variants || []).filter(
    (variant: Variant) => variant.available !== false && variant.priceAmount > 0
  );
  variants.sort((a, b) => {
    const ai = /inr/i.test(a.currency) ? 0 : 1;
    const bi = /inr/i.test(b.currency) ? 0 : 1;
    return ai - bi || a.priceAmount - b.priceAmount;
  });
  const variant = variants[0];
  if (!variant) return undefined;
  // priceAmount is in the currency's minor unit. Convert non-INR to rupees so
  // budgets and the rupee display stay coherent.
  const major = variant.priceAmount / 100;
  const price = /inr/i.test(variant.currency) ? Math.round(major) : Math.round(major * 88);
  const description = String(product.description || hit.title).slice(0, 280);
  const merchant = variant.merchantDomain || hit.merchant;
  return {
    id: `live_${Buffer.from(hit.product_id + merchant).toString("base64url").slice(0, 38)}`,
    externalProductId: hit.product_id,
    variantId: variant.id,
    title: variant.label || hit.title,
    description,
    price,
    currency: "INR",
    merchant,
    merchantUrl: `https://${merchant}`,
    imageUrl: variant.image || hit.image_url || product.images?.[0],
    category: "gift",
    tags: words(`${hit.title} ${description}`),
    rating: 0,
    deliveryDays: 7,
    availabilityLabel: "Available · shipping confirmed at checkout",
    source: "merchant",
  };
}

export async function searchLiveProducts(query: string): Promise<GiftProduct[]> {
  if (!AGENT_ID || !PRIVATE_KEY) return [];
  try {
    const data = await post("/v1/wallet/shop/search", {
      query,
      shipsTo: "IN",
      limit: 8,
    });
    const hits: SearchHit[] = data?.results || [];
    const settled = await Promise.allSettled(hits.slice(0, 8).map(hydrate));
    return settled
      .filter((result): result is PromiseFulfilledResult<GiftProduct | undefined> => result.status === "fulfilled")
      .map((result) => result.value)
      .filter((product): product is GiftProduct => Boolean(product))
      .slice(0, 6);
  } catch (error) {
    console.error("Prava live product search unavailable", error instanceof Error ? error.message : error);
    return [];
  }
}

export const pravaShoppingMode = AGENT_ID && PRIVATE_KEY ? "live" : "fallback";
