import { env } from "@/lib/config/env";
import type { PageSpeedData } from "./types";

const PAGESPEED_ENDPOINT =
  "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";
const TIMEOUT_MS = 10_000;

/**
 * Calls Google PageSpeed Insights for the given URL when
 * PAGESPEED_API_KEY is configured. Returns null on any failure or when the
 * key is absent — the audit must keep working without it (see
 * AI/MASTER_SPEC.md §7.7 and §40).
 */
export async function fetchPageSpeed(
  url: string,
): Promise<PageSpeedData | null> {
  if (!env.PAGESPEED_API_KEY) {
    return null;
  }

  const requestUrl = new URL(PAGESPEED_ENDPOINT);
  requestUrl.searchParams.set("url", url);
  requestUrl.searchParams.set("key", env.PAGESPEED_API_KEY);
  requestUrl.searchParams.set("category", "performance");
  requestUrl.searchParams.set("strategy", "mobile");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(requestUrl, { signal: controller.signal });
    if (!response.ok) return null;

    const data = (await response.json()) as {
      lighthouseResult?: {
        categories?: { performance?: { score?: number } };
      };
    };

    const score = data.lighthouseResult?.categories?.performance?.score;
    if (typeof score !== "number") return null;

    return { performanceScore: Math.round(score * 100), source: "pagespeed" };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
