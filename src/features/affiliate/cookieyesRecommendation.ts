import type { CategoryResult } from "@/features/audit/types";

export type RecommendationPriority = "low" | "medium" | "high";

export type CookieYesRecommendation = {
  showRecommendation: boolean;
  priority: RecommendationPriority;
  reasonCode: string;
  title: string;
  description: string;
  benefits: string[];
  ctaLabel: string;
  /** Internal relevance score (0-100+) that produced `priority` — exposed for the admin funnel, never fed back into the Site Score. */
  relevanceScore: number;
  /** Score of the cookie_consent category alone (audit.categories score), null if not computed. */
  cookieConsentScore: number | null;
  /** Whether to show the "€99 assisted setup" secondary CTA — see AI/DECISIONS.md. */
  showSupportCta: boolean;
  supportCtaCopy: string;
};

const NONE: CookieYesRecommendation = {
  showRecommendation: false,
  priority: "low",
  reasonCode: "none",
  title: "",
  description: "",
  benefits: [],
  ctaLabel: "",
  relevanceScore: 0,
  cookieConsentScore: null,
  showSupportCta: false,
  supportCtaCopy: "",
};

function checksFor(categories: CategoryResult[], category: string) {
  return categories.find((c) => c.category === category)?.checks ?? [];
}

/** "Meta Pixel rilevato" -> "Meta Pixel" — reuses the detector's own evidence text instead of a second label map. */
function trackerName(evidence: string | undefined, fallbackId: string): string {
  return (
    evidence?.replace(/\s+rilevato$/, "") ?? fallbackId.replace("tracking_", "")
  );
}

function joinNames(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")} e ${names[names.length - 1]}`;
}

function supportCtaCopyFor(trackerCount: number): string {
  if (trackerCount >= 4) {
    return "Il sito utilizza più strumenti di tracking. Possiamo occuparci della configurazione iniziale completa a €99.";
  }
  if (trackerCount >= 2) {
    return "Vuoi risparmiare tempo? Lo configuriamo per te a €99.";
  }
  return "Puoi configurarlo in autonomia, oppure te lo configuriamo noi a €99.";
}

/**
 * Decides whether — and how — to recommend CookieYes for a given audit,
 * per the case table in AI/DECISIONS.md (CookieYes recommendation
 * engine). Reads only already-computed audit checks; never influences
 * scoring (see the "critical rule" in that decision — the Site Score is
 * final before this runs).
 */
export function getCookieYesRecommendation(
  categories: CategoryResult[],
): CookieYesRecommendation {
  const cookieConsentCategory = categories.find(
    (c) => c.category === "cookie_consent",
  );
  const cookieConsentScore = cookieConsentCategory?.score ?? null;
  const cookieConsentChecks = cookieConsentCategory?.checks ?? [];
  const trackingChecks = checksFor(categories, "tracking");
  const privacyChecks = checksFor(categories, "privacy");

  const cmpCheck = cookieConsentChecks.find((c) => c.id === "cmp_detected");
  const cmpVendor = typeof cmpCheck?.value === "string" ? cmpCheck.value : null;

  const detectedTrackers = trackingChecks.filter((c) => c.status === "warning");
  const trackerCount = detectedTrackers.length;
  const trackerNames = detectedTrackers.map((c) =>
    trackerName(c.evidence, c.id),
  );

  if (cmpVendor === "cookieyes") {
    return {
      ...NONE,
      showRecommendation: true,
      priority: "low",
      reasonCode: "cookieyes_detected",
      title: "CookieYes rilevato",
      description:
        "Sul sito è già presente CookieYes. Verifica la configurazione del consenso in base agli elementi rilevati durante la scansione.",
      ctaLabel: "Verifica la configurazione del consenso",
      cookieConsentScore,
      showSupportCta: true,
      supportCtaCopy:
        "Vuoi che controlliamo la configurazione? Verifica e ottimizzazione tecnica — €99 una tantum.",
    };
  }

  const hasCmp = cmpCheck?.status === "pass" || cmpCheck?.status === "warning";
  const genericBannerOnly = cmpCheck?.status === "warning" && !cmpVendor;
  const cmpEntirelyAbsent = cmpCheck?.status === "fail";

  const hasGoogleTracker = detectedTrackers.some((c) =>
    c.id.startsWith("tracking_google"),
  );
  const hasMetaPixel = detectedTrackers.some(
    (c) => c.id === "tracking_meta_pixel",
  );
  const hasTikTokPixel = detectedTrackers.some(
    (c) => c.id === "tracking_tiktok_pixel",
  );

  const cookiePolicyMissing =
    privacyChecks.find((c) => c.id === "cookie_policy_link")?.status === "fail";
  const privacyPolicyMissing =
    privacyChecks.find((c) => c.id === "privacy_policy_link")?.status ===
    "fail";

  let score = 0;
  if (trackerCount > 0 && !hasCmp) score += 40;
  // A missing CMP is itself the single highest-weighted check in the
  // whole audit (weight 70/100 of the cookie_consent category) — it must
  // score high enough to surface a recommendation even when no trackers
  // were detected on this particular fetch (a static HTML snapshot can
  // miss client-side-injected trackers; the absence of any consent
  // mechanism is a real, standalone finding regardless).
  if (cmpEntirelyAbsent) score += 35;
  if (hasGoogleTracker || hasMetaPixel || hasTikTokPixel) score += 25;
  if (cookiePolicyMissing) score += 20;
  if (privacyPolicyMissing) score += 15;
  if (trackerCount >= 2) score += 15;
  if (genericBannerOnly) score += 10;

  const showSupportCta =
    (cookieConsentScore !== null && cookieConsentScore <= 60) ||
    trackerCount >= 2;
  const supportCtaCopy = showSupportCta ? supportCtaCopyFor(trackerCount) : "";

  if (score < 20) return { ...NONE, cookieConsentScore };

  const priority: RecommendationPriority = score >= 40 ? "high" : "medium";
  const base = {
    priority,
    relevanceScore: score,
    cookieConsentScore,
    showSupportCta,
    supportCtaCopy,
  };

  // Case A — trackers detected, no consent management at all.
  if (trackerCount > 0 && !hasCmp) {
    return {
      ...base,
      showRecommendation: true,
      reasonCode: "tracking_without_cmp",
      title:
        trackerCount === 1
          ? `${trackerNames[0]} rilevato`
          : `${trackerNames.length} strumenti di tracking rilevati`,
      description: `Il sito utilizza ${joinNames(trackerNames)}, mentre un sistema di gestione del consenso non è stato rilevato. Una piattaforma dedicata può aiutarti a controllare l'attivazione degli script e le preferenze degli utenti.`,
      benefits: [
        "Scanner cookie e tracker",
        "Gestione centralizzata del consenso",
        "Blocco automatico degli script",
      ],
      ctaLabel: "Gestisci tracking e consenso",
    };
  }

  // Case A2 — no consent management at all, independent of trackers
  // (e.g. no trackers detected on this fetch, but the site has no CMP,
  // no cookie banner, nothing).
  if (cmpEntirelyAbsent) {
    return {
      ...base,
      showRecommendation: true,
      reasonCode: "no_cmp_detected",
      title: "Nessun sistema di gestione dei cookie rilevato",
      description:
        "Durante la scansione non abbiamo rilevato alcuna piattaforma di gestione del consenso (CMP) né un banner cookie sul sito.",
      benefits: [
        "Scanner automatico cookie e tracker",
        "Banner di consenso personalizzabile",
        "Registro dei consensi",
      ],
      ctaLabel: "Configura la gestione dei cookie",
    };
  }

  // Case F — multiple trackers, centralize management.
  if (trackerCount >= 2) {
    return {
      ...base,
      showRecommendation: true,
      reasonCode: "multiple_trackers",
      title: `${trackerNames.length} strumenti di tracking rilevati`,
      description: `Il sito utilizza ${joinNames(trackerNames)}. Centralizzare la gestione del consenso può rendere più semplice controllare quali script vengono attivati in base alle preferenze dell'utente.`,
      benefits: [
        "Scanner automatico cookie e tracker",
        "Blocco automatico degli script",
        "Gestione centralizzata del consenso",
      ],
      ctaLabel: "Centralizza cookie e tracker",
    };
  }

  // Case D — Google ecosystem.
  if (hasGoogleTracker) {
    return {
      ...base,
      showRecommendation: true,
      reasonCode: "google_tracking",
      title: "Tracking Google rilevato",
      description: `Il sito utilizza ${joinNames(trackerNames)}. CookieYes è una CMP certificata Google e supporta Google Consent Mode v2 e Google Tag Manager.`,
      benefits: [
        "CMP certificata Google",
        "Google Consent Mode v2",
        "Integrazione Google Tag Manager",
      ],
      ctaLabel: "Configura il consenso Google",
    };
  }

  // Case E — Meta Pixel.
  if (hasMetaPixel) {
    return {
      ...base,
      showRecommendation: true,
      reasonCode: "meta_pixel_detected",
      title: "Meta Pixel rilevato",
      description:
        "Il sito utilizza Meta Pixel. CookieYes può aiutarti a gestire il consenso e l'attivazione degli script in base alle preferenze dell'utente.",
      benefits: [
        "Gestione consenso",
        "Blocco preventivo script",
        "Registro dei consensi",
      ],
      ctaLabel: "Gestisci Meta Pixel e consenso",
    };
  }

  // Case B — cookie policy missing.
  if (cookiePolicyMissing) {
    return {
      ...base,
      showRecommendation: true,
      reasonCode: "cookie_policy_missing",
      title: "Cookie Policy da verificare",
      description:
        "Durante la scansione automatica la Cookie Policy risulta poco evidente o assente dai percorsi rilevati. CookieYes include strumenti per identificare i cookie presenti sul sito e generare una Cookie Policy basata sulle tecnologie rilevate.",
      benefits: [
        "Cookie scanner",
        "Categorizzazione dei cookie",
        "Generatore di Cookie Policy",
      ],
      ctaLabel: "Crea e gestisci la Cookie Policy",
    };
  }

  // Case C — privacy policy missing.
  if (privacyPolicyMissing) {
    return {
      ...base,
      showRecommendation: true,
      reasonCode: "privacy_policy_missing",
      title: "Privacy Policy da verificare",
      description:
        "Durante la scansione automatica la Privacy Policy risulta poco evidente o assente dai percorsi rilevati. CookieYes mette a disposizione anche un generatore di Privacy Policy configurabile. Il documento va adattato alle attività e ai trattamenti effettivi dell'organizzazione.",
      benefits: [
        "Privacy Policy generator",
        "Configurazione guidata",
        "Gestione centralizzata",
      ],
      ctaLabel: "Genera la Privacy Policy",
    };
  }

  // Case G — generic banner, CMP unknown.
  if (genericBannerOnly) {
    return {
      ...base,
      showRecommendation: true,
      reasonCode: "banner_detected_cmp_unknown",
      title: "Banner rilevato",
      description:
        "La presenza del banner rappresenta una parte del processo. Vale la pena verificare anche quali script vengono attivati e come vengono registrate le preferenze.",
      benefits: ["Scansione tracker", "Gestione script", "Consent log"],
      ctaLabel: "Verifica con CookieYes",
    };
  }

  return { ...NONE, cookieConsentScore };
}
