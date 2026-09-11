/**
 * Deterministic variant picker for outreach email subject-line testing —
 * same hashing approach as src/features/audit/abTest.ts, generalized to
 * N variants instead of a 50/50 split. Keyed off the outreach site id so
 * the same site always gets the same variant (relevant for the
 * follow-up, which must stay consistent with what was already sent).
 */
export function pickVariant<T extends { id: string }>(
  seed: string,
  variants: readonly T[],
): T {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % variants.length;
  return variants[index];
}
