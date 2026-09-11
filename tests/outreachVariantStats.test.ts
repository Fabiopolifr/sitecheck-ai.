import { describe, expect, it } from "vitest";
import { computeOutreachVariantStats } from "@/features/outreach/metrics";
import type { OutreachSite } from "@/features/outreach/types";
import type { Lead } from "@/lib/db/leadsRepository";

function site(overrides: Partial<OutreachSite>): OutreachSite {
  return {
    id: overrides.id ?? "site-1",
    source: "manual",
    businessName: "Test",
    website: "https://example.it",
    domain: "example.it",
    city: null,
    queryUsed: null,
    auditId: null,
    siteScore: null,
    band: null,
    contactEmail: "info@example.it",
    eligible: true,
    eligibilityReason: "x",
    status: "emailed",
    createdAt: new Date().toISOString(),
    analyzedAt: new Date().toISOString(),
    emailedAt: null,
    emailVariant: null,
    clickedAt: null,
    followUpSentAt: null,
    followUpVariant: null,
    ...overrides,
  };
}

function lead(auditId: string): Lead {
  return {
    id: `lead-${auditId}`,
    auditId,
    email: "lead@example.it",
    firstName: null,
    consentMarketing: true,
    supportRequested: false,
    supportPhone: null,
    supportReason: null,
    supportStatus: "new",
    supportRequestedAt: null,
    createdAt: new Date().toISOString(),
  };
}

describe("computeOutreachVariantStats", () => {
  it("counts sent, clicked and converted per variant", () => {
    const sites = [
      site({
        id: "a1",
        emailedAt: new Date().toISOString(),
        emailVariant: "A",
        clickedAt: new Date().toISOString(),
        auditId: "audit-1",
      }),
      site({
        id: "a2",
        emailedAt: new Date().toISOString(),
        emailVariant: "A",
        auditId: "audit-2",
      }),
      site({
        id: "b1",
        emailedAt: new Date().toISOString(),
        emailVariant: "B",
        clickedAt: new Date().toISOString(),
        auditId: "audit-3",
      }),
    ];
    const leads = [lead("audit-1"), lead("audit-3")];

    const { initial } = computeOutreachVariantStats(sites, leads);
    const variantA = initial.find((v) => v.variant === "A")!;
    const variantB = initial.find((v) => v.variant === "B")!;

    expect(variantA.sent).toBe(2);
    expect(variantA.clicked).toBe(1);
    expect(variantA.converted).toBe(1);
    expect(variantA.conversionRate).toBe(0.5);

    expect(variantB.sent).toBe(1);
    expect(variantB.converted).toBe(1);
    expect(variantB.conversionRate).toBe(1);
  });

  it("ignores sites with no variant sent yet", () => {
    const sites = [site({ status: "queued", emailedAt: null })];
    const { initial } = computeOutreachVariantStats(sites, []);
    expect(initial).toHaveLength(0);
  });

  it("tracks follow-up variants separately from first-contact variants", () => {
    const sites = [
      site({
        id: "f1",
        emailedAt: new Date().toISOString(),
        emailVariant: "A",
        followUpSentAt: new Date().toISOString(),
        followUpVariant: "F1",
        auditId: "audit-4",
      }),
    ];
    const { initial, followUp } = computeOutreachVariantStats(sites, [
      lead("audit-4"),
    ]);

    expect(initial.find((v) => v.variant === "A")?.converted).toBe(1);
    expect(followUp.find((v) => v.variant === "F1")?.converted).toBe(1);
  });
});
