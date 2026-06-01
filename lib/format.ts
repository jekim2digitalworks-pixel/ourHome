/**
 * Money helpers. We persist integer minor units everywhere and only convert at
 * the very edges (input parsing / display), so arithmetic never touches floats.
 */

// "₩1,250,000" style. ₩ has no minor unit, so minor == major here.
export function formatKRW(amountMinor: number): string {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(amountMinor);
}

/** Parse a user-typed "12,000" / "1.2만" into integer minor units, safely. */
export function parseToMinor(input: string): number {
  const cleaned = input.replace(/[^\d]/g, "");
  if (!cleaned) return 0;
  // Use BigInt for the parse to dodge 2^53 precision cliffs, then narrow.
  return Number(BigInt(cleaned));
}

/** Sum without floating point — inputs and output are integer minor units. */
export function sumMinor(values: number[]): number {
  return values.reduce((acc, v) => acc + Math.trunc(v), 0);
}
