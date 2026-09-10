import { describe, expect, it } from "vitest";
import {
  getCookieYesRecommendation,
  resolveSupportBoxCopy,
} from "@/features/affiliate/cookieyesRecommendation";
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

  it("names the actual detected trackers in the copy instead of a generic phrase", () => {
    const rec = getCookieYesRecommendation(
      categories([
        check({
          id: "cmp_detected",
          category: "cookie_consent",
          status: "fail",
          value: null,
        }),
        check({
          id: "tracking_meta_pixel",
          category: "tracking",
          status: "warning",
          evidence: "Meta Pixel rilevato",
        }),
      ]),
    );
    expect(rec.title).toContain("Meta Pixel");
    expect(rec.description).toContain("Meta Pixel");
  });

  it("exposes cookieConsentScore and a positive relevanceScore for the admin funnel", () => {
    const rec = getCookieYesRecommendation([
      {
        category: "cookie_consent",
        score: 0,
        checks: [
          check({
            id: "cmp_detected",
            category: "cookie_consent",
            status: "fail",
            value: null,
          }),
        ],
      },
      {
        category: "tracking",
        score: null,
        checks: [
          check({
            id: "tracking_google_analytics",
            category: "tracking",
            status: "warning",
          }),
        ],
      },
    ]);
    expect(rec.cookieConsentScore).toBe(0);
    expect(rec.relevanceScore).toBeGreaterThan(0);
  });

  it("shows the assisted-setup CTA when cookieConsentScore is low", () => {
    const rec = getCookieYesRecommendation([
      {
        category: "cookie_consent",
        score: 40,
        checks: [
          check({
            id: "cmp_detected",
            category: "cookie_consent",
            status: "fail",
            value: null,
          }),
        ],
      },
    ]);
    expect(rec.showSupportCta).toBe(true);
    expect(rec.supportCtaCopy.length).toBeGreaterThan(0);
  });

  it("does not show the assisted-setup CTA for a single tracker with a healthy consent score", () => {
    const rec = getCookieYesRecommendation([
      {
        category: "cookie_consent",
        score: 85,
        checks: [
          check({
            id: "cmp_detected",
            category: "cookie_consent",
            status: "warning",
            value: "generic_banner",
          }),
        ],
      },
      {
        category: "tracking",
        score: null,
        checks: [
          check({
            id: "tracking_google_analytics",
            category: "tracking",
            status: "warning",
          }),
        ],
      },
    ]);
    expect(rec.showSupportCta).toBe(false);
  });
});

describe("resolveSupportBoxCopy", () => {
  it("uses the CookieYes-already-detected copy regardless of score", () => {
    const copy = resolveSupportBoxCopy({
      cookieConsentScore: 30,
      trackerCount: 0,
      cmpVendor: "cookieyes",
    });
    expect(copy.title).toContain("CookieYes è già presente");
  });

  it("prioritizes the 3+ tracker copy over the score tier", () => {
    const copy = resolveSupportBoxCopy({
      cookieConsentScore: 90,
      trackerCount: 3,
      cmpVendor: null,
    });
    expect(copy.title).toContain("più strumenti di tracking");
  });

  it("uses high-emphasis copy for a low cookieConsentScore", () => {
    const copy = resolveSupportBoxCopy({
      cookieConsentScore: 20,
      trackerCount: 0,
      cmpVendor: null,
    });
    expect(copy.title).toContain("priorità");
  });

  it("uses low-emphasis copy for a high cookieConsentScore", () => {
    const copy = resolveSupportBoxCopy({
      cookieConsentScore: 90,
      trackerCount: 0,
      cmpVendor: null,
    });
    expect(copy.title).toContain("verifica della configurazione");
  });

  it("falls back to the MVP default copy when the score is unknown", () => {
    const copy = resolveSupportBoxCopy({
      cookieConsentScore: null,
      trackerCount: 0,
      cmpVendor: null,
    });
    expect(copy.title).toBe("Vuoi che configuriamo CookieYes per te?");
  });
});
