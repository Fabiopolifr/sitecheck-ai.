import { randomUUID } from "node:crypto";
import { getSupabaseClient, isSupabaseConfigured } from "./supabaseClient";
import {
  saveLead as saveMemoryLead,
  listLeads as listMemoryLeads,
  type Lead,
} from "./memoryLeadStore";

export type { Lead };

export type NewLead = {
  auditId: string | null;
  email: string;
  firstName?: string | null;
  consentMarketing: boolean;
};

export async function saveLead(lead: NewLead): Promise<Lead> {
  const record: Lead = {
    id: randomUUID(),
    auditId: lead.auditId,
    email: lead.email,
    firstName: lead.firstName ?? null,
    consentMarketing: lead.consentMarketing,
    createdAt: new Date().toISOString(),
  };

  if (!isSupabaseConfigured()) {
    saveMemoryLead(record);
    return record;
  }

  const supabase = getSupabaseClient()!;
  const { error } = await supabase.from("leads").insert({
    id: record.id,
    audit_id: record.auditId,
    email: record.email,
    first_name: record.firstName,
    consent_marketing: record.consentMarketing,
    created_at: record.createdAt,
  });

  if (error) {
    console.error("Failed to persist lead to Supabase:", error);
    saveMemoryLead(record);
  }

  return record;
}

export async function listLeads(): Promise<Lead[]> {
  if (!isSupabaseConfigured()) {
    return listMemoryLeads();
  }

  const supabase = getSupabaseClient()!;
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("Failed to list leads from Supabase:", error);
    return [];
  }

  return data.map((row) => ({
    id: row.id,
    auditId: row.audit_id,
    email: row.email,
    firstName: row.first_name,
    consentMarketing: row.consent_marketing,
    createdAt: row.created_at,
  }));
}
