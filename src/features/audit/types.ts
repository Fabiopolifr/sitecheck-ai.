import type { CheerioAPI } from "cheerio";

export type CheckStatus = "pass" | "warning" | "fail" | "unknown";

export type Category =
  | "technical"
  | "seo"
  | "privacy"
  | "cookie_consent"
  | "tracking"
  | "performance"
  | "forms";

export type Check = {
  id: string;
  category: Category;
  status: CheckStatus;
  value: unknown;
  confidence: number;
  evidence?: string;
  weight: number;
};

/**
 * A "critical score cap" fired for this category (AI/DECISIONS.md D34):
 * one finding is severe enough that it caps the category score regardless
 * of how many other checks passed, instead of letting them average it out.
 */
export type ScoreCap = {
  reasonCode: string;
  label: string;
  cap: number;
  cappedFrom: number;
};

export type CategoryResult = {
  category: Category;
  score: number | null;
  checks: Check[];
  capApplied?: ScoreCap | null;
};

export type AuditStatus = "completed" | "failed";

export type ScoreBand = "strong" | "good" | "needs_attention" | "critical";

export type AuditResult = {
  id: string;
  status: AuditStatus;
  requestedUrl: string;
  finalUrl: string | null;
  hostname: string;
  industry: string;
  startedAt: string;
  completedAt: string;
  siteScore: number | null;
  band: ScoreBand | null;
  categories: CategoryResult[];
  failureReason?: string;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
};

/** Context handed to every detector. Detectors must be pure and synchronous. */
export type PageSpeedData = {
  performanceScore: number; // 0-100
  source: "pagespeed";
};

export type DetectorContext = {
  html: string;
  $: CheerioAPI;
  finalUrl: URL;
  status: number;
  contentType: string | null;
  elapsedMs: number;
  pageSpeed: PageSpeedData | null;
};

export type Detector = (ctx: DetectorContext) => Check[];
