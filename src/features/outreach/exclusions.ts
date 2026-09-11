import type { AuditResult } from "@/features/audit/types";

/**
 * Big franchise / portal brands whose sites are corporate or
 * institutional: the local "agency" page is usually a sub-page of a
 * national network that has its own legal and IT department, so a cold
 * email about their cookie banner reaches nobody who can act on it and
 * costs credibility (AI/DECISIONS.md D43). Matched as a whole label
 * inside the domain, so "tecnocasa.it" and "milano.tecnocasa.it" are
 * both excluded while an unrelated "casatecnologia.it" is not.
 */
const EXCLUDED_BRANDS = [
  "tecnocasa",
  "tecnorete",
  "gabetti",
  "grimaldi",
  "toscano",
  "remax",
  "re-max",
  "engelvoelkers",
  "engelandvoelkers",
  "kwitalia",
  "century21",
  "coldwellbanker",
  "professionecasa",
  "tempocasa",
  "frimm",
  "gromia",
  "capitalhouse",
  "affiliatifrimm",
  "unicasa",
  "solocase",
  "fondocasa",
  "casaitalia",
  "immobiliare",
  "idealista",
  "casa",
  "subito",
  "bakeca",
  "gocasa",
  "wikicasa",
  "borsinoimmobiliare",
  "fimaa",
  "fiaip",
  "confedilizia",
] as const;

/**
 * Portal/aggregator and franchise domains are excluded by exact host
 * match too, for the cases where the brand name alone is too generic to
 * match safely (e.g. "casa", "immobiliare").
 */
const EXCLUDED_EXACT_DOMAINS = new Set([
  "immobiliare.it",
  "casa.it",
  "idealista.it",
  "subito.it",
  "bakeca.it",
  "wikicasa.it",
  "borsinoimmobiliare.it",
  "gocasa.it",
  "trovacasa.net",
  "attico.it",
  "bakecacase.it",
  "homepal.it",
  "facebook.com",
  "instagram.com",
  "linkedin.com",
  "google.com",
  "wordpress.com",
  "wixsite.com",
  "blogspot.com",
]);

/**
 * Brand names generic enough that a substring match would produce false
 * positives ("casa" matches half the Italian real-estate domains), so
 * they are only honoured via EXCLUDED_EXACT_DOMAINS above.
 */
const GENERIC_BRANDS = new Set(["casa", "immobiliare", "idealista", "subito"]);

function normalizeDomain(domain: string): string {
  return domain
    .toLowerCase()
    .replace(/^www\./, "")
    .trim();
}

export type DomainExclusion = {
  excluded: boolean;
  reason: string | null;
};

export function evaluateDomainExclusion(domain: string): DomainExclusion {
  const normalized = normalizeDomain(domain);

  if (EXCLUDED_EXACT_DOMAINS.has(normalized)) {
    return {
      excluded: true,
      reason: `Portale o sito istituzionale (${normalized}), non un'azienda da contattare`,
    };
  }

  // Strip the TLD before matching so "tecnocasa.it" matches on the label
  // "tecnocasa", not on an accidental substring of the suffix.
  const labels = normalized.split(".").slice(0, -1);

  for (const brand of EXCLUDED_BRANDS) {
    if (GENERIC_BRANDS.has(brand)) continue;
    if (labels.some((label) => label.includes(brand))) {
      return {
        excluded: true,
        reason: `Sito di un grande franchising o rete (${brand}): il sito è istituzionale, non gestito localmente`,
      };
    }
  }

  return { excluded: false, reason: null };
}

const CMP_LABELS: Record<string, string> = {
  cookieyes: "CookieYes",
  iubenda: "Iubenda",
  onetrust: "OneTrust",
  cookiebot: "Cookiebot",
  complianz: "Complianz",
  didomi: "Didomi",
  usercentrics: "Usercentrics",
  osano: "Osano",
  termly: "Termly",
  axeptio: "Axeptio",
  cookiescript: "CookieScript",
  borlabs_cookie: "Borlabs Cookie",
  real_cookie_banner: "Real Cookie Banner",
  webtoffee: "WebToffee",
  quantcast: "Quantcast",
  google_funding_choices: "Google Funding Choices",
};

/**
 * A site already running a real Consent Management Platform has already
 * bought a solution to the problem this outreach is about — emailing it
 * reads as not having looked at the site (AI/DECISIONS.md D43). The
 * generic-banner case is deliberately NOT excluded: an unidentified
 * banner is often a hand-rolled one that genuinely fails the checks.
 */
export function detectExistingCmp(audit: AuditResult): string | null {
  const cookieConsent = audit.categories.find(
    (c) => c.category === "cookie_consent",
  );
  const cmpCheck = cookieConsent?.checks.find((c) => c.id === "cmp_detected");

  const value = cmpCheck?.value;
  if (typeof value !== "string" || value === "generic_banner") return null;

  return CMP_LABELS[value] ?? value;
}
