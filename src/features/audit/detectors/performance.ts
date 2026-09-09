import type { Check, DetectorContext } from "../types";

export function detectPerformance(ctx: DetectorContext): Check[] {
  if (ctx.pageSpeed) {
    const score = ctx.pageSpeed.performanceScore;
    return [
      {
        id: "pagespeed_performance_score",
        category: "performance",
        status: score >= 80 ? "pass" : score >= 50 ? "warning" : "fail",
        value: score,
        confidence: 0.95,
        evidence: "Google PageSpeed Insights (mobile)",
        weight: 100,
      },
    ];
  }

  // Fallback when PAGESPEED_API_KEY is not configured: a lightweight
  // internal timing signal, per AI/MASTER_SPEC.md §7.7.
  const { elapsedMs } = ctx;
  return [
    {
      id: "response_time",
      category: "performance",
      status: elapsedMs < 800 ? "pass" : elapsedMs < 2000 ? "warning" : "fail",
      value: elapsedMs,
      confidence: 0.5,
      evidence:
        "PageSpeed Insights non disponibile: metrica interna di fallback",
      weight: 100,
    },
  ];
}
