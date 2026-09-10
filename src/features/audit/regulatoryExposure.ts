import type { CategoryResult } from "./types";

export type RegulatoryExposureLevel =
  "conforme" | "attenzione" | "rischio_elevato" | "critica";

export type RegulatoryExposure = {
  level: RegulatoryExposureLevel;
  badge: string;
  headline: string;
  articles: string[];
  maxFineText: string | null;
  disclaimer: string;
};

const GDPR_83_5_MAX_FINE =
  "Fino a €20.000.000 oppure fino al 4% del fatturato mondiale totale annuo dell'esercizio precedente, ove superiore (art. 83, par. 5 GDPR).";

const DETERMINATION_DISCLAIMER =
  "Questo è il massimo edittale previsto dal quadro normativo, non una previsione di sanzione: l'importo effettivo viene determinato dal Garante sulla base delle circostanze concrete del caso (gravità, durata, numero di interessati, misure correttive adottate, precedenti). Non è una consulenza legale.";

/**
 * Maps a critical-cap reasonCode (criticalCaps.ts, cookie_consent/privacy
 * only) to the specific GDPR/Codice Privacy articles it engages and a
 * one-line description of what was found — used only for the "critica"
 * level, where a single concrete finding drives the framing (never a sum
 * of multiple findings — see AI/DECISIONS.md D38 on why).
 */
const CRITICAL_FINDING_COPY: Record<
  string,
  { headline: string; articles: string[] }
> = {
  cookie_cmp_absent_trackers_active: {
    headline:
      "Cookie di marketing/tracciamento risultano attivi prima della scelta dell'utente, senza una piattaforma di consenso rilevata.",
    articles: ["Art. 122 D.Lgs. 196/2003", "Artt. 4(11), 5, 6, 7 GDPR"],
  },
  cookie_cmp_absent: {
    headline:
      "Nessuna piattaforma di gestione del consenso (CMP) rilevata sul sito.",
    articles: [
      "Art. 122 D.Lgs. 196/2003",
      "Linee guida cookie del Garante Privacy, 10 giugno 2021",
    ],
  },
  privacy_policy_absent: {
    headline: "Nessuna informativa privacy rilevata sul sito.",
    articles: ["Artt. 12-13 GDPR"],
  },
};

/**
 * "Regulatory exposure" framing for cookie_consent/privacy findings
 * (AI/DECISIONS.md D38): four levels, never a literal "you risk a €X
 * fine" for a single minor issue, never a sum across multiple findings —
 * only the single most severe finding drives the "critica" framing,
 * mirroring how criticalCaps.ts itself picks the tightest cap. Returns
 * null when the audit has neither category scored (nothing to say).
 */
export function resolveRegulatoryExposure(
  categories: CategoryResult[],
): RegulatoryExposure | null {
  const cookieConsent = categories.find((c) => c.category === "cookie_consent");
  const privacy = categories.find((c) => c.category === "privacy");

  const capped = [cookieConsent, privacy].filter(
    (
      c,
    ): c is CategoryResult & {
      capApplied: NonNullable<CategoryResult["capApplied"]>;
    } => Boolean(c?.capApplied),
  );

  if (capped.length > 0) {
    const worst = capped.reduce((a, b) =>
      a.capApplied.cap <= b.capApplied.cap ? a : b,
    );
    const copy = CRITICAL_FINDING_COPY[worst.capApplied.reasonCode] ?? null;

    return {
      level: "critica",
      badge: "🔴 Criticità normativa",
      headline: copy?.headline ?? worst.capApplied.label,
      articles: copy?.articles ?? ["GDPR", "D.Lgs. 196/2003"],
      maxFineText: GDPR_83_5_MAX_FINE,
      disclaimer: DETERMINATION_DISCLAIMER,
    };
  }

  const scores = [cookieConsent?.score, privacy?.score].filter(
    (s): s is number => s !== null && s !== undefined,
  );
  if (scores.length === 0) return null;

  const minScore = Math.min(...scores);

  if (minScore < 50) {
    return {
      level: "rischio_elevato",
      badge: "🟠 Rischio elevato",
      headline:
        "L'analisi ha rilevato carenze concrete nella gestione di cookie e/o privacy che possono configurare una violazione degli obblighi GDPR.",
      articles: ["Artt. 5, 12, 13 GDPR", "Art. 122 D.Lgs. 196/2003"],
      maxFineText: GDPR_83_5_MAX_FINE,
      disclaimer: DETERMINATION_DISCLAIMER,
    };
  }

  if (minScore < 75) {
    return {
      level: "attenzione",
      badge: "🟡 Attenzione",
      headline:
        "Alcune carenze informative o configurazioni da verificare sono state rilevate su cookie e/o privacy.",
      articles: [],
      maxFineText: null,
      disclaimer:
        "Un approfondimento manuale è consigliato per confermare la conformità.",
    };
  }

  return {
    level: "conforme",
    badge: "🟢 Conforme / rischio basso",
    headline:
      "Nessun elemento rilevante emerso dall'analisi automatica su cookie e privacy.",
    articles: [],
    maxFineText: null,
    disclaimer:
      "L'analisi è tecnica e automatizzata: non sostituisce una verifica legale completa.",
  };
}
