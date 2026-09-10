import { describe, expect, it } from "vitest";
import { getFreesbeRecommendation } from "@/features/affiliate/freesbeRecommendation";
import type { CategoryResult } from "@/features/audit/types";

function categories(scores: {
  technical?: number;
  seo?: number;
  technicalCap?: boolean;
  seoCap?: boolean;
}): CategoryResult[] {
  const result: CategoryResult[] = [];
  if (scores.technical !== undefined) {
    result.push({
      category: "technical",
      score: scores.technical,
      checks: [],
      capApplied: scores.technicalCap
        ? { reasonCode: "x", label: "x", cap: scores.technical, cappedFrom: 90 }
        : null,
    });
  }
  if (scores.seo !== undefined) {
    result.push({
      category: "seo",
      score: scores.seo,
      checks: [],
      capApplied: scores.seoCap
        ? { reasonCode: "x", label: "x", cap: scores.seo, cappedFrom: 90 }
        : null,
    });
  }
  return result;
}

describe("getFreesbeRecommendation", () => {
  it("shows no CTA when both technical and SEO score 90+", () => {
    const rec = getFreesbeRecommendation(
      categories({ technical: 95, seo: 92 }),
    );
    expect(rec.show).toBe(false);
  });

  it("shows the combined CTA when both technical and SEO are under 75", () => {
    const rec = getFreesbeRecommendation(
      categories({ technical: 60, seo: 50 }),
    );
    expect(rec.show).toBe(true);
    expect(rec.area).toBe("combined");
  });

  it("shows the technical CTA alone when only technical is weak", () => {
    const rec = getFreesbeRecommendation(
      categories({ technical: 55, seo: 95 }),
    );
    expect(rec.area).toBe("technical");
  });

  it("shows the SEO CTA alone when only SEO is weak", () => {
    const rec = getFreesbeRecommendation(
      categories({ technical: 95, seo: 55 }),
    );
    expect(rec.area).toBe("seo");
  });

  it("forces the technical CTA when a critical cap fired even at a high score", () => {
    const rec = getFreesbeRecommendation(
      categories({ technical: 92, technicalCap: true, seo: 95 }),
    );
    expect(rec.show).toBe(true);
    expect(rec.area).toBe("technical");
  });

  it("uses the high-priority copy under score 50", () => {
    const rec = getFreesbeRecommendation(
      categories({ technical: 30, seo: 95 }),
    );
    expect(rec.title).toContain("priorità alta");
  });
});
