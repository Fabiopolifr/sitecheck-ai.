"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics/client";
import type { EventName } from "@/lib/analytics/events";

type TrackPageViewProps = {
  eventName: EventName;
  auditId?: string;
  metadata?: Record<string, unknown>;
};

/** Fires a page-view analytics event once on mount. Renders nothing. */
export function TrackPageView({
  eventName,
  auditId,
  metadata,
}: TrackPageViewProps) {
  useEffect(() => {
    trackEvent(eventName, { auditId, metadata });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventName, auditId]);

  return null;
}
