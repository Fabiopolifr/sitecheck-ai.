import type { ContentType } from "./types";

export type EvergreenTemplate = {
  headline: string;
  body: string;
  cta: string | null;
};

/**
 * Static, hand-written content used before MINIMUM_SAMPLE_SIZE real
 * audits exist (AI/MASTER_SPEC.md §15) or as a fallback if insight
 * computation fails for any reason. None of this references real
 * statistics — only general, defensible claims about web hygiene.
 */
const EVERGREEN_LIBRARY: Record<ContentType, EvergreenTemplate[]> = {
  data_insight: [
    {
      headline: "Il sito della tua agenzia è tracciabile?",
      body: "Molti siti di agenzie immobiliari installano strumenti di tracciamento (Google Analytics, Meta Pixel) senza una gestione del consenso chiaramente visibile. Vale la pena una verifica rapida.",
      cta: "Controlla il tuo sito gratis",
    },
  ],
  educational: [
    {
      headline: "Cookie policy: cosa dovrebbe avere il tuo sito",
      body: "Un sito che usa cookie di terze parti dovrebbe avere una cookie policy raggiungibile e un banner di consenso funzionante. Sono due elementi tecnici distinti, spesso confusi tra loro.",
      cta: null,
    },
    {
      headline:
        "Perché il tempo di caricamento conta per un'agenzia immobiliare",
      body: "Un potenziale cliente che aspetta più di qualche secondo per vedere gli annunci abbandona la pagina. La performance del sito è anche una questione di conversioni, non solo di tecnica.",
      cta: null,
    },
  ],
  problem_pain: [
    {
      headline: "Il tuo sito sta raccogliendo lead o li sta perdendo?",
      body: "Un form di contatto senza campo email valido, senza indicazione chiara sul trattamento dati, o lento da caricare, scoraggia chi stava per scriverti.",
      cta: "Analizza il tuo sito",
    },
  ],
  quiz: [
    {
      headline: "Quiz: il tuo sito ha un H1 unico in ogni pagina?",
      body: "Sì, no, o non lo sai? Un heading H1 duplicato o assente confonde i motori di ricerca su qual è il contenuto principale della pagina.",
      cta: "Scoprilo in pochi secondi",
    },
  ],
  site_score_concept: [
    {
      headline: "Cos'è il Site Score di SiteCheck AI",
      body: "Un punteggio da 0 a 100 calcolato su sei aree: tecnico, SEO, privacy, cookie e consenso, tracking, performance. Non sostituisce una consulenza legale — è un punto di partenza tecnico.",
      cta: "Calcola il tuo Site Score",
    },
  ],
  conversion_cta: [
    {
      headline: "Quanto è sano il sito della tua agenzia?",
      body: "Analisi tecnica gratuita in pochi secondi: cookie, privacy, tracking, SEO e performance. Nessuna registrazione richiesta.",
      cta: "Analizza gratis",
    },
  ],
};

export function pickEvergreenTemplate(
  type: ContentType,
  seed = 0,
): EvergreenTemplate {
  const templates = EVERGREEN_LIBRARY[type];
  return templates[seed % templates.length];
}
