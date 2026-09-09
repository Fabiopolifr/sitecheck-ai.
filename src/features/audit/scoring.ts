import type { Category, Check, CategoryResult, ScoreBand } from "./types";

/**
 * Scoring configuration, kept centralized and separate from UI/detector
 * code per AI/MASTER_SPEC.md §8 ("Avoid hardcoding scoring logic across UI
 * components"). "forms" carries no weight: it is informational only (see
 * AI/DECISIONS.md).
 */
export const CATEGORY_WEIGHTS: Record<Category, number> = {
  technical: 15,
  seo: 20,
  privacy: 15,
  cookie_consent: 20,
  tracking: 15,
  performance: 15,
  forms: 0,
};

const STATUS_VALUE: Record<Check["status"], number | null> = {
  pass: 100,
  warning: 60,
  fail: 0,
  unknown: null,
};

export function computeCategoryScore(checks: Check[]): number | null {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const check of checks) {
    const statusValue = STATUS_VALUE[check.status];
    if (statusValue === null || check.weight <= 0) continue;

    const effectiveWeight = check.weight * check.confidence;
    weightedSum += statusValue * effectiveWeight;
    totalWeight += effectiveWeight;
  }

  if (totalWeight === 0) return null;
  return Math.round(weightedSum / totalWeight);
}

export function buildCategoryResults(
  checksByCategory: Partial<Record<Category, Check[]>>,
): CategoryResult[] {
  return (Object.keys(CATEGORY_WEIGHTS) as Category[]).map((category) => {
    const checks = checksByCategory[category] ?? [];
    return {
      category,
      score: computeCategoryScore(checks),
      checks,
    };
  });
}

export function computeSiteScore(categories: CategoryResult[]): number | null {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const { category, score } of categories) {
    if (score === null) continue;
    const weight = CATEGORY_WEIGHTS[category];
    if (weight <= 0) continue;

    weightedSum += score * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) return null;
  return Math.round(weightedSum / totalWeight);
}

export function scoreBand(score: number): ScoreBand {
  if (score >= 85) return "strong";
  if (score >= 70) return "good";
  if (score >= 50) return "needs_attention";
  return "critical";
}
