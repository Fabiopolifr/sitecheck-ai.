export type OutreachSource = "manual" | "google_maps";

export type OutreachStatus =
  | "queued"
  | "analyzed"
  | "ineligible"
  | "no_email_found"
  | "emailed"
  | "send_failed"
  | "suppressed";

export type OutreachSite = {
  id: string;
  source: OutreachSource;
  businessName: string | null;
  website: string;
  domain: string;
  city: string | null;
  queryUsed: string | null;
  auditId: string | null;
  siteScore: number | null;
  band: string | null;
  contactEmail: string | null;
  eligible: boolean | null;
  eligibilityReason: string | null;
  status: OutreachStatus;
  createdAt: string;
  analyzedAt: string | null;
  emailedAt: string | null;
};

export type NewOutreachSite = {
  source: OutreachSource;
  website: string;
  domain: string;
  businessName?: string | null;
  city?: string | null;
  queryUsed?: string | null;
};

export type OutreachSuppression = {
  id: string;
  email: string | null;
  domain: string | null;
  reason: string | null;
  createdAt: string;
};
