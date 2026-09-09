import { describe, expect, it } from "vitest";
import {
  computeCategoryScore,
  computeSiteScore,
  scoreBand,
} from "@/features/audit/scoring";
import type { Check, CategoryResult } from "@/features/audit/types";

function check(overrides: Partial<Check>): Check {
  return {
    id: "test",
    category: "technical",
    status: "pass",
    value: null,
    confidence: 1,
    weight: 10,
    ...overrides,
  };
}

describe("computeCategoryScore", () => {
  it("returns 100 when every check passes", () => {
    const score = computeCategoryScore([
      check({ status: "pass", weight: 50 }),
      check({ status: "pass", weight: 50 }),
    ]);
    expect(score).toBe(100);
  });

  it("returns 0 when every check fails", () => {
    const score = computeCategoryScore([check({ status: "fail" })]);
    expect(score).toBe(0);
  });

  it("weighs checks proportionally", () => {
    const score = computeCategoryScore([
      check({ status: "pass", weight: 80 }),
      check({ status: "fail", weight: 20 }),
    ]);
    expect(score).toBe(80);
  });

  it("ignores unknown-status checks", () => {
    const score = computeCategoryScore([
      check({ status: "pass", weight: 50 }),
      check({ status: "unknown", weight: 50 }),
    ]);
    expect(score).toBe(100);
  });

  it("ignores zero-weight checks", () => {
    const score = computeCategoryScore([
      check({ status: "pass", weight: 50 }),
      check({ status: "fail", weight: 0 }),
    ]);
    expect(score).toBe(100);
  });

  it("returns null when there is nothing scorable", () => {
    expect(computeCategoryScore([check({ status: "unknown" })])).toBeNull();
    expect(computeCategoryScore([])).toBeNull();
  });

  it("weights by confidence", () => {
    const score = computeCategoryScore([
      check({ status: "pass", weight: 50, confidence: 1 }),
      check({ status: "fail", weight: 50, confidence: 0.2 }),
    ]);
    // pass: 50*1=50 weight, fail: 50*0.2=10 weight -> (100*50)/(50+10) ≈ 83
    expect(score).toBeGreaterThan(80);
  });
});

describe("computeSiteScore", () => {
  it("renormalizes over categories that have a score", () => {
    const categories: CategoryResult[] = [
      { category: "technical", score: 100, checks: [] }, // weight 15
      { category: "seo", score: null, checks: [] }, // weight 20, excluded
    ];
    expect(computeSiteScore(categories)).toBe(100);
  });

  it("excludes zero-weight categories like forms", () => {
    const categories: CategoryResult[] = [
      { category: "technical", score: 50, checks: [] },
      { category: "forms", score: 0, checks: [] },
    ];
    expect(computeSiteScore(categories)).toBe(50);
  });

  it("returns null when nothing is scorable", () => {
    expect(
      computeSiteScore([{ category: "technical", score: null, checks: [] }]),
    ).toBeNull();
  });
});

describe("scoreBand", () => {
  it("classifies scores into the documented bands", () => {
    expect(scoreBand(90)).toBe("strong");
    expect(scoreBand(85)).toBe("strong");
    expect(scoreBand(75)).toBe("good");
    expect(scoreBand(70)).toBe("good");
    expect(scoreBand(55)).toBe("needs_attention");
    expect(scoreBand(50)).toBe("needs_attention");
    expect(scoreBand(30)).toBe("critical");
  });
});
