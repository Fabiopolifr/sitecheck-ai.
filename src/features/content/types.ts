export type ContentType =
  | "data_insight"
  | "educational"
  | "problem_pain"
  | "quiz"
  | "site_score_concept"
  | "conversion_cta";

export type ContentSourceType = "evergreen" | "insight";

export type ContentPostStatus =
  "queued" | "approved" | "published" | "rejected";

export type ContentPost = {
  id: string;
  type: ContentType;
  sourceType: ContentSourceType;
  sourceReference: string | null;
  headline: string;
  body: string;
  cta: string | null;
  imageUrl: string | null;
  status: ContentPostStatus;
  scheduledAt: string | null;
  publishedAt: string | null;
  createdAt: string;
};

export type NewContentPost = Omit<
  ContentPost,
  "id" | "status" | "publishedAt" | "createdAt" | "scheduledAt"
> & {
  status?: ContentPostStatus;
  scheduledAt?: string | null;
};

export type ContentInsight = {
  id: string;
  industry: string;
  metric: string;
  sampleSize: number;
  value: unknown;
  periodStart: string;
  periodEnd: string;
  sourceQueryHash: string;
  createdAt: string;
};

export type NewContentInsight = Omit<ContentInsight, "id" | "createdAt">;
