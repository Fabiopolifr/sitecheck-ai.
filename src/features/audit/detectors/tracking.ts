import type { Check, DetectorContext } from "../types";
import { detectTrackers, type TrackerId } from "./signals";

const TRACKER_LABELS: Record<TrackerId, string> = {
  google_tag_manager: "Google Tag Manager",
  google_analytics: "Google Analytics / GA4",
  meta_pixel: "Meta Pixel",
  tiktok_pixel: "TikTok Pixel",
  linkedin_insight: "LinkedIn Insight Tag",
  hotjar: "Hotjar",
  microsoft_clarity: "Microsoft Clarity",
};

const WEIGHTS: Record<TrackerId, number> = {
  google_tag_manager: 15,
  google_analytics: 15,
  meta_pixel: 14,
  tiktok_pixel: 14,
  linkedin_insight: 14,
  hotjar: 14,
  microsoft_clarity: 14,
};

export function detectTracking(ctx: DetectorContext): Check[] {
  const detections = detectTrackers(ctx.html);

  return detections.map(({ id, detected }) => ({
    id: `tracking_${id}`,
    category: "tracking",
    // Presence is not inherently bad; it's a signal worth verifying against
    // the consent configuration, hence "warning" rather than "fail".
    status: detected ? "warning" : "pass",
    value: detected,
    confidence: 0.75,
    evidence: detected ? `${TRACKER_LABELS[id]} rilevato` : undefined,
    weight: WEIGHTS[id],
  }));
}
