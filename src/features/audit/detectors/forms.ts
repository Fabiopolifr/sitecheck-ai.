import type { Check, DetectorContext } from "../types";

const CONSENT_TEXT_KEYWORDS = [
  "privacy",
  "consenso",
  "trattamento dei dati",
  "informativa",
];

/**
 * Purely informational: forms are not part of AI/MASTER_SPEC.md's scoring
 * weights (§8), so every check here has weight 0 and is excluded from the
 * Site Score. It is still surfaced in the results UI.
 */
export function detectForms(ctx: DetectorContext): Check[] {
  const { $ } = ctx;
  const forms = $("form");

  const emailFields = $('input[type="email"], input[name*="email" i]').length;
  const phoneFields = $(
    'input[type="tel"], input[name*="phone" i], input[name*="telefono" i]',
  ).length;
  const checkboxFields = $('input[type="checkbox"]').length;

  const bodyText = $("body").text().toLowerCase();
  const consentTextNearby =
    forms.length > 0 &&
    CONSENT_TEXT_KEYWORDS.some((keyword) => bodyText.includes(keyword));

  return [
    {
      id: "forms_count",
      category: "forms",
      status: "unknown",
      value: forms.length,
      confidence: 0.9,
      weight: 0,
    },
    {
      id: "forms_email_fields",
      category: "forms",
      status: "unknown",
      value: emailFields,
      confidence: 0.7,
      weight: 0,
    },
    {
      id: "forms_phone_fields",
      category: "forms",
      status: "unknown",
      value: phoneFields,
      confidence: 0.6,
      weight: 0,
    },
    {
      id: "forms_checkbox_fields",
      category: "forms",
      status: "unknown",
      value: checkboxFields,
      confidence: 0.6,
      weight: 0,
    },
    {
      id: "forms_consent_text_nearby",
      category: "forms",
      status:
        forms.length === 0 ? "unknown" : consentTextNearby ? "pass" : "warning",
      value: consentTextNearby,
      confidence: 0.3,
      evidence: "verifica consigliata: rilevamento testuale approssimativo",
      weight: 0,
    },
  ];
}
