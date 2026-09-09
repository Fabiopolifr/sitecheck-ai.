export type AuditSummaryCheckInput = {
  id: string;
  category: string;
  status: string;
};

export type AuditSummaryInput = {
  site_score: number | null;
  industry: string;
  checks: AuditSummaryCheckInput[];
};

export type AuditSummaryPriority = {
  title: string;
  reason: string;
  severity: "high" | "medium" | "low";
};

export type AuditSummary = {
  summary: string;
  top_priorities: AuditSummaryPriority[];
  /** "deterministic" when the AI call was unavailable or failed. */
  provider: string;
  model: string | null;
};

export interface AIProvider {
  generateAuditSummary(input: AuditSummaryInput): Promise<AuditSummary>;
}
