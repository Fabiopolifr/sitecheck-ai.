import { randomUUID } from "node:crypto";
import { getSupabaseClient, isSupabaseConfigured } from "./supabaseClient";
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

  if (!isSupabaseConfigured()) {
    saveMemoryClick(record);
    return;
  }

  const supabase = getSupabaseClient()!;
  const { error } = await supabase.from("affiliate_clicks").insert({
    id: record.id,
    audit_id: record.auditId,
    partner: record.partner,
    destination: record.destination,
    detected_issue: record.detectedIssue,
    utm_source: record.utmSource,
    utm_campaign: record.utmCampaign,
    created_at: record.createdAt,
  });

  if (error) {
    console.error("Failed to persist affiliate click to Supabase:", error);
    saveMemoryClick(record);
  }
}

export async function listAffiliateClicks(): Promise<AffiliateClick[]> {
  if (!isSupabaseConfigured()) {
    return listMemoryClicks();
  }

  const supabase = getSupabaseClient()!;
  const { data, error } = await supabase
    .from("affiliate_clicks")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("Failed to list affiliate clicks from Supabase:", error);
    return [];
  }

  return data.map((row) => ({
    id: row.id,
    auditId: row.audit_id,
    partner: row.partner,
    destination: row.destination,
    detectedIssue: row.detected_issue,
    utmSource: row.utm_source,
    utmCampaign: row.utm_campaign,
    createdAt: row.created_at,
  }));
}
