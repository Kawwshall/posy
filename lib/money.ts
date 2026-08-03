export const CURRENCY = "INR" as const;

const formatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: CURRENCY,
  maximumFractionDigits: 0,
});

export function money(amount: number): string {
  return formatter.format(amount);
}

