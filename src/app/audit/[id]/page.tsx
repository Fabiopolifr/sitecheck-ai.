import Link from "next/link";
import { notFound } from "next/navigation";
import { getAudit } from "@/lib/db/auditsRepository";
import { getSummary } from "@/lib/db/summariesRepository";
import { CategoryDetails } from "@/components/CategoryDetails";
import { EmailCaptureForm } from "@/components/EmailCaptureForm";
import { AffiliateCta } from "@/components/AffiliateCta";
import { TrackPageView } from "@/components/TrackPageView";
import { BAND_LABELS } from "@/features/audit/labels";
import type { AuditResult, Check } from "@/features/audit/types";

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
  }));
  const priorities = summary?.top_priorities.length
    ? summary.top_priorities
    : fallbackPriorities;

  return (
    <main className="flex flex-1 flex-col px-6 py-16">
      <TrackPageView eventName="results_viewed" auditId={audit.id} />
      <div className="mx-auto w-full max-w-3xl">
        <p className="text-sm text-zinc-500">{audit.finalUrl}</p>
        <p className="text-xs text-zinc-400">
          {new Date(audit.completedAt).toLocaleString("it-IT")}
        </p>

        <div className="mt-6 flex items-end gap-4">
          <span className="text-6xl font-semibold tracking-tight text-zinc-900">
            {audit.siteScore ?? "—"}
          </span>
          <span className="pb-2 text-lg text-zinc-500">/ 100</span>
          {audit.band && (
            <span className="mb-2 ml-auto rounded-full bg-accent/10 px-4 py-1.5 text-sm font-medium text-accent">
              {BAND_LABELS[audit.band]}
            </span>
          )}
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
                  className="rounded-xl border border-zinc-200 px-5 py-4 text-sm text-zinc-800"
                >
                  <p className="font-medium text-zinc-900">{priority.title}</p>
                  <p className="mt-1 text-zinc-600">{priority.reason}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-10 flex flex-col gap-4">
          {audit.categories
            .filter((c) => c.category !== "forms")
            .map((category) => (
              <CategoryDetails key={category.category} category={category} />
            ))}
        </div>

        {cookieConsentNeedsAttention(audit) && (
          <div className="mt-10">
            <AffiliateCta auditId={audit.id} partner="cookieyes" />
          </div>
        )}

        <div className="mt-10">
          <EmailCaptureForm auditId={audit.id} />
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
