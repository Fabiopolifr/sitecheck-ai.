import { computeCookieConsentInsight } from "./insights";
import { pickEvergreenTemplate } from "./evergreen";
import type { AuditResult } from "@/features/audit/types";
import type { ContentType, NewContentInsight, NewContentPost } from "./types";

function buildInsightPost(insight: NewContentInsight): NewContentPost {
  const value = insight.value as {
    rate: number;
    issueCount: number;
    totalCount: number;
  };

  return {
    type: "data_insight",
    sourceType: "insight",
    sourceReference: null, // set by the caller once the insight row is saved
    headline: "Cosa emerge dai siti che abbiamo analizzato",
    body: `Su ${insight.sampleSize} siti di agenzie immobiliari analizzati con SiteCheck AI, il ${value.rate}% presenta un elemento da verificare nella gestione di cookie e consenso.`,
    cta: "Controlla il tuo sito gratis",
    imageUrl: null,
  };
}

function buildEvergreenPost(type: ContentType, seed: number): NewContentPost {
  const template = pickEvergreenTemplate(type, seed);
  return {
    type,
    sourceType: "evergreen",
    sourceReference: null,
    headline: template.headline,
    body: template.body,
    cta: template.cta,
    imageUrl: null,
  };
}

export type GeneratedContent = {
  post: NewContentPost;
  /** Present only when the post is backed by a freshly computed insight
   * that still needs to be persisted before the post references it. */
  insightToSave: NewContentInsight | null;
};

/**
 * Builds one content post for the given type. For "data_insight", uses a
 * real aggregate insight when the sample threshold is met (§15); falls
 * back to evergreen content otherwise or for every other type — no type
 * except data_insight currently has a data-driven variant, and that's a
 * deliberate, honest default rather than inventing one.
 */
export function generateContent(
  type: ContentType,
  audits: AuditResult[],
  industry = "real_estate",
  seed = 0,
): GeneratedContent {
  if (type === "data_insight") {
    const insight = computeCookieConsentInsight(audits, industry);
    if (insight) {
      return { post: buildInsightPost(insight), insightToSave: insight };
    }
  }

  return { post: buildEvergreenPost(type, seed), insightToSave: null };
}
