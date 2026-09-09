import { randomUUID } from "node:crypto";
import { getSupabaseClient, isSupabaseConfigured } from "./supabaseClient";
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

  if (!isSupabaseConfigured()) {
    saveMemoryEvent(record);
    return;
  }

  const supabase = getSupabaseClient()!;
  const { error } = await supabase.from("analytics_events").insert({
    id: record.id,
    session_id: record.sessionId,
    audit_id: record.auditId,
    event_name: record.eventName,
    metadata_json: record.metadata,
    created_at: record.createdAt,
  });

  if (error) {
    console.error("Failed to persist analytics event to Supabase:", error);
    saveMemoryEvent(record);
  }
}

export async function listEvents(): Promise<AnalyticsEvent[]> {
  if (!isSupabaseConfigured()) {
    return listMemoryEvents();
  }

  const supabase = getSupabaseClient()!;
  const { data, error } = await supabase
    .from("analytics_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5000);

  if (error || !data) {
    console.error("Failed to list analytics events from Supabase:", error);
    return [];
  }

  return data.map((row) => ({
    id: row.id,
    sessionId: row.session_id,
    auditId: row.audit_id,
    eventName: row.event_name as EventName,
    metadata: row.metadata_json,
    createdAt: row.created_at,
  }));
}
