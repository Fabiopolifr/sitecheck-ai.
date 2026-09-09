import Link from "next/link";
import { notFound } from "next/navigation";
import { getAudit } from "@/lib/db/auditsRepository";
import { getSummary } from "@/lib/db/summariesRepository";
import { CategoryDetails } from "@/components/CategoryDetails";
import { EmailCaptureForm } from "@/components/EmailCaptureForm";
import { AffiliateCta } from "@/components/AffiliateCta";
import { TrackPageView } from "@/components/TrackPageView";
import { ScoreGauge } from "@/components/ScoreGauge";
import { BAND_LABELS, BAND_COLORS } from "@/features/audit/labels";
import type { AuditResult, Check } from "@/features/audit/types";

const SEVERITY_DOT: Record<"high" | "medium" | "low", string> = {
  high: "bg-danger",
  medium: "bg-warning",
  low: "bg-zinc-300",
};

function cookieConsentNeedsAttention(audit: AuditResult): boolean {
  const cookieConsent = audit.categories.find(
    (c) => c.category === "cookie_consent",
  );
  return (
    cookieConsent?.checks.some(
      (check) => check.status === "fail" || check.status === "warning",
    ) ?? false
  );
}

function topPriorities(checks: Check[], limit: number): Check[] {
  return checks
    .filter((c) => c.status === "fail" || c.status === "warning")
    .sort((a, b) => {
      const severity = (c: Check) => (c.status === "fail" ? 1 : 0);
      if (severity(b) !== severity(a)) return severity(b) - severity(a);
      return b.weight * b.confidence - a.weight * a.confidence;
    })
    .slice(0, limit);
}

export default async function AuditResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const audit = await getAudit(id);

  if (!audit) {
    notFound();
  }

  if (audit.status === "failed") {
    return (
      <main className="flex flex-1 flex-col items-center px-6 py-24 text-center">
        <h1 className="text-2xl font-semibold text-zinc-900">
          Non siamo riusciti ad analizzare questo sito
        </h1>
        <p className="mt-4 max-w-md text-zinc-600">
          {audit.requestedUrl} — verifica consigliata: controlla che
          l&apos;indirizzo sia corretto e raggiungibile pubblicamente, poi
          riprova.
        </p>
        <Link
          href="/"
          className="mt-8 rounded-full bg-accent px-6 py-3 text-base font-medium text-white transition-colors hover:bg-accent/90"
        >
          Torna alla home
        </Link>
      </main>
    );
  }

  const summary = await getSummary(audit.id);
  const allChecks = audit.categories.flatMap((c) => c.checks);
  const fallbackPriorities = topPriorities(allChecks, 3).map((check) => ({
    title: check.id,
    reason: check.evidence ?? "elemento da verificare",
    severity: (check.status === "fail" ? "high" : "medium") as
      | "high"
      | "medium",
  }));
  const priorities = summary?.top_priorities.length
    ? summary.top_priorities
    : fallbackPriorities;
  const bandColors = audit.band ? BAND_COLORS[audit.band] : null;

  return (
    <main className="flex flex-1 flex-col px-6 py-16">
      <TrackPageView eventName="results_viewed" auditId={audit.id} />
      <div className="mx-auto w-full max-w-3xl">
        <div className="flex flex-col items-start gap-6 rounded-2xl border border-zinc-200 bg-zinc-50/50 p-6 sm:flex-row sm:items-center">
          <ScoreGauge score={audit.siteScore} band={audit.band} />
          <div>
            <p className="text-sm font-medium text-zinc-700">
              {audit.finalUrl}
            </p>
            <p className="text-xs text-zinc-400">
              Analizzato il{" "}
              {new Date(audit.completedAt).toLocaleString("it-IT")}
            </p>
            {audit.band && (
              <span
                className={`mt-3 inline-flex rounded-full px-4 py-1.5 text-sm font-medium ${bandColors?.bg} ${bandColors?.text}`}
              >
                {BAND_LABELS[audit.band]}
              </span>
            )}
          </div>
        </div>

        {summary && (
          <p className="mt-6 max-w-2xl text-base leading-7 text-zinc-700">
            {summary.summary}
          </p>
        )}

        {priorities.length > 0 && (
          <div className="mt-10">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Priorità principali
            </h2>
            <ul className="mt-4 flex flex-col gap-3">
              {priorities.map((priority) => (
                <li
                  key={priority.title}
                  className="flex items-start gap-3 rounded-xl border border-zinc-200 px-5 py-4 text-sm text-zinc-800"
                >
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${SEVERITY_DOT[priority.severity ?? "medium"]}`}
                    aria-hidden
                  />
                  <div>
                    <p className="font-medium text-zinc-900">
                      {priority.title}
                    </p>
                    <p className="mt-1 text-zinc-600">{priority.reason}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-10">
          <EmailCaptureForm auditId={audit.id} />
        </div>

        {cookieConsentNeedsAttention(audit) && (
          <div className="mt-6">
            <AffiliateCta auditId={audit.id} partner="cookieyes" />
          </div>
        )}

        <div className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Dettaglio per categoria
          </h2>
          <div className="mt-4 flex flex-col gap-4">
            {audit.categories
              .filter((c) => c.category !== "forms")
              .map((category) => (
                <CategoryDetails key={category.category} category={category} />
              ))}
          </div>
        </div>

        <p className="mt-10 text-xs leading-5 text-zinc-400">
          Questa è un&apos;analisi tecnica automatizzata. Gli elementi
          contrassegnati come &quot;da verificare&quot; o &quot;criticità
          rilevata&quot; richiedono un approfondimento manuale e non
          costituiscono una consulenza legale.
        </p>

        <div className="mt-10">
          <Link
            href="/"
            className="text-sm font-medium text-accent hover:underline"
          >
            ← Analizza un altro sito
          </Link>
        </div>
      </div>
    </main>
  );
}
