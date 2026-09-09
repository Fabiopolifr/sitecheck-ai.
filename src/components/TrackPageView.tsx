"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics/client";
import type { EventName } from "@/lib/analytics/events";

type TrackPageViewProps = {
  eventName: EventName;
  auditId?: string;
};

/** Fires a page-view analytics event once on mount. Renders nothing. */
export function TrackPageView({ eventName, auditId }: TrackPageViewProps) {
  useEffect(() => {
    trackEvent(eventName, { auditId });
  }, [eventName, auditId]);

  return null;
}
