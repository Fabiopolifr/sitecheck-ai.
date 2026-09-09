import { getSupabaseClient, isSupabaseConfigured } from "./supabaseClient";
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
  source: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
};

type AuditCheckRow = {
  check_id: string;
  category: Category;
  status: Check["status"];
  confidence: number;
  weight: number;
  value_json: unknown;
  evidence: string | null;
};

function toAuditRow(audit: AuditResult): AuditRow {
  return {
    id: audit.id,
    status: audit.status,
    requested_url: audit.requestedUrl,
    final_url: audit.finalUrl,
    hostname: audit.hostname,
    industry: audit.industry,
    site_score: audit.siteScore,
    band: audit.band,
    failure_reason: audit.failureReason ?? null,
    started_at: audit.startedAt,
    completed_at: audit.completedAt,
    source: null,
    utm_source: audit.utmSource ?? null,
    utm_medium: audit.utmMedium ?? null,
    utm_campaign: audit.utmCampaign ?? null,
  };
}

function toAuditCheckRows(audit: AuditResult): AuditCheckRow[] {
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
  if (!isSupabaseConfigured()) {
    saveMemoryAudit(audit);
    return;
  }

  const supabase = getSupabaseClient()!;
  const { error: auditError } = await supabase
    .from("audits")
    .insert(toAuditRow(audit));

  if (auditError) {
    console.error("Failed to persist audit to Supabase:", auditError);
    saveMemoryAudit(audit);
    return;
  }

  const checkRows = toAuditCheckRows(audit);
  if (checkRows.length > 0) {
    const { error: checksError } = await supabase
      .from("audit_checks")
      .insert(checkRows.map((row) => ({ ...row, audit_id: audit.id })));

    if (checksError) {
      console.error("Failed to persist audit checks to Supabase:", checksError);
    }
  }
}

export async function getAudit(id: string): Promise<AuditResult | undefined> {
  if (!isSupabaseConfigured()) {
    return getMemoryAudit(id);
  }

  const supabase = getSupabaseClient()!;
  const { data: auditRow, error: auditError } = await supabase
    .from("audits")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (auditError || !auditRow) {
    if (auditError)
      console.error("Failed to read audit from Supabase:", auditError);
    return undefined;
  }

  const { data: checkRows, error: checksError } = await supabase
    .from("audit_checks")
    .select("*")
    .eq("audit_id", id);

  if (checksError) {
    console.error("Failed to read audit checks from Supabase:", checksError);
  }

  return fromRows(auditRow as AuditRow, (checkRows ?? []) as AuditCheckRow[]);
}

/** Most recent audits, newest first — used by the admin dashboard. */
export async function listAudits(limit = 200): Promise<AuditResult[]> {
  if (!isSupabaseConfigured()) {
    return listMemoryAudits().slice(0, limit);
  }

  const supabase = getSupabaseClient()!;
  const { data: auditRows, error: auditError } = await supabase
    .from("audits")
    .select("*")
    .order("completed_at", { ascending: false })
    .limit(limit);

  if (auditError || !auditRows) {
    console.error("Failed to list audits from Supabase:", auditError);
    return [];
  }

  const ids = auditRows.map((row) => row.id);
  const { data: checkRows, error: checksError } = await supabase
    .from("audit_checks")
    .select("*")
    .in("audit_id", ids);

  if (checksError) {
    console.error("Failed to list audit checks from Supabase:", checksError);
  }

  const checksByAuditId = new Map<string, AuditCheckRow[]>();
  for (const row of (checkRows ?? []) as (AuditCheckRow & {
    audit_id: string;
  })[]) {
    const list = checksByAuditId.get(row.audit_id) ?? [];
    list.push(row);
    checksByAuditId.set(row.audit_id, list);
  }

  return (auditRows as AuditRow[]).map((row) =>
    fromRows(row, checksByAuditId.get(row.id) ?? []),
  );
}
