import type { CategoryResult } from "@/features/audit/types";

export type FreesbeArea = "technical" | "seo" | "combined";

export type FreesbeRecommendation = {
  show: boolean;
  area: FreesbeArea | null;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
};

const CTA_HREF = "https://freesbe.it/contatti";

const NONE: FreesbeRecommendation = {
  show: false,
  area: null,
  title: "",
  description: "",
  ctaLabel: "",
  ctaHref: CTA_HREF,
};

/**
 * Whether a category has a HIGH/CRITICAL-grade finding — approximated here
 * as a critical score cap having fired (criticalCaps.ts), since that is
 * the only place this codebase already flags "this single finding is
 * severe" rather than just contributing to an average.
 */
function hasSevereFinding(category: CategoryResult | undefined): boolean {
  return Boolean(category?.capApplied);
}

function scoreOf(category: CategoryResult | undefined): number | null {
  return category?.score ?? null;
}

/**
 * "FREESBE CONSULTING CTA RULES" as specified by the owner: Technical and
 * SEO each get their own tiered CTA by score band, a severe finding forces
 * the CTA regardless of score, and a combined CTA replaces both individual
 * ones when both sections score under 75. Deliberately scoped to exactly
 * the two categories the owner's rule table names — see AI/DECISIONS.md
 * D34 for why Performance/Tracking aren't included here (Freesbe's own
 * consulting scope is SEO/technical; those two already have their own
 * commercial path via the CookieYes engine's remediation framing).
 */
export function getFreesbeRecommendation(
  categories: CategoryResult[],
): FreesbeRecommendation {
  const technical = categories.find((c) => c.category === "technical");
  const seo = categories.find((c) => c.category === "seo");
  const techScore = scoreOf(technical);
  const seoScore = scoreOf(seo);

  const techForced = hasSevereFinding(technical);
  const seoForced = hasSevereFinding(seo);

  const techShow = techScore !== null && (techScore < 90 || techForced);
  const seoShow = seoScore !== null && (seoScore < 90 || seoForced);

  const combined =
    techScore !== null && seoScore !== null && techScore < 75 && seoScore < 75;

  if (combined) {
    return {
      show: true,
      area: "combined",
      title: "Il sito ha bisogno di un intervento SEO e tecnico",
      description:
        "L'audit ha rilevato criticità sia nella struttura tecnica sia nell'ottimizzazione per i motori di ricerca. Freesbe può partire direttamente dai risultati di questo report e definire gli interventi prioritari.",
      ctaLabel: "Parla con un consulente Freesbe →",
      ctaHref: CTA_HREF,
    };
  }

  if (techShow && techScore !== null) {
    return {
      show: true,
      area: "technical",
      ...technicalCopy(techScore, techForced),
    };
  }

  if (seoShow && seoScore !== null) {
    return {
      show: true,
      area: "seo",
      ...seoCopy(seoScore, seoForced),
    };
  }

  return NONE;
}

function technicalCopy(score: number, forced: boolean) {
  if (score < 50 || forced) {
    return {
      title: "Intervento consigliato con priorità alta",
      description:
        "Le criticità rilevate possono incidere direttamente su visibilità organica, indicizzazione e acquisizione di traffico. Freesbe può occuparsi dell'analisi approfondita e della correzione tecnica.",
      ctaLabel: "Richiedi un'analisi con Freesbe →",
      ctaHref: CTA_HREF,
    };
  }
  if (score < 75) {
    return {
      title: "Problemi tecnici rilevati sul sito",
      description:
        "Alcune configurazioni tecniche possono limitare indicizzazione, velocità di scansione e corretta lettura del sito da parte dei motori di ricerca. Freesbe può analizzare e correggere queste criticità per te.",
      ctaLabel: "Parla con Freesbe →",
      ctaHref: CTA_HREF,
    };
  }
  return {
    title: "Qualche margine tecnico da rifinire",
    description:
      "La struttura tecnica è nel complesso solida; restano alcuni dettagli che Freesbe può rifinire se preferisci non occupartene direttamente.",
    ctaLabel: "Parla con Freesbe →",
    ctaHref: CTA_HREF,
  };
}

function seoCopy(score: number, forced: boolean) {
  if (score < 50 || forced) {
    return {
      title: "Intervento SEO consigliato con priorità alta",
      description:
        "Le criticità rilevate possono incidere direttamente su visibilità organica, indicizzazione e acquisizione di traffico. Freesbe può occuparsi dell'analisi approfondita e della correzione SEO.",
      ctaLabel: "Richiedi un'analisi con Freesbe →",
      ctaHref: CTA_HREF,
    };
  }
  if (score < 75) {
    return {
      title: "Il sito ha margini di crescita SEO",
      description:
        "Abbiamo rilevato elementi che possono ridurre la capacità delle tue pagine di posizionarsi sulle ricerche più rilevanti per il tuo business. Freesbe può trasformare i risultati dell'audit in un piano SEO operativo.",
      ctaLabel: "Richiedi una consulenza SEO →",
      ctaHref: CTA_HREF,
    };
  }
  return {
    title: "SEO solida, con qualche opportunità in più",
    description:
      "L'ottimizzazione è già a un buon livello; Freesbe può individuare le opportunità rimaste per spingere ulteriormente il posizionamento.",
    ctaLabel: "Richiedi una consulenza SEO →",
    ctaHref: CTA_HREF,
  };
}
