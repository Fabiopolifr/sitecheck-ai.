import { describe, expect, it } from "vitest";
import {
  detectExistingCmp,
  evaluateDomainExclusion,
} from "@/features/outreach/exclusions";
import { evaluateOutreachEligibility } from "@/features/outreach/eligibility";
import type { AuditResult, Check } from "@/features/audit/types";

function auditWithCmp(
  cmpValue: unknown,
  hostname = "agenziarossi.it",
): AuditResult {
  const cmpCheck: Check = {
    id: "cmp_detected",
    category: "cookie_consent",
    status: cmpValue ? "pass" : "fail",
    value: cmpValue,
    confidence: 0.85,
    weight: 70,
  };

  return {
    id: "audit-1",
    status: "completed",
    requestedUrl: `https://${hostname}`,
    finalUrl: `https://${hostname}`,
    hostname,
    industry: "real_estate",
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    siteScore: 40,
    band: "needs_attention",
    categories: [
      {
        category: "cookie_consent",
        score: 20,
        checks: [cmpCheck],
        capApplied: null,
      },
      { category: "privacy", score: 30, checks: [], capApplied: null },
    ],
  };
}

describe("evaluateDomainExclusion", () => {
  it("excludes big franchise domains", () => {
    expect(evaluateDomainExclusion("tecnocasa.it").excluded).toBe(true);
    expect(evaluateDomainExclusion("gabetti.it").excluded).toBe(true);
    expect(evaluateDomainExclusion("remax.it").excluded).toBe(true);
  });

  it("excludes franchise subdomains and local network pages", () => {
    expect(evaluateDomainExclusion("milano.tecnocasa.it").excluded).toBe(true);
    expect(evaluateDomainExclusion("avellino.capitalhouse.it").excluded).toBe(
      true,
    );
  });

  it("excludes portals and aggregators", () => {
    expect(evaluateDomainExclusion("immobiliare.it").excluded).toBe(true);
    expect(evaluateDomainExclusion("casa.it").excluded).toBe(true);
    expect(evaluateDomainExclusion("idealista.it").excluded).toBe(true);
  });

  it("does not exclude an independent agency whose name merely contains a generic word", () => {
    expect(evaluateDomainExclusion("casarossi.it").excluded).toBe(false);
    expect(evaluateDomainExclusion("immobiliarerossi.it").excluded).toBe(false);
    expect(evaluateDomainExclusion("agenziaverdi.com").excluded).toBe(false);
  });

  it("ignores a www prefix", () => {
    expect(evaluateDomainExclusion("www.tecnocasa.it").excluded).toBe(true);
  });
});

describe("detectExistingCmp", () => {
  it("recognises Iubenda and CookieYes", () => {
    expect(detectExistingCmp(auditWithCmp("iubenda"))).toBe("Iubenda");
    expect(detectExistingCmp(auditWithCmp("cookieyes"))).toBe("CookieYes");
  });

  it("does not treat an unidentified generic banner as a real CMP", () => {
    expect(detectExistingCmp(auditWithCmp("generic_banner"))).toBeNull();
  });

  it("returns null when no CMP was found", () => {
    expect(detectExistingCmp(auditWithCmp(null))).toBeNull();
  });
});

describe("evaluateOutreachEligibility exclusions", () => {
  it("never contacts a site that already uses Iubenda, even with low scores", () => {
    const result = evaluateOutreachEligibility(auditWithCmp("iubenda"));
    expect(result.eligible).toBe(false);
    expect(result.reason).toContain("Iubenda");
  });

  it("never contacts a site that already uses CookieYes", () => {
    const result = evaluateOutreachEligibility(auditWithCmp("cookieyes"));
    expect(result.eligible).toBe(false);
    expect(result.reason).toContain("CookieYes");
  });

  it("never contacts a franchise domain, even with low scores", () => {
    const result = evaluateOutreachEligibility(
      auditWithCmp(null, "milano.tecnocasa.it"),
    );
    expect(result.eligible).toBe(false);
    expect(result.reason).toContain("franchising");
  });

  it("still contacts an independent agency with no CMP and low scores", () => {
    const result = evaluateOutreachEligibility(auditWithCmp(null));
    expect(result.eligible).toBe(true);
  });
});
