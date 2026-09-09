import { getPool, isDatabaseConfigured } from "./pgClient";
import {
  getAudit as getMemoryAudit,
  saveAudit as saveMemoryAudit,
  listAudits as listMemoryAudits,
} from "./memoryAuditStore";
import { buildCategoryResults } from "@/features/audit/scoring";
import type { AuditResult, Category, Check } from "@/features/audit/types";

type AuditRow = {
  id: string;
  status: "completed" | "failed";
  requested_url: string;
  final_url: string | null;
  hostname: string;
  industry: string;
  site_score: number | null;
  band: AuditResult["band"];
  failure_reason: string | null;
  started_at: string;
  completed_at: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
};

type AuditCheckRow = {
  audit_id: string;
  check_id: string;
  category: Category;
  status: Check["status"];
  confidence: number;
  weight: number;
  value_json: unknown;
  evidence: string | null;
};

function toAuditCheckRows(
  audit: AuditResult,
): Omit<AuditCheckRow, "audit_id">[] {
  return audit.categories.flatMap((category) =>
    category.checks.map((check) => ({
      check_id: check.id,
      category: category.category,
      status: check.status,
      confidence: check.confidence,
      weight: check.weight,
      value_json: check.value ?? null,
      evidence: check.evidence ?? null,
    })),
  );
}

function fromRows(row: AuditRow, checkRows: AuditCheckRow[]): AuditResult {
  const checksByCategory: Partial<Record<Category, Check[]>> = {};
  for (const c of checkRows) {
    const list = checksByCategory[c.category] ?? [];
    list.push({
      id: c.check_id,
      category: c.category,
      status: c.status,
      value: c.value_json,
      confidence: c.confidence,
      evidence: c.evidence ?? undefined,
      weight: c.weight,
    });
    checksByCategory[c.category] = list;
  }

  const categories = buildCategoryResults(checksByCategory);

  return {
    id: row.id,
    status: row.status,
    requestedUrl: row.requested_url,
    finalUrl: row.final_url,
    hostname: row.hostname,
    industry: row.industry,
    siteScore: row.site_score,
    band: row.band,
    failureReason: row.failure_reason ?? undefined,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    categories,
    utmSource: row.utm_source,
    utmMedium: row.utm_medium,
    utmCampaign: row.utm_campaign,
  };
}

export async function saveAudit(audit: AuditResult): Promise<void> {
  if (!isDatabaseConfigured()) {
    saveMemoryAudit(audit);
    return;
  }

  const pool = getPool()!;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `insert into audits
        (id, status, requested_url, final_url, hostname, industry, site_score,
         band, failure_reason, started_at, completed_at, utm_source, utm_medium, utm_campaign)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [
        audit.id,
        audit.status,
        audit.requestedUrl,
        audit.finalUrl,
        audit.hostname,
        audit.industry,
        audit.siteScore,
        audit.band,
        audit.failureReason ?? null,
        audit.startedAt,
        audit.completedAt,
        audit.utmSource ?? null,
        audit.utmMedium ?? null,
        audit.utmCampaign ?? null,
      ],
    );

    const checkRows = toAuditCheckRows(audit);
    for (const row of checkRows) {
      await client.query(
        `insert into audit_checks
          (audit_id, check_id, category, status, confidence, weight, value_json, evidence)
         values ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          audit.id,
          row.check_id,
          row.category,
          row.status,
          row.confidence,
          row.weight,
          JSON.stringify(row.value_json),
          row.evidence,
        ],
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Failed to persist audit to Postgres:", error);
    saveMemoryAudit(audit);
  } finally {
    client.release();
  }
}

export async function getAudit(id: string): Promise<AuditResult | undefined> {
  if (!isDatabaseConfigured()) {
    return getMemoryAudit(id);
  }

  const pool = getPool()!;

  try {
    const auditResult = await pool.query<AuditRow>(
      "select * from audits where id = $1",
      [id],
    );
    const auditRow = auditResult.rows[0];
    if (!auditRow) return undefined;

    const checksResult = await pool.query<AuditCheckRow>(
      `select audit_id, check_id, category, status,
              confidence::float8 as confidence, weight::float8 as weight,
              value_json, evidence
       from audit_checks where audit_id = $1`,
      [id],
    );

    return fromRows(auditRow, checksResult.rows);
  } catch (error) {
    console.error("Failed to read audit from Postgres:", error);
    return undefined;
  }
}

/** Most recent audits, newest first — used by the admin dashboard. */
export async function listAudits(limit = 200): Promise<AuditResult[]> {
  if (!isDatabaseConfigured()) {
    return listMemoryAudits().slice(0, limit);
  }

  const pool = getPool()!;

  try {
    const auditsResult = await pool.query<AuditRow>(
      "select * from audits order by completed_at desc limit $1",
      [limit],
    );

    const ids = auditsResult.rows.map((row) => row.id);
    if (ids.length === 0) return [];

    const checksResult = await pool.query<AuditCheckRow>(
      `select audit_id, check_id, category, status,
              confidence::float8 as confidence, weight::float8 as weight,
              value_json, evidence
       from audit_checks where audit_id = any($1::uuid[])`,
      [ids],
    );

    const checksByAuditId = new Map<string, AuditCheckRow[]>();
    for (const row of checksResult.rows) {
      const list = checksByAuditId.get(row.audit_id) ?? [];
      list.push(row);
      checksByAuditId.set(row.audit_id, list);
    }

    return auditsResult.rows.map((row) =>
      fromRows(row, checksByAuditId.get(row.id) ?? []),
    );
  } catch (error) {
    console.error("Failed to list audits from Postgres:", error);
    return [];
  }
}
