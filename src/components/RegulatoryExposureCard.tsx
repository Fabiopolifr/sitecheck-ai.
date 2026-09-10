import type { RegulatoryExposure } from "@/features/audit/regulatoryExposure";

const LEVEL_CLASS: Record<RegulatoryExposure["level"], string> = {
  conforme: "border-success/20 bg-success/5",
  attenzione: "border-warning/20 bg-warning/5",
  rischio_elevato: "border-orange-300 bg-orange-50",
  critica: "border-danger/30 bg-danger/5",
};

export function RegulatoryExposureCard(props: RegulatoryExposure) {
  const { level, badge, headline, articles, maxFineText, disclaimer } = props;

  return (
    <div className={`rounded-2xl border px-6 py-5 ${LEVEL_CLASS[level]}`}>
      <span className="text-sm font-semibold">{badge}</span>
      <p className="mt-2 text-sm text-zinc-800">{headline}</p>

      {articles.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Norme potenzialmente coinvolte
          </p>
          <p className="mt-1 text-xs text-zinc-600">{articles.join(" · ")}</p>
        </div>
      )}

      {maxFineText && (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Massimo edittale previsto dal quadro normativo
          </p>
          <p className="mt-1 text-xs text-zinc-600">{maxFineText}</p>
        </div>
      )}

      <p className="mt-3 text-[11px] leading-4 text-zinc-400">{disclaimer}</p>
    </div>
  );
}
