import { z } from "zod";

/**
 * Validates AI-generated output before it is ever stored or displayed
 * (AI/MASTER_SPEC.md §9: "Validate model output before storing/displaying
 * it"). The model receives structured JSON and must reply with structured
 * JSON matching this exact shape.
 */
export const auditSummarySchema = z.object({
  summary: z.string().min(1).max(2000),
  top_priorities: z
    .array(
      z.object({
        title: z.string().min(1).max(200),
        reason: z.string().min(1).max(500),
        severity: z.enum(["high", "medium", "low"]),
      }),
    )
    .max(10),
});

export type ValidatedAuditSummary = z.infer<typeof auditSummarySchema>;
