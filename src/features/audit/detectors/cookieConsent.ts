import type { Check, DetectorContext } from "../types";
import { detectCmp, detectTrackers } from "./signals";

const CMP_LABELS: Record<string, string> = {
  cookieyes: "CookieYes",
  iubenda: "iubenda",
  onetrust: "OneTrust",
  cookiebot: "Cookiebot",
  complianz: "Complianz",
  quantcast: "Quantcast Choice",
  google_funding_choices: "Google Funding Choices / Consent Mode",
  didomi: "Didomi",
  usercentrics: "Usercentrics",
  osano: "Osano",
  termly: "Termly",
  axeptio: "Axeptio",
  cookiescript: "CookieScript",
  borlabs_cookie: "Borlabs Cookie",
  real_cookie_banner: "Real Cookie Banner",
  webtoffee: "GDPR Cookie Compliance (WebToffee)",
};

export function detectCookieConsent(ctx: DetectorContext): Check[] {
  const { vendor, genericBannerFound } = detectCmp(ctx.html);
  const vendorLabel = vendor ? (CMP_LABELS[vendor] ?? vendor) : null;
  const checks: Check[] = [];

  checks.push({
    id: "cmp_detected",
    category: "cookie_consent",
    status: vendor ? "pass" : genericBannerFound ? "warning" : "fail",
    value: vendor ?? (genericBannerFound ? "generic_banner" : null),
    confidence: vendor ? 0.85 : genericBannerFound ? 0.4 : 0.6,
    evidence: vendorLabel
      ? `piattaforma di consenso rilevata: ${vendorLabel}`
      : genericBannerFound
        ? "banner cookie generico rilevato, piattaforma non identificata"
        : "nessuna piattaforma di consenso rilevata durante questa scansione",
    weight: 70,
  });

  const trackers = detectTrackers(ctx.html);
  const anyTrackerDetected = trackers.some((t) => t.detected);
  const hasCmp = Boolean(vendor) || genericBannerFound;

  checks.push({
    id: "consent_before_tracking",
    category: "cookie_consent",
    status: !anyTrackerDetected ? "unknown" : hasCmp ? "pass" : "fail",
    value: { anyTrackerDetected, hasCmp },
    confidence: anyTrackerDetected ? 0.6 : 0.3,
    evidence: !anyTrackerDetected
      ? "nessun tracciamento rilevato da verificare"
      : hasCmp
        ? "tracciamento rilevato in presenza di un banner di consenso"
        : "tracciamento rilevato senza un banner di consenso identificabile — configurazione da approfondire",
    weight: 30,
  });

  return checks;
}
