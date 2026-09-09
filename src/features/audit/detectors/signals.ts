export type TrackerId =
  | "google_tag_manager"
  | "google_analytics"
  | "google_ads"
  | "meta_pixel"
  | "tiktok_pixel"
  | "linkedin_insight"
  | "pinterest_tag"
  | "twitter_pixel"
  | "hotjar"
  | "microsoft_clarity";

const TRACKER_PATTERNS: Record<TrackerId, RegExp[]> = {
  google_tag_manager: [/googletagmanager\.com\/gtm\.js/i, /GTM-[A-Z0-9]+/],
  google_analytics: [
    /googletagmanager\.com\/gtag\/js/i,
    /google-analytics\.com\/analytics\.js/i,
    /gtag\(\s*['"]config['"]\s*,\s*['"]G-/i,
    /\bUA-\d{4,}-\d+\b/,
  ],
  google_ads: [
    /gtag\(\s*['"]config['"]\s*,\s*['"]AW-/i,
    /googleadservices\.com\/pagead/i,
    /\bAW-\d{6,}\b/,
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
  pinterest_tag: [/s\.pinimg\.com\/ct\/core\.js/i, /pintrk\(\s*['"]load['"]/i],
  twitter_pixel: [
    /static\.ads-twitter\.com\/uwt\.js/i,
    /twq\(\s*['"]config['"]/i,
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

/**
 * Consent Management Platform vendor signatures. Prioritizes CMPs common
 * on Italian/EU small-business sites (WordPress plugins, legal-compliance
 * SaaS) plus Google's own consent tooling, since a real estate agency
 * site running only Google Ads/Analytics with "Consent Mode" but no
 * third-party CMP is a common real-world case that must not read as "no
 * consent management at all".
 */
const CMP_PATTERNS: Record<string, RegExp[]> = {
  cookieyes: [/cdn-cookieyes\.com/i, /cookieyes/i],
  iubenda: [/cdn\.iubenda\.com/i, /iubenda_cs/i],
  onetrust: [/cdn\.cookielaw\.org/i, /onetrust/i],
  cookiebot: [/consent\.cookiebot\.com/i],
  complianz: [/cmplz-/i, /complianz/i],
  quantcast: [/quantcast\.mgr\.consensu\.org/i, /__cmp\(/i],
  google_funding_choices: [
    /fundingchoicesmessages\.google\.com/i,
    /googlefc\.(ccpa|controlledMessagingFunction)/i,
  ],
  didomi: [/sdk\.privacy-center\.org/i, /didomi/i],
  usercentrics: [/app\.usercentrics\.eu/i, /usercentrics/i],
  osano: [/cmp\.osano\.com/i],
  termly: [/app\.termly\.io/i],
  axeptio: [/static\.axept\.io/i],
  cookiescript: [/cdn\.cookie-script\.com/i],
  borlabs_cookie: [/borlabs-cookie/i],
  real_cookie_banner: [/real-cookie-banner/i, /consent_api\.php/i],
  webtoffee: [/gdpr-cookie-compliance/i],
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
