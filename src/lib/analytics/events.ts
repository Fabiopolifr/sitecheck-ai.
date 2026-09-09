import { z } from "zod";

/**
 * Fixed event vocabulary per AI/MASTER_SPEC.md §14 — arbitrary event names
 * are rejected rather than accepted, so the events table stays queryable
 * and doesn't accumulate typos/one-offs.
 */
export const EVENT_NAMES = [
  "landing_view",
  "audit_started",
  "audit_completed",
  "audit_failed",
  "results_viewed",
  "email_submitted",
  "affiliate_clicked",
] as const;

export type EventName = (typeof EVENT_NAMES)[number];

export const trackEventSchema = z.object({
  sessionId: z.string().min(1).max(100),
  auditId: z.string().min(1).max(100).optional(),
  eventName: z.enum(EVENT_NAMES),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type TrackEventInput = z.infer<typeof trackEventSchema>;
