import { randomUUID } from "node:crypto";
import { getPool, isDatabaseConfigured } from "./pgClient";
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
  supportRequested?: boolean;
  supportPhone?: string | null;
  supportReason?: string | null;
};

export async function saveLead(lead: NewLead): Promise<Lead> {
  const supportRequested = lead.supportRequested ?? false;
  const record: Lead = {
    id: randomUUID(),
    auditId: lead.auditId,
    email: lead.email,
    firstName: lead.firstName ?? null,
    consentMarketing: lead.consentMarketing,
    supportRequested,
    supportPhone: lead.supportPhone ?? null,
    supportReason: lead.supportReason ?? null,
    supportStatus: "new",
    supportRequestedAt: supportRequested ? new Date().toISOString() : null,
    createdAt: new Date().toISOString(),
  };

  if (!isDatabaseConfigured()) {
    saveMemoryLead(record);
    return record;
  }

  const pool = getPool()!;

  try {
    await pool.query(
      `insert into leads
        (id, audit_id, email, first_name, consent_marketing, support_requested,
         support_phone, support_reason, support_status, support_requested_at, created_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        record.id,
        record.auditId,
        record.email,
        record.firstName,
        record.consentMarketing,
        record.supportRequested,
        record.supportPhone,
        record.supportReason,
        record.supportStatus,
        record.supportRequestedAt,
        record.createdAt,
      ],
    );
  } catch (error) {
    console.error("Failed to persist lead to Postgres:", error);
    saveMemoryLead(record);
  }

  return record;
}

export async function listLeads(): Promise<Lead[]> {
  if (!isDatabaseConfigured()) {
    return listMemoryLeads();
  }

  const pool = getPool()!;

  try {
    const result = await pool.query(
      "select * from leads order by created_at desc",
    );

    return result.rows.map((row) => ({
      id: row.id,
      auditId: row.audit_id,
      email: row.email,
      firstName: row.first_name,
      consentMarketing: row.consent_marketing,
      supportRequested: row.support_requested,
      supportPhone: row.support_phone,
      supportReason: row.support_reason,
      supportStatus: row.support_status,
      supportRequestedAt: row.support_requested_at
        ? new Date(row.support_requested_at).toISOString()
        : null,
      createdAt: new Date(row.created_at).toISOString(),
    }));
  } catch (error) {
    console.error("Failed to list leads from Postgres:", error);
    return [];
  }
}
