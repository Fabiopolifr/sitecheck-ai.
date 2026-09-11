import type { AuditResult } from "@/features/audit/types";
import { detectExistingCmp, evaluateDomainExclusion } from "./exclusions";

export type EligibilityResult = {
  eligible: boolean;
  reason: string;
};

/**
 * Decides whether a site's *privacy and cookie compliance* — not its
 * overall Site Score — is broken enough to justify a cold outreach email
 * (AI/DECISIONS.md D37). Deliberately narrower than "is this site bad":
 * a site with poor SEO but a solid CMP is not what this outreach is for.
 *
 * Two exclusions are checked before any finding (D43): big franchise /
 * portal domains, and sites already running a real CMP. Both are cases
 * where the email would land badly regardless of what the audit found.
 */
export function evaluateOutreachEligibility(
  audit: AuditResult,
): EligibilityResult {
  const domainExclusion = evaluateDomainExclusion(audit.hostname);
  if (domainExclusion.excluded) {
    return { eligible: false, reason: domainExclusion.reason! };
  }

  const existingCmp = detectExistingCmp(audit);
  if (existingCmp) {
    return {
      eligible: false,
      reason: `Usa già una piattaforma di consenso (${existingCmp})`,
    };
  }

  const cookieConsent = audit.categories.find(
    (c) => c.category === "cookie_consent",
  );
  const privacy = audit.categories.find((c) => c.category === "privacy");

  if (cookieConsent?.capApplied) {
    return {
      eligible: true,
      reason: `Cookie & Consent: ${cookieConsent.capApplied.label}`,
    };
  }
  if (privacy?.capApplied) {
    return {
      eligible: true,
      reason: `Privacy: ${privacy.capApplied.label}`,
    };
  }
  if (
    cookieConsent?.score !== null &&
    cookieConsent &&
    cookieConsent.score < 50
  ) {
    return {
      eligible: true,
      reason: `Punteggio Cookie & Consent basso (${cookieConsent.score}/100)`,
    };
  }
  if (privacy?.score !== null && privacy && privacy.score < 50) {
    return {
      eligible: true,
      reason: `Punteggio Privacy basso (${privacy.score}/100)`,
    };
  }

  return {
    eligible: false,
    reason: "Nessun problema rilevante di privacy o cookie policy rilevato",
  };
}
