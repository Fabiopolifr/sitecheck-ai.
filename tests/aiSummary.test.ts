import { describe, expect, it, vi, beforeEach } from "vitest";
import { auditSummarySchema } from "@/lib/ai/schema";
import type { AuditResult } from "@/features/audit/types";

const getAIProviderMock = vi.fn();
vi.mock("@/lib/ai", () => ({
  getAIProvider: () => getAIProviderMock(),
}));

const { generateAuditSummary } = await import("@/features/audit/aiSummary");

function buildAudit(overrides: Partial<AuditResult> = {}): AuditResult {
  return {
    id: "test-id",
    status: "completed",
    requestedUrl: "https://example.com",
    finalUrl: "https://example.com/",
    hostname: "example.com",
    industry: "real_estate",
    siteScore: 40,
    band: "critical",
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    categories: [
      {
        category: "cookie_consent",
        score: 0,
        checks: [
          {
            id: "cmp_detected",
            category: "cookie_consent",
            status: "fail",
            value: null,
            confidence: 0.8,
            evidence: "nessuna piattaforma di consenso rilevata",
            weight: 70,
          },
        ],
      },
      {
        category: "seo",
        score: 100,
        checks: [
          {
            id: "title_length",
            category: "seo",
            status: "pass",
            value: 30,
            confidence: 0.8,
            weight: 15,
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe("auditSummarySchema", () => {
  it("accepts a well-formed summary", () => {
    const result = auditSummarySchema.safeParse({
      summary: "Il sito ha alcune criticità da verificare.",
      top_priorities: [
        {
          title: "cmp_detected",
          reason: "nessun CMP rilevato",
          severity: "high",
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid severity", () => {
    const result = auditSummarySchema.safeParse({
      summary: "Test",
      top_priorities: [{ title: "x", reason: "y", severity: "critical" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing summary", () => {
    const result = auditSummarySchema.safeParse({ top_priorities: [] });
    expect(result.success).toBe(false);
  });
});

describe("generateAuditSummary (deterministic fallback)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAIProviderMock.mockReturnValue(null);
  });

  it("falls back to a deterministic summary when no AI provider is configured", async () => {
    const summary = await generateAuditSummary(buildAudit());
    expect(summary.provider).toBe("deterministic");
    expect(summary.model).toBeNull();
    expect(summary.summary).toContain("40/100");
    expect(summary.top_priorities.length).toBeGreaterThan(0);
    expect(summary.top_priorities[0].title).toBe("cmp_detected");
  });

  it("falls back to deterministic when the configured AI provider throws", async () => {
    getAIProviderMock.mockReturnValue({
      generateAuditSummary: vi
        .fn()
        .mockRejectedValue(new Error("network down")),
    });

    const summary = await generateAuditSummary(buildAudit());
    expect(summary.provider).toBe("deterministic");
    expect(summary.top_priorities[0].title).toBe("cmp_detected");
  });

  it("falls back to deterministic when the AI provider returns malformed data", async () => {
    getAIProviderMock.mockReturnValue({
      generateAuditSummary: vi.fn().mockResolvedValue({ garbage: true }),
    });

    const summary = await generateAuditSummary(buildAudit());
    expect(summary.provider).toBe("deterministic");
  });

  it("reports no issues when every check passes", async () => {
    const audit = buildAudit({
      categories: [
        {
          category: "seo",
          score: 100,
          checks: [
            {
              id: "title_length",
              category: "seo",
              status: "pass",
              value: 30,
              confidence: 0.8,
              weight: 15,
            },
          ],
        },
      ],
    });
    const summary = await generateAuditSummary(audit);
    expect(summary.top_priorities).toHaveLength(0);
    expect(summary.summary).toContain("Nessuna criticità");
  });
});
