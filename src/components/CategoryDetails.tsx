import { CATEGORY_LABELS, STATUS_LABELS } from "@/features/audit/labels";
import type { CategoryResult } from "@/features/audit/types";

const STATUS_DOT_CLASS: Record<string, string> = {
  pass: "bg-emerald-500",
  warning: "bg-amber-500",
  fail: "bg-red-500",
  unknown: "bg-zinc-300",
};

type CategoryDetailsProps = {
  category: CategoryResult;
};

export function CategoryDetails({ category }: CategoryDetailsProps) {
  const scorable = category.checks.filter((check) => check.weight > 0);
  const displayChecks = scorable.length > 0 ? scorable : category.checks;

  return (
    <details className="group rounded-2xl border border-zinc-200 open:pb-2">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5">
        <div>
          <h3 className="text-base font-semibold text-zinc-900">
            {CATEGORY_LABELS[category.category]}
          </h3>
          {category.score !== null && (
            <p className="mt-1 text-sm text-zinc-500">{category.score}/100</p>
          )}
        </div>
        <span className="text-sm text-zinc-400 transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>
      <ul className="flex flex-col gap-3 px-6 pb-5">
        {displayChecks.map((check) => (
          <li key={check.id} className="flex items-start gap-3 text-sm">
            <span
              className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${STATUS_DOT_CLASS[check.status]}`}
              aria-hidden
            />
            <div>
              <p className="text-zinc-800">
                {STATUS_LABELS[check.status]}
                {check.evidence ? ` — ${check.evidence}` : ""}
              </p>
              <p className="text-xs text-zinc-400">{check.id}</p>
            </div>
          </li>
        ))}
      </ul>
    </details>
  );
}
