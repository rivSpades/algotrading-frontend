/**
 * Symbol order permutations for order-variance runs.
 */

export function factorial(n) {
  const k = Math.max(0, Math.floor(Number(n) || 0));
  if (k <= 1) return 1;
  let out = 1;
  for (let i = 2; i <= k; i += 1) out *= i;
  return out;
}

/** Total distinct priority orders for n symbols (n!). */
export function totalPermutationCount(symbolCount) {
  return factorial(symbolCount);
}

/** Variant runs available excluding Run 0 (reference order). */
export function maxVariantRuns(symbolCount) {
  const total = totalPermutationCount(symbolCount);
  return Math.max(0, total - 1);
}

export function capVariantRuns(symbolCount, requested) {
  const max = maxVariantRuns(symbolCount);
  const req = Math.max(0, Math.floor(Number(requested) || 0));
  return Math.min(req, max);
}
