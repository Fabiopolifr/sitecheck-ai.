import { describe, expect, it } from "vitest";
import { evaluateOutreachEligibility } from "@/features/outreach/eligibility";
import type { AuditResult, CategoryResult } from "@/features/audit/types";

function audit(categories: CategoryResult[]): AuditResult {
  return {
    id: "audit-1",
    status: "completed",
    requestedUrl: "https://example.it",
    finalUrl: "https://example.it",
    hostname: "example.it",
    industry: "real_estate",
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    siteScore: 70,
    band: "good",
    categories,
  };
}

describe("evaluateOutreachEligibility", () => {
  it("is eligible when a critical cap fired on cookie_consent", () => {
    const result = evaluateOutreachEligibility(
      audit([
        {
          category: "cookie_consent",
          score: 10,
          checks: [],
          capApplied: {
            reasonCode: "cookie_cmp_absent",
            label: "Nessuna piattaforma di consenso rilevata",
            cap: 30,
            cappedFrom: 60,
          },
        },
      ]),
    );
    expect(result.eligible).toBe(true);
    expect(result.reason).toContain("Cookie & Consent");
  });

  it("is eligible when a critical cap fired on privacy", () => {
    const result = evaluateOutreachEligibility(
      audit([
        {
          category: "privacy",
          score: 15,
          checks: [],
          capApplied: {
            reasonCode: "privacy_policy_absent",
            label: "Informativa privacy non rilevata",
            cap: 15,
            cappedFrom: 60,
          },
        },
      ]),
    );
    expect(result.eligible).toBe(true);
    expect(result.reason).toContain("Privacy");
  });

  it("is eligible when the cookie_consent score is low even without a cap", () => {
    const result = evaluateOutreachEligibility(
      audit([{ category: "cookie_consent", score: 40, checks: [] }]),
    );
    expect(result.eligible).toBe(true);
  });

  it("is not eligible when privacy and cookie scores are both healthy", () => {
    const result = evaluateOutreachEligibility(
      audit([
        { category: "cookie_consent", score: 90, checks: [] },
        { category: "privacy", score: 85, checks: [] },
        { category: "seo", score: 20, checks: [] },
      ]),
    );
    expect(result.eligible).toBe(false);
  });
});
