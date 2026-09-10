import { describe, expect, it } from "vitest";
import { resolveComboDiagnosis } from "@/features/audit/comboDiagnosis";
import type { CategoryResult } from "@/features/audit/types";

function results(
  scores: Partial<Record<CategoryResult["category"], number>>,
): CategoryResult[] {
  return (Object.entries(scores) as [CategoryResult["category"], number][]).map(
    ([category, score]) => ({ category, score, checks: [] }),
  );
}

describe("resolveComboDiagnosis", () => {
  it("flags a single critical category surrounded by strong ones", () => {
    const diagnosis = resolveComboDiagnosis(
      results({
        technical: 100,
        seo: 100,
        privacy: 100,
        cookie_consent: 0,
        tracking: 100,
        performance: 100,
      }),
    );
    expect(diagnosis).not.toBeNull();
    expect(diagnosis?.headline).toContain("Cookie & Consent");
  });

  it("returns null when no category is critical", () => {
    const diagnosis = resolveComboDiagnosis(
      results({ technical: 90, seo: 85, privacy: 80, cookie_consent: 78 }),
    );
    expect(diagnosis).toBeNull();
  });

  it("returns null when more than one category is critical", () => {
    const diagnosis = resolveComboDiagnosis(
      results({ technical: 90, seo: 10, privacy: 90, cookie_consent: 5 }),
    );
    expect(diagnosis).toBeNull();
  });

  it("returns null when the other categories aren't consistently strong", () => {
    const diagnosis = resolveComboDiagnosis(
      results({ technical: 60, seo: 90, privacy: 90, cookie_consent: 10 }),
    );
    expect(diagnosis).toBeNull();
  });
});
