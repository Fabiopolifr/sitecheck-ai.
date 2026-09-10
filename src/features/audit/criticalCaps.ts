import type { CategoryResult, Check } from "./types";

/**
 * "Critical score caps" (AI/DECISIONS.md D34): a handful of findings are
 * severe enough that no amount of other passing checks should be able to
 * average them away. Each rule looks at the checks already computed for a
 * category and, if it fires, clamps that category's score to a ceiling —
 * applied *after* the normal weighted average in scoring.ts, never instead
 * of it.
 *
 * Scoped strictly to what this audit can actually detect from a single
 * fetched page (see runAudit.ts — there is no multi-page crawl). Caps the
 * owner's spec described that would require a crawl (redirect loops across
 * the site, sitewide duplicate titles, orphan pages) are not implemented
 * here — see D34 for the explicit list of what was left out and why.
 */
type CapRule = {
  category: CategoryResult["category"];
  reasonCode: string;
  label: string;
  cap: number;
  fires: (checks: Check[]) => boolean;
};

function checkById(checks: Check[], id: string): Check | undefined {
  return checks.find((c) => c.id === id);
}

const RULES: CapRule[] = [
  {
    category: "seo",
    reasonCode: "seo_page_noindex",
    label: "La pagina analizzata è esclusa dall'indicizzazione (noindex)",
    cap: 10,
    fires: (checks) => checkById(checks, "indexability")?.status === "fail",
  },
  {
    category: "technical",
    reasonCode: "technical_page_noindex",
    label: "Meta robots noindex rilevato sulla pagina analizzata",
    cap: 35,
    fires: (checks) => checkById(checks, "robots_meta")?.status === "warning",
  },
  {
    category: "technical",
    reasonCode: "technical_server_error",
    label: "Il server ha risposto con un errore durante la scansione",
    cap: 20,
    fires: (checks) => {
      const status = checkById(checks, "status_code");
      return (
        status?.status === "warning" &&
        typeof status.value === "number" &&
        status.value >= 500
      );
    },
  },
  {
    category: "technical",
    reasonCode: "technical_no_https",
    label: "Il sito non serve la pagina analizzata in HTTPS",
    cap: 30,
    fires: (checks) => checkById(checks, "https")?.status === "warning",
  },
  {
    category: "cookie_consent",
    reasonCode: "cookie_cmp_absent_trackers_active",
    label: "Nessuna piattaforma di consenso rilevata con tracker attivi",
    cap: 10,
    fires: (checks) =>
      checkById(checks, "cmp_detected")?.status === "fail" &&
      checkById(checks, "consent_before_tracking")?.status === "fail",
  },
  {
    category: "cookie_consent",
    reasonCode: "cookie_cmp_absent",
    label: "Nessuna piattaforma di consenso rilevata",
    cap: 30,
    fires: (checks) => checkById(checks, "cmp_detected")?.status === "fail",
  },
  {
    category: "privacy",
    reasonCode: "privacy_policy_absent",
    label: "Informativa privacy non rilevata",
    cap: 15,
    fires: (checks) =>
      checkById(checks, "privacy_policy_link")?.status === "fail",
  },
];

/**
 * Applies every matching cap rule to each category, keeping the lowest cap
 * when more than one rule fires for the same category (the most severe
 * finding wins, it never partially offsets with a milder one).
 */
export function applyCriticalCaps(
  categories: CategoryResult[],
): CategoryResult[] {
  return categories.map((result) => {
    if (result.score === null) return result;

    const matches = RULES.filter(
      (rule) => rule.category === result.category && rule.fires(result.checks),
    );
    if (matches.length === 0) return { ...result, capApplied: null };

    const tightest = matches.reduce((min, rule) =>
      rule.cap < min.cap ? rule : min,
    );
    if (result.score <= tightest.cap) {
      return { ...result, capApplied: null };
    }

    return {
      ...result,
      score: tightest.cap,
      capApplied: {
        reasonCode: tightest.reasonCode,
        label: tightest.label,
        cap: tightest.cap,
        cappedFrom: result.score,
      },
    };
  });
}
