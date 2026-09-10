import { randomUUID } from "node:crypto";
import { getPool, isDatabaseConfigured } from "./pgClient";
import {
  saveEvent as saveMemoryEvent,
  listEvents as listMemoryEvents,
  type AnalyticsEvent,
} from "./memoryEventStore";
import type { EventName, TrackEventInput } from "@/lib/analytics/events";

export type { AnalyticsEvent };

export async function saveEvent(input: TrackEventInput): Promise<void> {
  const record: AnalyticsEvent = {
    id: randomUUID(),
    sessionId: input.sessionId,
    auditId: input.auditId ?? null,
    eventName: input.eventName,
    metadata: input.metadata ?? null,
    createdAt: new Date().toISOString(),
  };

  if (!isDatabaseConfigured()) {
    saveMemoryEvent(record);
    return;
  }

  const pool = getPool()!;

  try {
    await pool.query(
      `insert into analytics_events
        (id, session_id, audit_id, event_name, metadata_json, created_at)
       values ($1,$2,$3,$4,$5,$6)`,
      [
        record.id,
        record.sessionId,
        record.auditId,
        record.eventName,
        record.metadata === null ? null : JSON.stringify(record.metadata),
        record.createdAt,
      ],
    );
  } catch (error) {
    console.error("Failed to persist analytics event to Postgres:", error);
    saveMemoryEvent(record);
  }
}

export async function listEvents(): Promise<AnalyticsEvent[]> {
  if (!isDatabaseConfigured()) {
    return listMemoryEvents();
  }

  const pool = getPool()!;

  try {
    const result = await pool.query(
      "select * from analytics_events order by created_at desc limit 5000",
    );

    return result.rows.map((row) => ({
      id: row.id,
      sessionId: row.session_id,
      auditId: row.audit_id,
      eventName: row.event_name as EventName,
      metadata: row.metadata_json,
      createdAt: new Date(row.created_at).toISOString(),
    }));
  } catch (error) {
    console.error("Failed to list analytics events from Postgres:", error);
    return [];
  }
}
