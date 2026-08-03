import { GiftProduct } from "./types";

// No demo inventory. Posy uses only real merchant products returned by Prava
// live product search. This stays empty on purpose.
export const CATALOG: GiftProduct[] = [];

export function findProduct(id: string): GiftProduct | undefined {
  return CATALOG.find((p) => p.id === id);
}
