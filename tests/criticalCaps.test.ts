import { describe, expect, it } from "vitest";
import { applyCriticalCaps } from "@/features/audit/criticalCaps";
import type { CategoryResult, Check } from "@/features/audit/types";

function check(
  overrides: Partial<Check> & Pick<Check, "id" | "category" | "status">,
): Check {
  return { value: null, confidence: 1, weight: 10, ...overrides };
}

describe("applyCriticalCaps", () => {
  it("caps SEO to 10 when the page is noindex, even if the raw average is high", () => {
    const categories: CategoryResult[] = [
      {
        category: "seo",
        score: 85,
        checks: [
          check({ id: "indexability", category: "seo", status: "fail" }),
          check({ id: "title_length", category: "seo", status: "pass" }),
        ],
      },
    ];
    const result = applyCriticalCaps(categories);
    expect(result[0].score).toBe(10);
    expect(result[0].capApplied?.reasonCode).toBe("seo_page_noindex");
    expect(result[0].capApplied?.cappedFrom).toBe(85);
  });

  it("caps cookie_consent to 10 when no CMP is detected and trackers are active", () => {
    const categories: CategoryResult[] = [
      {
        category: "cookie_consent",
        score: 60,
        checks: [
          check({
            id: "cmp_detected",
            category: "cookie_consent",
            status: "fail",
          }),
          check({
            id: "consent_before_tracking",
            category: "cookie_consent",
            status: "fail",
          }),
        ],
      },
    ];
    const result = applyCriticalCaps(categories);
    expect(result[0].score).toBe(10);
    expect(result[0].capApplied?.reasonCode).toBe(
      "cookie_cmp_absent_trackers_active",
    );
  });

  it("does not touch a category with no triggering finding", () => {
    const categories: CategoryResult[] = [
      {
        category: "technical",
        score: 92,
        checks: [check({ id: "https", category: "technical", status: "pass" })],
      },
    ];
    const result = applyCriticalCaps(categories);
    expect(result[0].score).toBe(92);
    expect(result[0].capApplied).toBeNull();
  });

  it("never raises a score that was already below the cap", () => {
    const categories: CategoryResult[] = [
      {
        category: "privacy",
        score: 5,
        checks: [
          check({
            id: "privacy_policy_link",
            category: "privacy",
            status: "fail",
          }),
        ],
      },
    ];
    const result = applyCriticalCaps(categories);
    expect(result[0].score).toBe(5);
    expect(result[0].capApplied).toBeNull();
  });
});
