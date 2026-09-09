import type { Check, DetectorContext } from "../types";
import { detectTrackers, type TrackerId } from "./signals";

const TRACKER_LABELS: Record<TrackerId, string> = {
  google_tag_manager: "Google Tag Manager",
  google_analytics: "Google Analytics / GA4",
  google_ads: "Google Ads (conversion tracking)",
  meta_pixel: "Meta Pixel",
  tiktok_pixel: "TikTok Pixel",
  linkedin_insight: "LinkedIn Insight Tag",
  pinterest_tag: "Pinterest Tag",
  twitter_pixel: "X (Twitter) Pixel",
  hotjar: "Hotjar",
  microsoft_clarity: "Microsoft Clarity",
};

const WEIGHTS: Record<TrackerId, number> = {
  google_tag_manager: 12,
  google_analytics: 12,
  google_ads: 11,
  meta_pixel: 11,
  tiktok_pixel: 11,
  linkedin_insight: 11,
  pinterest_tag: 11,
  twitter_pixel: 11,
  hotjar: 10,
  microsoft_clarity: 10,
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
