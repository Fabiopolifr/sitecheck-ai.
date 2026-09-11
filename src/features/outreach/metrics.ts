import type { Lead } from "@/lib/db/leadsRepository";
import type { OutreachSite } from "./types";

export type OutreachVariantStat = {
  variant: string;
  sent: number;
  clicked: number;
  converted: number;
  clickRate: number | null;
  conversionRate: number | null;
};

function rate(count: number, total: number): number | null {
  return total > 0 ? count / total : null;
}

/**
 * Per-subject-line-variant funnel (sent → clicked report link → lead
 * captured on that audit) — see AI/DECISIONS.md D42. `sentField` /
 * `variantField` let this serve both the first-contact email and the
 * follow-up, which are tracked as separate variant sets.
 */
function computeStatsFor(
  sites: OutreachSite[],
  convertedAuditIds: Set<string>,
  sentField: "emailedAt" | "followUpSentAt",
  variantField: "emailVariant" | "followUpVariant",
): OutreachVariantStat[] {
  const sent = sites.filter(
    (s) => s[sentField] !== null && s[variantField] !== null,
  );

  const byVariant = new Map<string, OutreachSite[]>();
  for (const site of sent) {
    const variant = site[variantField]!;
    const list = byVariant.get(variant) ?? [];
    list.push(site);
    byVariant.set(variant, list);
  }

  return Array.from(byVariant.entries())
    .map(([variant, list]) => {
      const clicked = list.filter((s) => s.clickedAt !== null).length;
      const converted = list.filter(
        (s) => s.auditId && convertedAuditIds.has(s.auditId),
      ).length;
      return {
        variant,
        sent: list.length,
        clicked,
        converted,
        clickRate: rate(clicked, list.length),
        conversionRate: rate(converted, list.length),
      };
    })
    .sort((a, b) => a.variant.localeCompare(b.variant));
}

export function computeOutreachVariantStats(
  sites: OutreachSite[],
  leads: Lead[],
): {
  initial: OutreachVariantStat[];
  followUp: OutreachVariantStat[];
} {
  const convertedAuditIds = new Set(
    leads.map((l) => l.auditId).filter((id): id is string => id !== null),
  );

  return {
    initial: computeStatsFor(
      sites,
      convertedAuditIds,
      "emailedAt",
      "emailVariant",
    ),
    followUp: computeStatsFor(
      sites,
      convertedAuditIds,
      "followUpSentAt",
      "followUpVariant",
    ),
  };
}
