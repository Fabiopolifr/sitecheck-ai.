import { CATEGORY_LABELS, STATUS_LABELS } from "@/features/audit/labels";
import type { CategoryResult } from "@/features/audit/types";

const STATUS_DOT_CLASS: Record<string, string> = {
  pass: "bg-emerald-500",
  warning: "bg-amber-500",
  fail: "bg-red-500",
  unknown: "bg-zinc-300",
};

function scoreSeverity(score: number): {
  bar: string;
  track: string;
  label: string | null;
} {
  if (score < 40) {
    return { bar: "bg-danger", track: "bg-danger/15", label: "Criticità" };
  }
  if (score < 70) {
    return { bar: "bg-warning", track: "bg-warning/15", label: null };
  }
  return { bar: "bg-accent", track: "bg-zinc-100", label: null };
}

/** Rough severity proxy from a check's weight — used only for the small
 * per-check chip, not for scoring itself. */
function checkSeverity(
  weight: number,
): { label: string; className: string } | null {
  if (weight >= 20) {
    return { label: "Alta", className: "bg-danger/10 text-danger" };
  }
  if (weight >= 10) {
    return { label: "Media", className: "bg-warning/10 text-warning" };
  }
  return null;
}

type CategoryDetailsProps = {
  category: CategoryResult;
};

export function CategoryDetails({ category }: CategoryDetailsProps) {
  const scorable = category.checks.filter((check) => check.weight > 0);
  const displayChecks = scorable.length > 0 ? scorable : category.checks;
  const severity =
    category.score !== null ? scoreSeverity(category.score) : null;

  return (
    <details className="group rounded-2xl border border-zinc-200 open:pb-2">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-zinc-900">
              {CATEGORY_LABELS[category.category]}
            </h3>
            {severity?.label && (
              <span className="rounded-full bg-danger/10 px-2 py-0.5 text-xs font-semibold text-danger">
                {severity.label}
              </span>
            )}
          </div>
          {category.score !== null && severity && (
            <div className="mt-2 flex items-center gap-2">
              <div
                className={`h-1.5 w-32 overflow-hidden rounded-full ${severity.track}`}
              >
                <div
                  className={`h-full rounded-full ${severity.bar}`}
                  style={{ width: `${Math.max(category.score, 4)}%` }}
                />
              </div>
              <p className="text-sm text-zinc-500">{category.score}/100</p>
            </div>
          )}
        </div>
        <span className="text-sm text-zinc-400 transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>
      {category.capApplied && (
        <div className="mx-6 mb-4 rounded-xl bg-danger/5 px-4 py-3 text-xs text-danger">
          Il punteggio di questa sezione è stato limitato a{" "}
          {category.capApplied.cap}/100 a causa di un problema critico:{" "}
          {category.capApplied.label}. Senza questo problema il punteggio
          sarebbe stato {category.capApplied.cappedFrom}/100 — un singolo
          controllo grave pesa più della media degli altri.
        </div>
      )}
      <ul className="flex flex-col gap-3 px-6 pb-5">
        {displayChecks.map((check) => {
          const isProblem =
            check.status === "fail" || check.status === "warning";
          const sev = isProblem ? checkSeverity(check.weight) : null;
          return (
            <li key={check.id} className="flex items-start gap-3 text-sm">
              <span
                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${STATUS_DOT_CLASS[check.status]}`}
                aria-hidden
              />
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-zinc-800">
                    {STATUS_LABELS[check.status]}
                    {check.evidence ? ` — ${check.evidence}` : ""}
                  </p>
                  {sev && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${sev.className}`}
                    >
                      Severità {sev.label}
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400">{check.id}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </details>
  );
}
