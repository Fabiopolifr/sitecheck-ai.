/**
 * Deterministic 50/50 split for the "gated deep-dive" experiment on the
 * results page: half of audits show the full category breakdown
 * immediately (control), half require an email to unlock it (variant).
 * Keyed off the audit id (stable across reloads of the same results page)
 * rather than a cookie, consistent with this app's no-extra-cookies
 * stance (see AI/DECISIONS.md D24).
 */
export function isGatedVariant(auditId: string): boolean {
  let hash = 0;
  for (let i = 0; i < auditId.length; i++) {
    hash = (hash * 31 + auditId.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 2 === 0;
}
