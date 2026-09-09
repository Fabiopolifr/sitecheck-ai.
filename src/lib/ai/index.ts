import { env } from "@/lib/config/env";
import { createAnthropicProvider } from "./providers/anthropicProvider";
import type { AIProvider } from "./types";

export type {
  AIProvider,
  AuditSummary,
  AuditSummaryInput,
  AuditSummaryPriority,
} from "./types";

/**
 * Returns the configured AI provider, or null when none is configured
 * (AI_PROVIDER/AI_API_KEY absent). Callers must always have a
 * deterministic fallback path — see src/features/audit/aiSummary.ts —
 * the audit must never depend on AI availability (AI/MASTER_SPEC.md §9).
 */
export function getAIProvider(): AIProvider | null {
  if (env.AI_PROVIDER === "anthropic" && env.AI_API_KEY) {
    return createAnthropicProvider();
  }
  return null;
}
