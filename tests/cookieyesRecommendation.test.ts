import { describe, expect, it } from "vitest";
import { getCookieYesRecommendation } from "@/features/affiliate/cookieyesRecommendation";
import type { Category, Check, CategoryResult } from "@/features/audit/types";

function check(
  overrides: Partial<Check> & Pick<Check, "id" | "category" | "status">,
): Check {
  return {
    value: null,
    confidence: 0.8,
    weight: 10,
    ...overrides,
  };
}

function categories(checks: Check[]): CategoryResult[] {
  const byCategory = new Map<Category, Check[]>();
  for (const c of checks) {
    byCategory.set(c.category, [...(byCategory.get(c.category) ?? []), c]);
  }
  return [...byCategory.entries()].map(([category, categoryChecks]) => ({
    category,
    score: null,
    checks: categoryChecks,
  }));
}

describe("getCookieYesRecommendation", () => {
  it("shows nothing when a CMP is present and no trackers are detected", () => {
    const rec = getCookieYesRecommendation(
      categories([
        check({
          id: "cmp_detected",
          category: "cookie_consent",
          status: "pass",
          value: "iubenda",
        }),
      ]),
    );
    expect(rec.showRecommendation).toBe(false);
  });

  it("recommends tracking_without_cmp when trackers exist with no CMP", () => {
    const rec = getCookieYesRecommendation(
      categories([
        check({
          id: "cmp_detected",
          category: "cookie_consent",
          status: "fail",
          value: null,
        }),
        check({
          id: "tracking_google_analytics",
          category: "tracking",
          status: "warning",
        }),
      ]),
    );
    expect(rec.showRecommendation).toBe(true);
    expect(rec.reasonCode).toBe("tracking_without_cmp");
    expect(rec.priority).toBe("high");
  });

  it("never recommends acquiring CookieYes when it's already detected", () => {
    const rec = getCookieYesRecommendation(
      categories([
        check({
          id: "cmp_detected",
          category: "cookie_consent",
          status: "pass",
          value: "cookieyes",
        }),
        check({
          id: "tracking_meta_pixel",
          category: "tracking",
          status: "warning",
        }),
      ]),
    );
    expect(rec.reasonCode).toBe("cookieyes_detected");
    expect(rec.priority).toBe("low");
  });

  it("flags multiple_trackers when several trackers are detected with a CMP present", () => {
    const rec = getCookieYesRecommendation(
      categories([
        check({
          id: "cmp_detected",
          category: "cookie_consent",
          status: "warning",
          value: "generic_banner",
        }),
        check({
          id: "tracking_google_analytics",
          category: "tracking",
          status: "warning",
        }),
        check({
          id: "tracking_hotjar",
          category: "tracking",
          status: "warning",
        }),
      ]),
    );
    expect(rec.showRecommendation).toBe(true);
    expect(rec.reasonCode).toBe("multiple_trackers");
  });

  it("recommends no_cmp_detected when the CMP is entirely missing even with zero trackers and existing policies", () => {
    // Reproduces a real production case: cmp_detected fails (0/100 for
    // the category) but the static fetch found no trackers and the
    // privacy/cookie policy links are present — this must still surface
    // a recommendation, since the category's own highest-weighted check
    // (cmp_detected, weight 70) failed outright.
    const rec = getCookieYesRecommendation(
      categories([
        check({
          id: "cmp_detected",
          category: "cookie_consent",
          status: "fail",
          value: null,
        }),
        check({
          id: "privacy_policy_link",
          category: "privacy",
          status: "pass",
        }),
        check({
          id: "cookie_policy_link",
          category: "privacy",
          status: "pass",
        }),
      ]),
    );
    expect(rec.showRecommendation).toBe(true);
    expect(rec.reasonCode).toBe("no_cmp_detected");
  });

  it("never lets the recommendation carry a score field back into the audit", () => {
    const rec = getCookieYesRecommendation(
      categories([
        check({
          id: "cmp_detected",
          category: "cookie_consent",
          status: "fail",
          value: null,
        }),
        check({
          id: "tracking_google_analytics",
          category: "tracking",
          status: "warning",
        }),
      ]),
    );
    expect(Object.keys(rec)).not.toContain("score");
  });
});
