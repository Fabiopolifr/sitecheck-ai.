import { getAIProvider } from "@/lib/ai";
import type { AuditSummary, AuditSummaryInput } from "@/lib/ai";
import { auditSummarySchema } from "@/lib/ai/schema";
import { CATEGORY_LABELS } from "./labels";
import type { AuditResult, Check } from "./types";

function buildProviderInput(audit: AuditResult): AuditSummaryInput {
  return {
    site_score: audit.siteScore,
    industry: audit.industry,
    checks: audit.categories.flatMap((category) =>
      category.checks.map((check) => ({
        id: check.id,
        category: category.category,
        status: check.status,
      })),
    ),
  };
}

/**
 * Deterministic, template-based summary — used whenever no AI provider is
 * configured, or the AI call fails/returns invalid output. The audit must
 * never depend on AI availability (AI/MASTER_SPEC.md §9, §40).
 */
function buildDeterministicSummary(audit: AuditResult): AuditSummary {
  const allChecks = audit.categories.flatMap((c) => c.checks);
  const issues = allChecks
    .filter((c) => c.status === "fail" || c.status === "warning")
    .sort((a, b) => {
      const severity = (c: Check) => (c.status === "fail" ? 1 : 0);
      if (severity(b) !== severity(a)) return severity(b) - severity(a);
      return b.weight * b.confidence - a.weight * a.confidence;
    });

  const scoreText =
    audit.siteScore === null
      ? "Il punteggio non è disponibile."
      : `Il Site Score rilevato è ${audit.siteScore}/100.`;

  const issueCategories = [
    ...new Set(
      issues
        .slice(0, 3)
        .map(
          (check) =>
            audit.categories.find((c) => c.checks.includes(check))?.category,
        )
        .filter((c): c is NonNullable<typeof c> => Boolean(c)),
    ),
  ]
    .map((c) => CATEGORY_LABELS[c])
    .join(", ");

  const summary =
    issues.length === 0
      ? `${scoreText} Nessuna criticità significativa rilevata durante questa scansione.`
      : `${scoreText} Elementi da verificare individuati in: ${issueCategories}.`;

  const topPriorities = issues.slice(0, 3).map((check) => ({
    title: check.id,
    reason:
      check.evidence ??
      "elemento da verificare, configurazione da approfondire.",
    severity: (check.status === "fail" ? "high" : "medium") as
      "high" | "medium",
  }));

  return {
    summary,
    top_priorities: topPriorities,
    provider: "deterministic",
    model: null,
  };
}

/**
 * Generates a concise interpretation of the audit for a completed audit.
 * Always resolves — never throws — falling back to a deterministic
 * template on any AI failure (network error, invalid JSON, schema
 * mismatch) so the results page is never blocked on AI availability.
 *
 * Output is re-validated here, at the orchestration layer, rather than
 * trusting each AIProvider implementation to have validated it correctly
 * itself — a provider that skips validation must not be able to put
 * unvalidated data in front of the user (AI/MASTER_SPEC.md §9).
 */
export async function generateAuditSummary(
  audit: AuditResult,
): Promise<AuditSummary> {
  const provider = getAIProvider();
  if (!provider) {
    return buildDeterministicSummary(audit);
  }

  try {
    const result = await provider.generateAuditSummary(
      buildProviderInput(audit),
    );
    const validated = auditSummarySchema.parse(result);
    return {
      ...result,
      summary: validated.summary,
      top_priorities: validated.top_priorities,
    };
  } catch (error) {
    console.error("AI summary generation failed, using fallback:", error);
    return buildDeterministicSummary(audit);
  }
}
