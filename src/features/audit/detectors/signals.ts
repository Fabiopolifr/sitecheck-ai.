export type TrackerId =
  | "google_tag_manager"
  | "google_analytics"
  | "meta_pixel"
  | "tiktok_pixel"
  | "linkedin_insight"
  | "hotjar"
  | "microsoft_clarity";

const TRACKER_PATTERNS: Record<TrackerId, RegExp[]> = {
  google_tag_manager: [/googletagmanager\.com\/gtm\.js/i, /GTM-[A-Z0-9]+/],
  google_analytics: [
    /googletagmanager\.com\/gtag\/js/i,
    /google-analytics\.com\/analytics\.js/i,
    /gtag\(\s*['"]config['"]/i,
    /\bUA-\d{4,}-\d+\b/,
  ],
  meta_pixel: [
    /connect\.facebook\.net\/.*\/fbevents\.js/i,
    /fbq\(\s*['"]init['"]/i,
  ],
  tiktok_pixel: [/analytics\.tiktok\.com\/i18n\/pixel/i, /ttq\.load\(/i],
  linkedin_insight: [
    /snap\.licdn\.com\/li\.lms-analytics/i,
    /_linkedin_partner_id/i,
  ],
  hotjar: [/static\.hotjar\.com/i, /\bhjid\s*[:=]/i],
  microsoft_clarity: [/clarity\.ms\/tag/i, /clarity\(\s*['"]set['"]/i],
};

export type TrackerDetection = { id: TrackerId; detected: boolean };

export function detectTrackers(html: string): TrackerDetection[] {
  return (Object.keys(TRACKER_PATTERNS) as TrackerId[]).map((id) => ({
    id,
    detected: TRACKER_PATTERNS[id].some((pattern) => pattern.test(html)),
  }));
}

const CMP_PATTERNS: Record<string, RegExp[]> = {
  cookieyes: [/cdn-cookieyes\.com/i, /cookieyes/i],
  iubenda: [/cdn\.iubenda\.com/i, /iubenda_cs/i],
  onetrust: [/cdn\.cookielaw\.org/i, /onetrust/i],
  cookiebot: [/consent\.cookiebot\.com/i],
  complianz: [/cmplz-/i, /complianz/i],
  quantcast: [/quantcast\.mgr\.consensu\.org/i, /__cmp\(/i],
};

const GENERIC_BANNER_KEYWORDS = [
  /cookie[-_ ]?banner/i,
  /gdpr[-_ ]?consent/i,
  /accetta[- ]?(tutti|i)?\s*cookie/i,
];

export type CmpDetection = {
  vendor: string | null;
  genericBannerFound: boolean;
};

export function detectCmp(html: string): CmpDetection {
  for (const [vendor, patterns] of Object.entries(CMP_PATTERNS)) {
    if (patterns.some((pattern) => pattern.test(html))) {
      return { vendor, genericBannerFound: true };
    }
  }

  const genericBannerFound = GENERIC_BANNER_KEYWORDS.some((pattern) =>
    pattern.test(html),
  );

  return { vendor: null, genericBannerFound };
}
