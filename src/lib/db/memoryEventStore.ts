import type { EventName } from "@/lib/analytics/events";

export type AnalyticsEvent = {
  id: string;
  sessionId: string;
  auditId: string | null;
  eventName: EventName;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

const globalForStore = globalThis as unknown as {
  __siteCheckEventStore?: AnalyticsEvent[];
};

const store = globalForStore.__siteCheckEventStore ?? [];
globalForStore.__siteCheckEventStore = store;

export function saveEvent(event: AnalyticsEvent): void {
  store.push(event);
}

export function listEvents(): AnalyticsEvent[] {
  return [...store];
}
