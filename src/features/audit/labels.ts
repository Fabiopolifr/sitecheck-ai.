import type { Category, CheckStatus, ScoreBand } from "./types";

export const CATEGORY_LABELS: Record<Category, string> = {
  technical: "Tecnico",
  seo: "SEO",
  privacy: "Privacy",
  cookie_consent: "Cookie & Consent",
  tracking: "Tracking",
  performance: "Performance",
  forms: "Moduli di contatto",
};

export const STATUS_LABELS: Record<CheckStatus, string> = {
  pass: "OK",
  warning: "Da verificare",
  fail: "Criticità rilevata",
  unknown: "Non disponibile",
};

export const BAND_LABELS: Record<ScoreBand, string> = {
  strong: "Ottimo",
  good: "Buono",
  needs_attention: "Da migliorare",
  critical: "Criticità importanti",
};

/** Semantic color token per band, used by ScoreGauge and result badges. */
export const BAND_COLORS: Record<
  ScoreBand,
  { text: string; bg: string; ring: string }
> = {
  strong: { text: "text-success", bg: "bg-success/10", ring: "stroke-success" },
  good: { text: "text-accent", bg: "bg-accent-soft", ring: "stroke-accent" },
  needs_attention: {
    text: "text-warning",
    bg: "bg-warning/10",
    ring: "stroke-warning",
  },
  critical: { text: "text-danger", bg: "bg-danger/10", ring: "stroke-danger" },
};
