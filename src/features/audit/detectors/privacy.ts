import type { Check, DetectorContext } from "../types";

const PRIVACY_KEYWORDS = [
  "privacy policy",
  "privacy",
  "informativa privacy",
  "informativa sulla privacy",
];

const COOKIE_POLICY_KEYWORDS = [
  "cookie policy",
  "politica cookie",
  "cookie",
  "cookies",
];

function findLinkMatching(
  $: DetectorContext["$"],
  keywords: string[],
): string | undefined {
  let match: string | undefined;
  $("a").each((_, el) => {
    if (match) return;
    const text = $(el).text().trim().toLowerCase();
    const href = ($(el).attr("href") ?? "").toLowerCase();
    if (
      keywords.some(
        (k) => text.includes(k) || href.includes(k.replace(/\s+/g, "-")),
      )
    ) {
      match = $(el).attr("href") ?? text;
    }
  });
  return match;
}

export function detectPrivacy(ctx: DetectorContext): Check[] {
  const { $ } = ctx;
  const checks: Check[] = [];

  const privacyLink = findLinkMatching($, PRIVACY_KEYWORDS);
  checks.push({
    id: "privacy_policy_link",
    category: "privacy",
    status: privacyLink ? "pass" : "fail",
    value: Boolean(privacyLink),
    confidence: 0.7,
    evidence: privacyLink
      ? `link rilevato: ${privacyLink}`
      : "nessun link rilevato durante questa scansione",
    weight: 60,
  });

  const cookieLink = findLinkMatching($, COOKIE_POLICY_KEYWORDS);
  checks.push({
    id: "cookie_policy_link",
    category: "privacy",
    status: cookieLink ? "pass" : "fail",
    value: Boolean(cookieLink),
    confidence: 0.6,
    evidence: cookieLink
      ? `link rilevato: ${cookieLink}`
      : "nessun link rilevato durante questa scansione",
    weight: 40,
  });

  return checks;
}
