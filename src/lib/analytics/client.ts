"use client";

import type { EventName } from "./events";

const SESSION_STORAGE_KEY = "sc_sid";

/**
 * Anonymous per-browser session id, used only to link funnel events
 * (landing_view → audit_started → ... ) — never used for auth or tied to
 * an email unless the visitor submits the lead form. Falls back to a
 * random per-call id if localStorage is unavailable (private browsing,
 * disabled storage) rather than throwing.
 */
export function getSessionId(): string {
  try {
    const existing = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (existing) return existing;

    const id = crypto.randomUUID();
    window.localStorage.setItem(SESSION_STORAGE_KEY, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

export type UtmParams = {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
};

/** Reads utm_source/utm_medium/utm_campaign from the current page URL. */
export function getUtmParams(): UtmParams {
  try {
    const params = new URLSearchParams(window.location.search);
    return {
      utmSource: params.get("utm_source") ?? undefined,
      utmMedium: params.get("utm_medium") ?? undefined,
      utmCampaign: params.get("utm_campaign") ?? undefined,
    };
  } catch {
    return {};
  }
}

/** Fire-and-forget: never blocks or throws on the caller. */
export function trackEvent(
  eventName: EventName,
  options: { auditId?: string; metadata?: Record<string, unknown> } = {},
): void {
  try {
    void fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: getSessionId(),
        auditId: options.auditId,
        eventName,
        metadata: options.metadata,
      }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Analytics must never break the user-facing flow.
  }
}
