/**
 * Deterministic 50/50 split for the "gated deep-dive" experiment on the
 * results page: half of audits show the full category breakdown
 * immediately (control), half require an email to unlock it (variant).
 * Keyed off the audit id (stable across reloads of the same results page)
 * rather than a cookie, consistent with this app's no-extra-cookies
 * stance (see AI/DECISIONS.md D24).
 *
 * Paused (AI/DECISIONS.md D36): with traffic still low, a 50/50 split
 * doesn't produce a meaningful comparison and just hides the report for
 * half of visitors. Hardcoded to the open/control variant for everyone
 * until there's enough volume to run the test for real — flip the body
 * back to the hash-based split below to resume it.
 */
export function isGatedVariant(): boolean {
  return false;
}
