import { describe, expect, it } from "vitest";
import { computeFunnelMetrics } from "@/features/admin/metrics";
import { trackEventSchema } from "@/lib/analytics/events";
import type { AnalyticsEvent } from "@/lib/db/eventsRepository";

function event(
  eventName: AnalyticsEvent["eventName"],
  overrides: Partial<AnalyticsEvent> = {},
): AnalyticsEvent {
  return {
    id: crypto.randomUUID(),
    sessionId: "s1",
    auditId: null,
    eventName,
    metadata: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("trackEventSchema", () => {
  it("accepts a valid event", () => {
    const result = trackEventSchema.safeParse({
      sessionId: "abc",
      eventName: "landing_view",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown event name", () => {
    const result = trackEventSchema.safeParse({
      sessionId: "abc",
      eventName: "totally_made_up_event",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing sessionId", () => {
    const result = trackEventSchema.safeParse({ eventName: "landing_view" });
    expect(result.success).toBe(false);
  });
});

describe("computeFunnelMetrics", () => {
  it("returns zero counts and null rates for no events", () => {
    const funnel = computeFunnelMetrics([]);
    expect(funnel.landingViews).toBe(0);
    expect(funnel.landingToAuditStartRate).toBeNull();
  });

  it("computes counts and rates from a realistic funnel", () => {
    const events: AnalyticsEvent[] = [
      event("landing_view"),
      event("landing_view"),
      event("landing_view"),
      event("landing_view"),
      event("audit_started"),
      event("audit_started"),
      event("audit_completed"),
      event("results_viewed"),
      event("email_submitted"),
    ];

    const funnel = computeFunnelMetrics(events);

    expect(funnel.landingViews).toBe(4);
    expect(funnel.auditsStarted).toBe(2);
    expect(funnel.auditsCompleted).toBe(1);
    expect(funnel.resultsViewed).toBe(1);
    expect(funnel.emailsSubmitted).toBe(1);
    expect(funnel.affiliateClicked).toBe(0);

    expect(funnel.landingToAuditStartRate).toBeCloseTo(2 / 4);
    expect(funnel.auditStartToCompletionRate).toBeCloseTo(1 / 2);
    expect(funnel.resultsToEmailCaptureRate).toBeCloseTo(1 / 1);
    expect(funnel.resultsToAffiliateClickRate).toBe(0);
  });

  it("never divides by zero", () => {
    const funnel = computeFunnelMetrics([event("audit_completed")]);
    expect(funnel.landingToAuditStartRate).toBeNull();
    expect(funnel.auditStartToCompletionRate).toBeNull();
  });
});
