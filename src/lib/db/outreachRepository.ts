import { randomUUID } from "node:crypto";
import { getPool, isDatabaseConfigured } from "./pgClient";
import {
  saveOutreachSite as saveMemorySite,
  listOutreachSites as listMemorySites,
  findOutreachSiteByDomain as findMemorySiteByDomain,
  saveOutreachSuppression as saveMemorySuppression,
  listOutreachSuppressions as listMemorySuppressions,
  isSuppressed as isMemorySuppressed,
} from "./memoryOutreachStore";
import type {
  NewOutreachSite,
  OutreachSite,
  OutreachSuppression,
} from "@/features/outreach/types";

function rowToSite(row: Record<string, unknown>): OutreachSite {
  return {
    id: row.id as string,
    source: row.source as OutreachSite["source"],
    businessName: (row.business_name as string) ?? null,
    website: row.website as string,
    domain: row.domain as string,
    city: (row.city as string) ?? null,
    queryUsed: (row.query_used as string) ?? null,
    auditId: (row.audit_id as string) ?? null,
    siteScore: row.site_score === null ? null : Number(row.site_score),
    band: (row.band as string) ?? null,
    contactEmail: (row.contact_email as string) ?? null,
    eligible: row.eligible === null ? null : Boolean(row.eligible),
    eligibilityReason: (row.eligibility_reason as string) ?? null,
    status: row.status as OutreachSite["status"],
    createdAt: (row.created_at as Date).toISOString(),
    analyzedAt: row.analyzed_at
      ? (row.analyzed_at as Date).toISOString()
      : null,
    emailedAt: row.emailed_at ? (row.emailed_at as Date).toISOString() : null,
  };
}

export async function createOutreachSite(
  input: NewOutreachSite,
): Promise<OutreachSite> {
  const record: OutreachSite = {
    id: randomUUID(),
    source: input.source,
    businessName: input.businessName ?? null,
    website: input.website,
    domain: input.domain,
    city: input.city ?? null,
    queryUsed: input.queryUsed ?? null,
    auditId: null,
    siteScore: null,
    band: null,
    contactEmail: null,
    eligible: null,
    eligibilityReason: null,
    status: "queued",
    createdAt: new Date().toISOString(),
    analyzedAt: null,
    emailedAt: null,
  };

  if (!isDatabaseConfigured()) {
    saveMemorySite(record);
    return record;
  }

  const pool = getPool()!;
  try {
    await pool.query(
      `insert into outreach_sites
        (id, source, business_name, website, domain, city, query_used, status, created_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       on conflict (domain) do nothing`,
      [
        record.id,
        record.source,
        record.businessName,
        record.website,
        record.domain,
        record.city,
        record.queryUsed,
        record.status,
        record.createdAt,
      ],
    );
    return record;
  } catch (error) {
    console.error("Failed to save outreach site to Postgres:", error);
    saveMemorySite(record);
    return record;
  }
}

export async function updateOutreachSite(site: OutreachSite): Promise<void> {
  if (!isDatabaseConfigured()) {
    saveMemorySite(site);
    return;
  }

  const pool = getPool()!;
  try {
    await pool.query(
      `update outreach_sites set
        business_name = $2, audit_id = $3, site_score = $4, band = $5,
        contact_email = $6, eligible = $7, eligibility_reason = $8,
        status = $9, analyzed_at = $10, emailed_at = $11
       where id = $1`,
      [
        site.id,
        site.businessName,
        site.auditId,
        site.siteScore,
        site.band,
        site.contactEmail,
        site.eligible,
        site.eligibilityReason,
        site.status,
        site.analyzedAt,
        site.emailedAt,
      ],
    );
  } catch (error) {
    console.error("Failed to update outreach site in Postgres:", error);
    saveMemorySite(site);
  }
}

export async function listOutreachSites(): Promise<OutreachSite[]> {
  if (!isDatabaseConfigured()) {
    return listMemorySites();
  }

  const pool = getPool()!;
  try {
    const result = await pool.query(
      `select * from outreach_sites order by created_at desc`,
    );
    return result.rows.map(rowToSite);
  } catch (error) {
    console.error("Failed to list outreach sites from Postgres:", error);
    return listMemorySites();
  }
}

export async function findOutreachSiteByDomain(
  domain: string,
): Promise<OutreachSite | null> {
  if (!isDatabaseConfigured()) {
    return findMemorySiteByDomain(domain);
  }

  const pool = getPool()!;
  try {
    const result = await pool.query(
      `select * from outreach_sites where domain = $1 limit 1`,
      [domain],
    );
    return result.rows.length > 0 ? rowToSite(result.rows[0]) : null;
  } catch (error) {
    console.error("Failed to look up outreach site in Postgres:", error);
    return findMemorySiteByDomain(domain);
  }
}

export async function isOutreachSuppressed(
  email: string | null,
  domain: string,
): Promise<boolean> {
  if (!isDatabaseConfigured()) {
    return isMemorySuppressed(email, domain);
  }

  const pool = getPool()!;
  try {
    const result = await pool.query(
      `select 1 from outreach_suppressions
       where domain = $2 or (email is not null and lower(email) = lower($1))
       limit 1`,
      [email ?? "", domain],
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error("Failed to check outreach suppression in Postgres:", error);
    return isMemorySuppressed(email, domain);
  }
}

export async function addOutreachSuppression(
  input: Pick<OutreachSuppression, "email" | "domain" | "reason">,
): Promise<OutreachSuppression> {
  const record: OutreachSuppression = {
    id: randomUUID(),
    email: input.email ?? null,
    domain: input.domain ?? null,
    reason: input.reason ?? null,
    createdAt: new Date().toISOString(),
  };

  if (!isDatabaseConfigured()) {
    saveMemorySuppression(record);
    return record;
  }

  const pool = getPool()!;
  try {
    await pool.query(
      `insert into outreach_suppressions (id, email, domain, reason, created_at)
       values ($1,$2,$3,$4,$5)
       on conflict (email) do nothing`,
      [record.id, record.email, record.domain, record.reason, record.createdAt],
    );
    return record;
  } catch (error) {
    console.error("Failed to save outreach suppression to Postgres:", error);
    saveMemorySuppression(record);
    return record;
  }
}

export async function listOutreachSuppressions(): Promise<
  OutreachSuppression[]
> {
  if (!isDatabaseConfigured()) {
    return listMemorySuppressions();
  }

  const pool = getPool()!;
  try {
    const result = await pool.query(
      `select * from outreach_suppressions order by created_at desc`,
    );
    return result.rows.map((row) => ({
      id: row.id as string,
      email: (row.email as string) ?? null,
      domain: (row.domain as string) ?? null,
      reason: (row.reason as string) ?? null,
      createdAt: (row.created_at as Date).toISOString(),
    }));
  } catch (error) {
    console.error("Failed to list outreach suppressions from Postgres:", error);
    return listMemorySuppressions();
  }
}
