import { describe, expect, it } from "vitest";
import {
  computeCookieConsentInsight,
  MINIMUM_SAMPLE_SIZE,
} from "@/features/content/insights";
import { generateContent } from "@/features/content/generate";
import { getScheduledContentType } from "@/features/content/schedule";
import type { AuditResult } from "@/features/audit/types";

function buildAudit(
  cmpStatus: "pass" | "fail" | "warning",
  overrides: Partial<AuditResult> = {},
): AuditResult {
  return {
    id: crypto.randomUUID(),
    status: "completed",
    requestedUrl: "https://example.com",
    finalUrl: "https://example.com/",
    hostname: "example.com",
    industry: "real_estate",
    siteScore: 60,
    band: "needs_attention",
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    categories: [
      {
        category: "cookie_consent",
        score: cmpStatus === "pass" ? 100 : 0,
        checks: [
          {
            id: "cmp_detected",
            category: "cookie_consent",
            status: cmpStatus,
            value: null,
            confidence: 0.8,
            weight: 70,
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe("computeCookieConsentInsight", () => {
  it("refuses to compute below the minimum sample size", () => {
    const audits = Array.from({ length: MINIMUM_SAMPLE_SIZE - 1 }, () =>
      buildAudit("fail"),
    );
    expect(computeCookieConsentInsight(audits, "real_estate")).toBeNull();
  });

  it("computes a real rate once the threshold is met", () => {
    const failing = Array.from({ length: 20 }, () => buildAudit("fail"));
    const passing = Array.from({ length: 10 }, () => buildAudit("pass"));
    const insight = computeCookieConsentInsight(
      [...failing, ...passing],
      "real_estate",
    );

    expect(insight).not.toBeNull();
    expect(insight!.sampleSize).toBe(30);
    expect(insight!.value).toMatchObject({
      issueCount: 20,
      totalCount: 30,
      rate: 67,
    });
  });

  it("only counts the requested industry", () => {
    const realEstate = Array.from({ length: 30 }, () => buildAudit("fail"));
    const other = Array.from({ length: 30 }, () =>
      buildAudit("fail", { industry: "hotel" }),
    );
    const insight = computeCookieConsentInsight(
      [...realEstate, ...other],
      "real_estate",
    );
    expect(insight!.sampleSize).toBe(30);
  });

  it("ignores non-completed audits", () => {
    const audits = Array.from({ length: 30 }, () =>
      buildAudit("fail", { status: "failed" }),
    );
    expect(computeCookieConsentInsight(audits, "real_estate")).toBeNull();
  });
});

describe("generateContent", () => {
  it("falls back to evergreen data_insight content below the threshold", () => {
    const { post, insightToSave } = generateContent("data_insight", []);
    expect(post.sourceType).toBe("evergreen");
    expect(insightToSave).toBeNull();
    expect(post.headline.length).toBeGreaterThan(0);
  });

  it("uses a real insight once the threshold is met", () => {
    const audits = Array.from({ length: 30 }, () => buildAudit("fail"));
    const { post, insightToSave } = generateContent("data_insight", audits);
    expect(post.sourceType).toBe("insight");
    expect(insightToSave).not.toBeNull();
    expect(post.body).toContain("30 siti");
  });

  it("always uses evergreen content for non-data_insight types", () => {
    const audits = Array.from({ length: 30 }, () => buildAudit("fail"));
    const { post, insightToSave } = generateContent("educational", audits);
    expect(post.sourceType).toBe("evergreen");
    expect(insightToSave).toBeNull();
  });

  it("never fabricates a statistic in evergreen copy", () => {
    const { post } = generateContent("data_insight", []);
    expect(post.body).not.toMatch(/\d+%/);
  });
});

describe("getScheduledContentType", () => {
  it("schedules data_insight on Monday", () => {
    expect(getScheduledContentType(new Date("2026-09-07"))).toBe(
      "data_insight",
    );
  });

  it("returns null on unscheduled days", () => {
    expect(getScheduledContentType(new Date("2026-09-08"))).toBeNull();
  });
});
