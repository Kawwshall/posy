import { db } from "./store";
import { GiftProduct, GuardrailDecision } from "./types";
import { money } from "./money";

// The trust layer. Every candidate purchase is checked against the user's
// spend policy BEFORE any card is issued. This is what makes an autonomous
// agent safe to hand a payment credential, and it's exactly the
// transparency/control story Visa + Prava care about.
export function checkGuardrails(
  product: GiftProduct,
  briefBudget?: number
): GuardrailDecision {
  const g = db().guardrails;
  const reasons: string[] = [];
  let allowed = true;
  let requiresApproval = false;

  // 1. Per-gift hard cap
  if (product.price > g.perGiftCap) {
    allowed = false;
    reasons.push(
      `${money(product.price)} exceeds your per-gift cap of ${money(g.perGiftCap)}.`
    );
  }

  // 2. The budget the user stated in this brief is itself a hard cap
  if (briefBudget != null && product.price > briefBudget) {
    allowed = false;
    reasons.push(
      `${money(product.price)} is over the ${money(briefBudget)} budget you set for this gift.`
    );
  }

  // 3. Rolling monthly cap
  const projected = db().monthSpent + product.price;
  if (projected > g.monthlyCap) {
    allowed = false;
    reasons.push(
      `This would push your monthly gifting to ${money(projected)}, over your ${money(g.monthlyCap)} cap.`
    );
  }

  // 4. Blocked categories
  if (g.blockedCategories.includes(product.category)) {
    allowed = false;
    reasons.push(`Category "${product.category}" is blocked in your policy.`);
  }

  // 5. Step-up approval threshold
  if (allowed && product.price > g.requireApprovalOver) {
    requiresApproval = true;
    reasons.push(
      `Over your ${money(g.requireApprovalOver)} auto-approve line, so I'll need your OK.`
    );
  }

  if (allowed && reasons.length === 0) {
    reasons.push("Within all spend limits. Cleared to purchase.");
  }

  return { allowed, requiresApproval, reasons };
}
