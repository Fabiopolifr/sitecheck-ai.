import type { AuditResult } from "@/features/audit/types";
import type { Lead } from "@/lib/db/leadsRepository";
import type { AffiliateClick } from "@/lib/db/affiliateRepository";
import type { AnalyticsEvent } from "@/lib/db/eventsRepository";

export type TopIssue = { checkId: string; count: number };
export type TopTechnology = { trackerId: string; count: number };

export type AdminMetrics = {
  totalAudits: number;
  auditsToday: number;
  auditsLast7Days: number;
  averageSiteScore: number | null;
  totalLeads: number;
  emailCaptureRate: number | null;
  affiliateClicks: number;
  affiliateCtr: number | null;
  topIssues: TopIssue[];
  topTechnologies: TopTechnology[];
  recentAudits: AuditResult[];
};

function isSameUtcDay(a: Date, b: Date): boolean {
  return a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10);
}

export function computeAdminMetrics(
  audits: AuditResult[],
  leads: Lead[],
  affiliateClicks: AffiliateClick[],
): AdminMetrics {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const completed = audits.filter((a) => a.status === "completed");

  const auditsToday = audits.filter((a) =>
    isSameUtcDay(new Date(a.completedAt), now),
  ).length;

  const auditsLast7Days = audits.filter(
    (a) => new Date(a.completedAt) >= sevenDaysAgo,
  ).length;

  const scores = completed
    .map((a) => a.siteScore)
    .filter((s): s is number => s !== null);
  const averageSiteScore =
    scores.length === 0
      ? null
      : Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length);

  const emailCaptureRate =
    audits.length === 0 ? null : leads.length / audits.length;

  const affiliateCtr =
    audits.length === 0 ? null : affiliateClicks.length / audits.length;

  const issueCounts = new Map<string, number>();
  const techCounts = new Map<string, number>();
  for (const audit of completed) {
    for (const category of audit.categories) {
      for (const check of category.checks) {
        if (check.status === "fail" || check.status === "warning") {
          issueCounts.set(check.id, (issueCounts.get(check.id) ?? 0) + 1);
        }
        if (category.category === "tracking" && check.status === "warning") {
          techCounts.set(check.id, (techCounts.get(check.id) ?? 0) + 1);
        }
      }
    }
  }

  const topIssues = [...issueCounts.entries()]
    .map(([checkId, count]) => ({ checkId, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const topTechnologies = [...techCounts.entries()]
    .map(([trackerId, count]) => ({ trackerId, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const recentAudits = [...audits]
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
    .slice(0, 20);

  return {
    totalAudits: audits.length,
    auditsToday,
    auditsLast7Days,
    averageSiteScore,
    totalLeads: leads.length,
    emailCaptureRate,
    affiliateClicks: affiliateClicks.length,
    affiliateCtr,
    topIssues,
    topTechnologies,
    recentAudits,
  };
}

export type FunnelMetrics = {
  landingViews: number;
  auditsStarted: number;
  auditsCompleted: number;
  resultsViewed: number;
  emailsSubmitted: number;
  affiliateClicked: number;
  landingToAuditStartRate: number | null;
  auditStartToCompletionRate: number | null;
  resultsToEmailCaptureRate: number | null;
  resultsToAffiliateClickRate: number | null;
};

function rate(numerator: number, denominator: number): number | null {
  return denominator === 0 ? null : numerator / denominator;
}

export type AbVariantMetrics = {
  variant: "gated" | "open";
  resultsViewed: number;
  emailsSubmitted: number;
  conversionRate: number | null;
};

export type AbTestMetrics = {
  gated: AbVariantMetrics;
  open: AbVariantMetrics;
};

/**
 * Conversion of the "gated deep-dive" experiment (AI/DECISIONS.md D31),
 * split by the abVariant metadata on results_viewed and the source
 * metadata on email_submitted — both already recorded, no extra schema.
 */
export function computeAbTestMetrics(events: AnalyticsEvent[]): AbTestMetrics {
  function build(variant: "gated" | "open"): AbVariantMetrics {
    const resultsViewed = events.filter(
      (e) =>
        e.eventName === "results_viewed" && e.metadata?.abVariant === variant,
    ).length;
    const source = variant === "gated" ? "gate" : "default";
    const emailsSubmitted = events.filter(
      (e) => e.eventName === "email_submitted" && e.metadata?.source === source,
    ).length;
    return {
      variant,
      resultsViewed,
      emailsSubmitted,
      conversionRate: rate(emailsSubmitted, resultsViewed),
    };
  }

  return { gated: build("gated"), open: build("open") };
}

/**
 * Conversion funnel per AI/MASTER_SPEC.md §33, computed from
 * `analytics_events` rather than the domain tables (audits/leads/
 * affiliate_clicks) — those measure completed actions, this measures the
 * funnel a visitor actually moved through.
 */
export function computeFunnelMetrics(events: AnalyticsEvent[]): FunnelMetrics {
  const count = (name: AnalyticsEvent["eventName"]) =>
    events.filter((e) => e.eventName === name).length;

  const landingViews = count("landing_view");
  const auditsStarted = count("audit_started");
  const auditsCompleted = count("audit_completed");
  const resultsViewed = count("results_viewed");
  const emailsSubmitted = count("email_submitted");
  const affiliateClickedCount = count("affiliate_clicked");

  return {
    landingViews,
    auditsStarted,
    auditsCompleted,
    resultsViewed,
    emailsSubmitted,
    affiliateClicked: affiliateClickedCount,
    landingToAuditStartRate: rate(auditsStarted, landingViews),
    auditStartToCompletionRate: rate(auditsCompleted, auditsStarted),
    resultsToEmailCaptureRate: rate(emailsSubmitted, resultsViewed),
    resultsToAffiliateClickRate: rate(affiliateClickedCount, resultsViewed),
  };
}
