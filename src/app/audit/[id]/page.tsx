import Link from "next/link";
import { notFound } from "next/navigation";
import { getAudit } from "@/lib/db/auditsRepository";
import { getSummary } from "@/lib/db/summariesRepository";
import { CategoryDetails } from "@/components/CategoryDetails";
import { EmailCaptureForm } from "@/components/EmailCaptureForm";
import { GatedContent } from "@/components/GatedContent";
import { AffiliateRecommendation } from "@/components/AffiliateRecommendation";
import { FreesbeRecommendationCard } from "@/components/FreesbeRecommendation";
import { TrackPageView } from "@/components/TrackPageView";
import { ScoreGauge } from "@/components/ScoreGauge";
import { BAND_LABELS, BAND_COLORS } from "@/features/audit/labels";
import { isGatedVariant } from "@/features/audit/abTest";
import { resolvePriorities } from "@/features/audit/priorities";
import { resolveComboDiagnosis } from "@/features/audit/comboDiagnosis";
import { resolveRegulatoryExposure } from "@/features/audit/regulatoryExposure";
import { RegulatoryExposureCard } from "@/components/RegulatoryExposureCard";
import { getCookieYesRecommendation } from "@/features/affiliate/cookieyesRecommendation";
import { getFreesbeRecommendation } from "@/features/affiliate/freesbeRecommendation";
import { getPartnerConfig } from "@/features/affiliate/partners";

const SEVERITY_DOT: Record<"high" | "medium" | "low", string> = {
  high: "bg-danger",
  medium: "bg-warning",
  low: "bg-zinc-300",
};

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
  const priorities = resolvePriorities(allChecks, summary);
  const bandColors = audit.band ? BAND_COLORS[audit.band] : null;
  const gated = isGatedVariant();
  const recommendation = getCookieYesRecommendation(audit.categories);
  const freesbe = getFreesbeRecommendation(audit.categories);

  // Il CTA affiliato viene deciso dai rilievi dell'audit, non dalla
  // configurazione: senza questo controllo verrebbe mostrato anche
  // quando COOKIEYES_AFFILIATE_URL non è impostata, e il click
  // finirebbe sul 404 di /go/cookieyes. Un pulsante che porta a un
  // errore è peggio di nessun pulsante (AI/DECISIONS.md D55).
  const affiliateConfigured = Boolean(
    getPartnerConfig("cookieyes")?.destination,
  );
  const comboDiagnosis = resolveComboDiagnosis(audit.categories);
  const regulatoryExposure = resolveRegulatoryExposure(audit.categories);

  return (
    <main className="flex flex-1 flex-col px-6 py-16">
      <TrackPageView
        eventName="results_viewed"
        auditId={audit.id}
        metadata={{ abVariant: gated ? "gated" : "open" }}
      />
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
            {comboDiagnosis && (
              <span className="mt-2 ml-2 inline-flex rounded-full bg-danger/10 px-4 py-1.5 text-sm font-semibold text-danger">
                {comboDiagnosis.badge}
              </span>
            )}
          </div>
        </div>

        {comboDiagnosis && (
          <div className="mt-6 rounded-2xl border border-danger/20 bg-danger/5 px-6 py-5">
            <h2 className="text-base font-semibold text-danger">
              {comboDiagnosis.headline}
            </h2>
            <p className="mt-2 text-sm text-zinc-700">{comboDiagnosis.body}</p>
          </div>
        )}

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

        {regulatoryExposure && (
          <div className="mt-6">
            <RegulatoryExposureCard {...regulatoryExposure} />
          </div>
        )}

        {!gated && (
          <div className="mt-10">
            <EmailCaptureForm
              auditId={audit.id}
              source="default"
              showSupportOption
              cookieConsentScore={recommendation.cookieConsentScore}
              trackerCount={recommendation.trackerCount}
              cmpVendor={recommendation.cmpVendor}
            />
          </div>
        )}

        {recommendation.showRecommendation && affiliateConfigured && (
          <div className="mt-6">
            <AffiliateRecommendation
              auditId={audit.id}
              partner="cookieyes"
              placement="results_top"
              {...recommendation}
            />
          </div>
        )}

        {freesbe.show && (
          <div className="mt-6">
            <FreesbeRecommendationCard {...freesbe} />
          </div>
        )}

        <div className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Dettaglio per categoria
          </h2>
          <div className="mt-4">
            <GatedContent
              auditId={audit.id}
              gated={gated}
              cookieConsentScore={recommendation.cookieConsentScore}
              trackerCount={recommendation.trackerCount}
              cmpVendor={recommendation.cmpVendor}
            >
              <div className="flex flex-col gap-4">
                {audit.categories
                  .filter((c) => c.category !== "forms")
                  .map((category) => (
                    <CategoryDetails
                      key={category.category}
                      category={category}
                    />
                  ))}
              </div>
            </GatedContent>
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
