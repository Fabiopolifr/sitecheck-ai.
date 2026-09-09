import { BAND_COLORS } from "@/features/audit/labels";
import type { ScoreBand } from "@/features/audit/types";

type ScoreGaugeProps = {
  score: number | null;
  band: ScoreBand | null;
};

const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function ScoreGauge({ score, band }: ScoreGaugeProps) {
  const value = score ?? 0;
  const offset = CIRCUMFERENCE * (1 - value / 100);
  const colors = band ? BAND_COLORS[band] : null;

  return (
    <div className="relative flex h-36 w-36 shrink-0 items-center justify-center">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle
          cx="60"
          cy="60"
          r={RADIUS}
          fill="none"
          strokeWidth="10"
          className="stroke-zinc-100"
        />
        {score !== null && (
          <circle
            cx="60"
            cy="60"
            r={RADIUS}
            fill="none"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            className={colors?.ring ?? "stroke-accent"}
          />
        )}
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-4xl font-semibold tracking-tight text-zinc-900">
          {score ?? "—"}
        </span>
        <span className="text-xs text-zinc-500">/ 100</span>
      </div>
    </div>
  );
}
