import type { ContentType } from "./types";

/**
 * Example weekly cadence from AI/MASTER_SPEC.md §16
 * (0 = Sunday ... 6 = Saturday, matching Date#getDay()).
 */
export const WEEKLY_SCHEDULE: Partial<Record<number, ContentType>> = {
  1: "data_insight", // Monday
  3: "educational", // Wednesday
  5: "conversion_cta", // Friday
};

export function getScheduledContentType(date: Date): ContentType | null {
  return WEEKLY_SCHEDULE[date.getDay()] ?? null;
}
