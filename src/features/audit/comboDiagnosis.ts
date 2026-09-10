import { CATEGORY_LABELS } from "./labels";
import { CATEGORY_WEIGHTS } from "./scoring";
import type { CategoryResult } from "./types";

export type ComboDiagnosis = {
  headline: string;
  body: string;
  badge: string;
};

const STRONG_THRESHOLD = 75;
const CRITICAL_THRESHOLD = 25;

/**
 * A site can average out to "Buono" while one section is quietly broken
 * (Tecnico 100 / SEO 100 / Privacy 100 / Cookie & Consent 0 is the case
 * that prompted this — see AI/DECISIONS.md D34). An overall score alone
 * hides that concentration. This looks for exactly one scored, weighted
 * category sitting in the critical band while every other one is strong,
 * and returns a headline that names the concentration instead of just the
 * average — used to override the plain band pill on the results page.
 */
export function resolveComboDiagnosis(
  categories: CategoryResult[],
): ComboDiagnosis | null {
  const scored = categories.filter(
    (c) => c.score !== null && CATEGORY_WEIGHTS[c.category] > 0,
  ) as (CategoryResult & { score: number })[];

  if (scored.length < 3) return null;

  const critical = scored.filter((c) => c.score < CRITICAL_THRESHOLD);
  const others = scored.filter((c) => c.score >= CRITICAL_THRESHOLD);

  if (critical.length !== 1) return null;
  if (!others.every((c) => c.score >= STRONG_THRESHOLD)) return null;

  const [weak] = critical;
  const label = CATEGORY_LABELS[weak.category];

  return {
    headline: `Criticità concentrata in ${label}`,
    body: `Il sito presenta ottimi risultati nelle altre aree analizzate. L'area critica riguarda esclusivamente ${label}: una singola area critica può comportare un rischio superiore rispetto alla media generale del sito, perché riguarda direttamente quell'aspetto specifico — non un problema diffuso.`,
    badge: "1 CRITICITÀ BLOCCANTE",
  };
}
