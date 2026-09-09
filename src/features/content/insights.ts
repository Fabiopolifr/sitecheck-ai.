import { createHash } from "node:crypto";
import type { AuditResult } from "@/features/audit/types";
import type { NewContentInsight } from "./types";

/**
 * AI/MASTER_SPEC.md §15: never publish invented statistics. A statistic
 * derived from the audit database must have a minimum sample size before
 * it can be used in content — default n = 30.
 */
export const MINIMUM_SAMPLE_SIZE = 30;

function queryHash(parts: (string | number)[]): string {
  return createHash("sha256")
    .update(parts.join("|"))
    .digest("hex")
    .slice(0, 16);
}

/**
 * Computes the one metric currently wired for content: the share of
 * completed audits, for a given industry, with a detectable cookie/
 * consent issue (cmp_detected fail or warning). Returns null — not a
 * fabricated placeholder — when the sample is below the threshold.
 */
export function computeCookieConsentInsight(
  audits: AuditResult[],
  industry: string,
): NewContentInsight | null {
  const relevant = audits.filter(
    (a) => a.status === "completed" && a.industry === industry,
  );

  if (relevant.length < MINIMUM_SAMPLE_SIZE) {
    return null;
  }

  const withIssue = relevant.filter((audit) => {
    const cookieConsent = audit.categories.find(
      (c) => c.category === "cookie_consent",
    );
    const cmpCheck = cookieConsent?.checks.find((c) => c.id === "cmp_detected");
    return cmpCheck?.status === "fail" || cmpCheck?.status === "warning";
  });

  const sortedByDate = [...relevant].sort((a, b) =>
    a.completedAt.localeCompare(b.completedAt),
  );
  const periodStart = sortedByDate[0].completedAt;
  const periodEnd = sortedByDate[sortedByDate.length - 1].completedAt;

  return {
    industry,
    metric: "cookie_consent_issue_rate",
    sampleSize: relevant.length,
    value: {
      issueCount: withIssue.length,
      totalCount: relevant.length,
      rate: Math.round((withIssue.length / relevant.length) * 100),
    },
    periodStart,
    periodEnd,
    sourceQueryHash: queryHash([
      "cookie_consent_issue_rate",
      industry,
      relevant.length,
      periodStart,
      periodEnd,
    ]),
  };
}
