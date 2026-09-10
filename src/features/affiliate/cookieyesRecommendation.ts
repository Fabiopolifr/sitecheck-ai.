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
};

const NONE: CookieYesRecommendation = {
  showRecommendation: false,
  priority: "low",
  reasonCode: "none",
  title: "",
  description: "",
  benefits: [],
  ctaLabel: "",
};

function checksFor(categories: CategoryResult[], category: string) {
  return categories.find((c) => c.category === category)?.checks ?? [];
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
  const cookieConsentChecks = checksFor(categories, "cookie_consent");
  const trackingChecks = checksFor(categories, "tracking");
  const privacyChecks = checksFor(categories, "privacy");

  const cmpCheck = cookieConsentChecks.find((c) => c.id === "cmp_detected");
  const cmpVendor = typeof cmpCheck?.value === "string" ? cmpCheck.value : null;

  if (cmpVendor === "cookieyes") {
    return {
      ...NONE,
      showRecommendation: true,
      priority: "low",
      reasonCode: "cookieyes_detected",
      title: "CookieYes rilevato",
      description:
        "Sul sito è già presente CookieYes. Verifica la configurazione del consenso in base agli elementi rilevati durante la scansione.",
      benefits: [],
      ctaLabel: "Verifica la configurazione del consenso",
    };
  }

  const hasCmp = cmpCheck?.status === "pass" || cmpCheck?.status === "warning";
  const genericBannerOnly = cmpCheck?.status === "warning" && !cmpVendor;

  const detectedTrackers = trackingChecks.filter((c) => c.status === "warning");
  const trackerCount = detectedTrackers.length;
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

  const cmpEntirelyAbsent = cmpCheck?.status === "fail";

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

  if (score < 20) return NONE;

  const priority: RecommendationPriority = score >= 40 ? "high" : "medium";

  // Case A — trackers detected, no consent management at all.
  if (trackerCount > 0 && !hasCmp) {
    return {
      showRecommendation: true,
      priority,
      reasonCode: "tracking_without_cmp",
      title: "Hai strumenti di tracking attivi",
      description:
        "Durante la scansione abbiamo rilevato strumenti di misurazione o advertising, mentre un sistema di gestione del consenso non è stato rilevato.",
      benefits: [
        "Blocco automatico degli script",
        "Gestione consenso",
        "Registro dei consensi",
      ],
      ctaLabel: "Configura la gestione del consenso",
    };
  }

  // Case A2 — no consent management at all, independent of trackers
  // (e.g. no trackers detected on this fetch, but the site has no CMP,
  // no cookie banner, nothing).
  if (cmpEntirelyAbsent) {
    return {
      showRecommendation: true,
      priority,
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
      showRecommendation: true,
      priority,
      reasonCode: "multiple_trackers",
      title: "Più strumenti di tracking rilevati",
      description:
        "Abbiamo identificato più tecnologie di analytics e advertising. Centralizzare la gestione del consenso può rendere più semplice controllare quali script vengono attivati in base alle preferenze dell'utente.",
      benefits: [
        "Scanner automatico cookie e tracker",
        "Blocco automatico degli script",
        "Gestione centralizzata del consenso",
      ],
      ctaLabel: "Centralizza la gestione dei cookie",
    };
  }

  // Case D — Google ecosystem.
  if (hasGoogleTracker) {
    return {
      showRecommendation: true,
      priority,
      reasonCode: "google_tracking",
      title: "Google tracking rilevato",
      description:
        "Il sito utilizza strumenti dell'ecosistema Google. CookieYes è una CMP certificata Google e supporta Google Consent Mode v2 e Google Tag Manager.",
      benefits: [
        "CMP certificata Google",
        "Google Consent Mode v2",
        "Integrazione Google Tag Manager",
      ],
      ctaLabel: "Gestisci il consenso Google",
    };
  }

  // Case E — Meta Pixel.
  if (hasMetaPixel) {
    return {
      showRecommendation: true,
      priority,
      reasonCode: "meta_pixel",
      title: "Meta Pixel rilevato",
      description:
        "Il sito utilizza Meta Pixel. CookieYes può gestire il consenso e il blocco preventivo degli script di tracking in base alle preferenze dell'utente.",
      benefits: [
        "Blocco automatico script",
        "Gestione consenso",
        "Registro dei consensi",
      ],
      ctaLabel: "Gestisci Meta Pixel e consenso",
    };
  }

  // Case B — cookie policy missing.
  if (cookiePolicyMissing) {
    return {
      showRecommendation: true,
      priority,
      reasonCode: "cookie_policy_missing",
      title: "Cookie Policy da verificare",
      description:
        "Durante la scansione non abbiamo rilevato chiaramente una Cookie Policy. CookieYes include strumenti per identificare i cookie presenti sul sito e generare una Cookie Policy basata sulle tecnologie rilevate.",
      benefits: [
        "Scanner automatico dei cookie",
        "Categorizzazione dei cookie",
        "Generatore di Cookie Policy",
      ],
      ctaLabel: "Crea e gestisci la Cookie Policy",
    };
  }

  // Case C — privacy policy missing.
  if (privacyPolicyMissing) {
    return {
      showRecommendation: true,
      priority,
      reasonCode: "privacy_policy_missing",
      title: "Privacy Policy da verificare",
      description:
        "Durante la scansione non abbiamo rilevato chiaramente una Privacy Policy. CookieYes mette a disposizione anche un generatore di Privacy Policy configurabile (da rivedere in base alle attività di trattamento reali).",
      benefits: ["Privacy Policy generator"],
      ctaLabel: "Genera la Privacy Policy",
    };
  }

  // Case G — generic banner, CMP unknown.
  if (genericBannerOnly) {
    return {
      showRecommendation: true,
      priority,
      reasonCode: "generic_banner_uncertain",
      title: "Banner rilevato: verifica anche cosa succede prima del consenso",
      description:
        "La presenza visiva di un banner rappresenta solo una parte della configurazione. CookieYes può aiutarti a scansionare cookie e tracker e a gestire il blocco degli script in base alle preferenze dell'utente.",
      benefits: ["Scanner cookie e tracker", "Blocco script configurabile"],
      ctaLabel: "Verifica con CookieYes",
    };
  }

  return NONE;
}
