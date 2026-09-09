import { randomUUID } from "node:crypto";
import { getSupabaseClient, isSupabaseConfigured } from "./supabaseClient";
import {
  saveSummary as saveMemorySummary,
  getSummary as getMemorySummary,
} from "./memorySummaryStore";
import type { AuditSummary } from "@/lib/ai";

export async function saveSummary(
  auditId: string,
  summary: AuditSummary,
): Promise<void> {
  if (!isSupabaseConfigured()) {
    saveMemorySummary(auditId, summary);
    return;
  }

  const supabase = getSupabaseClient()!;
  const { error } = await supabase.from("audit_summaries").insert({
    id: randomUUID(),
    audit_id: auditId,
    provider: summary.provider,
    model: summary.model,
    summary: summary.summary,
    priorities_json: summary.top_priorities,
  });

  if (error) {
    console.error("Failed to persist audit summary to Supabase:", error);
    saveMemorySummary(auditId, summary);
  }
}

export async function getSummary(
  auditId: string,
): Promise<AuditSummary | undefined> {
  if (!isSupabaseConfigured()) {
    return getMemorySummary(auditId);
  }

  const supabase = getSupabaseClient()!;
  const { data, error } = await supabase
    .from("audit_summaries")
    .select("*")
    .eq("audit_id", auditId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    if (error)
      console.error("Failed to read audit summary from Supabase:", error);
    return undefined;
  }

  return {
    summary: data.summary,
    top_priorities: data.priorities_json,
    provider: data.provider,
    model: data.model,
  };
}
