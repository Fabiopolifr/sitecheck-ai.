import type { FreesbeRecommendation } from "@/features/affiliate/freesbeRecommendation";

export function FreesbeRecommendationCard({
  show,
  title,
  description,
  ctaLabel,
  ctaHref,
}: FreesbeRecommendation) {
  if (!show) return null;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-6">
      <h3 className="text-base font-semibold text-zinc-900">{title}</h3>
      <p className="mt-2 text-sm text-zinc-600">{description}</p>
      <a
        href={ctaHref}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex rounded-full bg-zinc-900 px-6 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-800"
      >
        {ctaLabel}
      </a>
    </div>
  );
}
