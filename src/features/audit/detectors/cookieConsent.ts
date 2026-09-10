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

  // Legal basis for a CMP requirement: art. 122 D.Lgs. 196/2003 (Codice
  // Privacy) requires prior consent for non-technical trackers; the
  // Garante Privacy's Linee guida cookie del 10 giugno 2021 set out what
  // a compliant banner/CMP must offer (granular choice, easy revocation,
  // no dark patterns). This is a static-analysis signal, not a legal
  // certification — see the disclaimer on the results page.
  checks.push({
    id: "cmp_detected",
    category: "cookie_consent",
    status: vendor ? "pass" : genericBannerFound ? "warning" : "fail",
    value: vendor ?? (genericBannerFound ? "generic_banner" : null),
    confidence: vendor ? 0.85 : genericBannerFound ? 0.4 : 0.6,
    evidence: vendorLabel
      ? `piattaforma di consenso rilevata: ${vendorLabel}`
      : genericBannerFound
        ? "banner cookie generico rilevato, piattaforma non identificata (art. 122 D.Lgs. 196/2003; Garante Privacy, Linee guida cookie 10 giugno 2021)"
        : "nessuna piattaforma di consenso rilevata durante questa scansione (art. 122 D.Lgs. 196/2003; Garante Privacy, Linee guida cookie 10 giugno 2021)",
    weight: 70,
  });

  const trackers = detectTrackers(ctx.html);
  const anyTrackerDetected = trackers.some((t) => t.detected);
  const hasCmp = Boolean(vendor) || genericBannerFound;

  // Consent must precede activation of non-technical trackers (art. 5(3)
  // ePrivacy Directive as read by EDPB Guidelines 2/2023; CGUE C-673/17
  // Planet49 on active, informed consent). This check is a coarse static
  // signal (tracker script present in the HTML we fetched vs. a CMP
  // present anywhere on the page) — it cannot confirm whether the
  // tracker actually fires *before* consent is given, which needs
  // runtime/behavioral testing, not a static HTML fetch.
  checks.push({
    id: "consent_before_tracking",
    category: "cookie_consent",
    status: !anyTrackerDetected ? "unknown" : hasCmp ? "pass" : "fail",
    value: { anyTrackerDetected, hasCmp },
    confidence: anyTrackerDetected ? 0.6 : 0.3,
    evidence: !anyTrackerDetected
      ? "nessun tracciamento rilevato da verificare"
      : hasCmp
        ? "tracciamento rilevato in presenza di un banner di consenso — verifica manuale consigliata sull'attivazione effettiva prima del consenso (art. 5(3) direttiva ePrivacy; CGUE C-673/17 Planet49)"
        : "tracciamento rilevato senza un banner di consenso identificabile — configurazione da approfondire (art. 122 D.Lgs. 196/2003; art. 7 GDPR)",
    weight: 30,
  });

  return checks;
}
