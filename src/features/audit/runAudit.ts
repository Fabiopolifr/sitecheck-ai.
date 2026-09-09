import { randomUUID } from "node:crypto";
import * as cheerio from "cheerio";
import { safeFetch } from "@/lib/security/safeFetch";
import { normalizeUrl } from "./url";
import { buildCategoryResults, computeSiteScore, scoreBand } from "./scoring";
import { fetchPageSpeed } from "./pagespeed";
import { detectTechnical } from "./detectors/technical";
import { detectSeo } from "./detectors/seo";
import { detectPrivacy } from "./detectors/privacy";
import { detectCookieConsent } from "./detectors/cookieConsent";
import { detectTracking } from "./detectors/tracking";
import { detectPerformance } from "./detectors/performance";
import { detectForms } from "./detectors/forms";
import type { AuditResult, Category, Check, DetectorContext } from "./types";

const DETECTORS: {
  category: Category;
  run: (ctx: DetectorContext) => Check[];
}[] = [
  { category: "technical", run: detectTechnical },
  { category: "seo", run: detectSeo },
  { category: "privacy", run: detectPrivacy },
  { category: "cookie_consent", run: detectCookieConsent },
  { category: "tracking", run: detectTracking },
  { category: "performance", run: detectPerformance },
  { category: "forms", run: detectForms },
];

export type RunAuditResult =
  { ok: true; audit: AuditResult } | { ok: false; error: string };

export async function runAudit(
  rawInput: string,
  industry = "real_estate",
): Promise<RunAuditResult> {
  const startedAt = new Date().toISOString();
  const normalized = normalizeUrl(rawInput);

  if (!normalized.ok) {
    return { ok: false, error: normalized.error };
  }

  const requestedUrl = normalized.url.toString();
  const fetchResult = await safeFetch(normalized.url);

  if (!fetchResult.ok) {
    return {
      ok: true,
      audit: {
        id: randomUUID(),
        status: "failed",
        requestedUrl,
        finalUrl: null,
        hostname: normalized.url.hostname,
        industry,
        startedAt,
        completedAt: new Date().toISOString(),
        siteScore: null,
        band: null,
        categories: [],
        failureReason: fetchResult.message,
      },
    };
  }

  const $ = cheerio.load(fetchResult.html);
  const finalUrl = new URL(fetchResult.finalUrl);
  const pageSpeed = await fetchPageSpeed(fetchResult.finalUrl);

  const ctx: DetectorContext = {
    html: fetchResult.html,
    $,
    finalUrl,
    status: fetchResult.status,
    contentType: fetchResult.contentType,
    elapsedMs: fetchResult.elapsedMs,
    pageSpeed,
  };

  const checksByCategory: Partial<Record<Category, Check[]>> = {};
  for (const { category, run } of DETECTORS) {
    try {
      checksByCategory[category] = run(ctx);
    } catch (error) {
      // One failing detector must not crash the whole audit
      // (AI/MASTER_SPEC.md §29 — graceful degradation).
      console.error(`Detector "${category}" failed:`, error);
      checksByCategory[category] = [];
    }
  }

  const categories = buildCategoryResults(checksByCategory);
  const siteScore = computeSiteScore(categories);

  return {
    ok: true,
    audit: {
      id: randomUUID(),
      status: "completed",
      requestedUrl,
      finalUrl: fetchResult.finalUrl,
      hostname: finalUrl.hostname,
      industry,
      startedAt,
      completedAt: new Date().toISOString(),
      siteScore,
      band: siteScore === null ? null : scoreBand(siteScore),
      categories,
    },
  };
}
