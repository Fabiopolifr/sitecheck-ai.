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
