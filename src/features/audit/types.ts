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

export type CategoryResult = {
  category: Category;
  score: number | null;
  checks: Check[];
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
