import { describe, expect, it } from "vitest";
import { resolveRegulatoryExposure } from "@/features/audit/regulatoryExposure";
import type { CategoryResult } from "@/features/audit/types";

describe("resolveRegulatoryExposure", () => {
  it("returns 'critica' with GDPR art. 83(5) max fine when a critical cap fired", () => {
    const categories: CategoryResult[] = [
      {
        category: "cookie_consent",
        score: 10,
        checks: [],
        capApplied: {
          reasonCode: "cookie_cmp_absent_trackers_active",
          label: "Nessuna piattaforma di consenso rilevata con tracker attivi",
          cap: 10,
          cappedFrom: 60,
        },
      },
    ];
    const result = resolveRegulatoryExposure(categories);
    expect(result?.level).toBe("critica");
    expect(result?.maxFineText).toContain("20.000.000");
    expect(result?.articles).toContain("Art. 122 D.Lgs. 196/2003");
  });

  it("picks the single most severe finding, not a sum, when both categories are capped", () => {
    const categories: CategoryResult[] = [
      {
        category: "cookie_consent",
        score: 30,
        checks: [],
        capApplied: {
          reasonCode: "cookie_cmp_absent",
          label: "Nessuna piattaforma di consenso rilevata",
          cap: 30,
          cappedFrom: 60,
        },
      },
      {
        category: "privacy",
        score: 15,
        checks: [],
        capApplied: {
          reasonCode: "privacy_policy_absent",
          label: "Informativa privacy non rilevata",
          cap: 15,
          cappedFrom: 60,
        },
      },
    ];
    const result = resolveRegulatoryExposure(categories);
    expect(result?.level).toBe("critica");
    expect(result?.headline).toContain("informativa privacy");
  });

  it("returns 'rischio_elevato' for a low score without a critical cap", () => {
    const categories: CategoryResult[] = [
      { category: "cookie_consent", score: 40, checks: [] },
    ];
    const result = resolveRegulatoryExposure(categories);
    expect(result?.level).toBe("rischio_elevato");
    expect(result?.maxFineText).not.toBeNull();
  });

  it("returns 'attenzione' for a middling score, with no fine text", () => {
    const categories: CategoryResult[] = [
      { category: "cookie_consent", score: 65, checks: [] },
    ];
    const result = resolveRegulatoryExposure(categories);
    expect(result?.level).toBe("attenzione");
    expect(result?.maxFineText).toBeNull();
  });

  it("returns 'conforme' when both categories score well", () => {
    const categories: CategoryResult[] = [
      { category: "cookie_consent", score: 95, checks: [] },
      { category: "privacy", score: 90, checks: [] },
    ];
    const result = resolveRegulatoryExposure(categories);
    expect(result?.level).toBe("conforme");
  });

  it("returns null when neither category is scored", () => {
    const categories: CategoryResult[] = [
      { category: "seo", score: 40, checks: [] },
    ];
    expect(resolveRegulatoryExposure(categories)).toBeNull();
  });
});
