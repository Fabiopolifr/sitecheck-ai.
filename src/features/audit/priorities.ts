import type { Check } from "./types";
import type { AuditSummary } from "@/lib/ai";

export type DisplayPriority = {
  title: string;
  reason: string;
  severity: "high" | "medium" | "low";
};

function topFailingChecks(checks: Check[], limit: number): Check[] {
  return checks
    .filter((c) => c.status === "fail" || c.status === "warning")
    .sort((a, b) => {
      const severity = (c: Check) => (c.status === "fail" ? 1 : 0);
      if (severity(b) !== severity(a)) return severity(b) - severity(a);
      return b.weight * b.confidence - a.weight * a.confidence;
    })
    .slice(0, limit);
}

/**
 * The 1-3 priorities shown on the results page and reused verbatim in
 * the lead-capture email, so the email actually reflects the audit
 * instead of a generic "thanks" message — see AI/DECISIONS.md.
 */
export function resolvePriorities(
  checks: Check[],
  summary: AuditSummary | undefined,
  limit = 3,
): DisplayPriority[] {
  if (summary?.top_priorities.length) return summary.top_priorities;

  return topFailingChecks(checks, limit).map((check) => ({
    title: check.id,
    reason: check.evidence ?? "elemento da verificare",
    severity: check.status === "fail" ? "high" : "medium",
  }));
}
