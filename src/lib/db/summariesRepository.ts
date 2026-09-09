import { randomUUID } from "node:crypto";
import { getPool, isDatabaseConfigured } from "./pgClient";
import {
  saveSummary as saveMemorySummary,
  getSummary as getMemorySummary,
} from "./memorySummaryStore";
import type { AuditSummary } from "@/lib/ai";

export async function saveSummary(
  auditId: string,
  summary: AuditSummary,
): Promise<void> {
  if (!isDatabaseConfigured()) {
    saveMemorySummary(auditId, summary);
    return;
  }

  const pool = getPool()!;

  try {
    await pool.query(
      `insert into audit_summaries (id, audit_id, provider, model, summary, priorities_json)
       values ($1,$2,$3,$4,$5,$6)`,
      [
        randomUUID(),
        auditId,
        summary.provider,
        summary.model,
        summary.summary,
        JSON.stringify(summary.top_priorities),
      ],
    );
  } catch (error) {
    console.error("Failed to persist audit summary to Postgres:", error);
    saveMemorySummary(auditId, summary);
  }
}

export async function getSummary(
  auditId: string,
): Promise<AuditSummary | undefined> {
  if (!isDatabaseConfigured()) {
    return getMemorySummary(auditId);
  }

  const pool = getPool()!;

  try {
    const result = await pool.query(
      `select * from audit_summaries where audit_id = $1
       order by created_at desc limit 1`,
      [auditId],
    );
    const row = result.rows[0];
    if (!row) return undefined;

    return {
      summary: row.summary,
      top_priorities: row.priorities_json,
      provider: row.provider,
      model: row.model,
    };
  } catch (error) {
    console.error("Failed to read audit summary from Postgres:", error);
    return undefined;
  }
}
