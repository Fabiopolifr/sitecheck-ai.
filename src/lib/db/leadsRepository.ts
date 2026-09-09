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

  if (!isDatabaseConfigured()) {
    saveMemoryLead(record);
    return record;
  }

  const pool = getPool()!;

  try {
    await pool.query(
      `insert into leads (id, audit_id, email, first_name, consent_marketing, created_at)
       values ($1,$2,$3,$4,$5,$6)`,
      [
        record.id,
        record.auditId,
        record.email,
        record.firstName,
        record.consentMarketing,
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
      createdAt: row.created_at,
    }));
  } catch (error) {
    console.error("Failed to list leads from Postgres:", error);
    return [];
  }
}
