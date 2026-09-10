import { randomUUID } from "node:crypto";
import { getPool, isDatabaseConfigured } from "./pgClient";
import {
  saveAffiliateClick as saveMemoryClick,
  listAffiliateClicks as listMemoryClicks,
  type AffiliateClick,
} from "./memoryAffiliateStore";

export type { AffiliateClick };

export type NewAffiliateClick = {
  auditId: string | null;
  partner: string;
  destination: string;
  detectedIssue?: string | null;
  utmSource?: string | null;
  utmCampaign?: string | null;
};

export async function logAffiliateClick(
  click: NewAffiliateClick,
): Promise<void> {
  const record: AffiliateClick = {
    id: randomUUID(),
    auditId: click.auditId,
    partner: click.partner,
    destination: click.destination,
    detectedIssue: click.detectedIssue ?? null,
    utmSource: click.utmSource ?? null,
    utmCampaign: click.utmCampaign ?? null,
    createdAt: new Date().toISOString(),
  };

  if (!isDatabaseConfigured()) {
    saveMemoryClick(record);
    return;
  }

  const pool = getPool()!;

  try {
    await pool.query(
      `insert into affiliate_clicks
        (id, audit_id, partner, destination, detected_issue, utm_source, utm_campaign, created_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        record.id,
        record.auditId,
        record.partner,
        record.destination,
        record.detectedIssue,
        record.utmSource,
        record.utmCampaign,
        record.createdAt,
      ],
    );
  } catch (error) {
    console.error("Failed to persist affiliate click to Postgres:", error);
    saveMemoryClick(record);
  }
}

export async function listAffiliateClicks(): Promise<AffiliateClick[]> {
  if (!isDatabaseConfigured()) {
    return listMemoryClicks();
  }

  const pool = getPool()!;

  try {
    const result = await pool.query(
      "select * from affiliate_clicks order by created_at desc",
    );

    return result.rows.map((row) => ({
      id: row.id,
      auditId: row.audit_id,
      partner: row.partner,
      destination: row.destination,
      detectedIssue: row.detected_issue,
      utmSource: row.utm_source,
      utmCampaign: row.utm_campaign,
      createdAt: new Date(row.created_at).toISOString(),
    }));
  } catch (error) {
    console.error("Failed to list affiliate clicks from Postgres:", error);
    return [];
  }
}
