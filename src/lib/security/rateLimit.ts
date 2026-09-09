/**
 * Minimal in-memory sliding-window rate limiter, per IP. Not shared across
 * server instances — acceptable for Phase 1 (single-instance deployment);
 * revisit if abuse prevention needs a shared store (AI/MASTER_SPEC.md §27).
 */
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 10;

const hits = new Map<string, number[]>();

export function isRateLimited(
  key: string,
  maxRequests = MAX_REQUESTS_PER_WINDOW,
  windowMs = WINDOW_MS,
): boolean {
  const now = Date.now();
  const timestamps = (hits.get(key) ?? []).filter((t) => now - t < windowMs);

  if (timestamps.length >= maxRequests) {
    hits.set(key, timestamps);
    return true;
  }

  timestamps.push(now);
  hits.set(key, timestamps);
  return false;
}
