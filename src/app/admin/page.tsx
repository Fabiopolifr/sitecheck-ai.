import { listAudits } from "@/lib/db/auditsRepository";
import { listLeads } from "@/lib/db/leadsRepository";
import { listAffiliateClicks } from "@/lib/db/affiliateRepository";
import { computeAdminMetrics } from "@/features/admin/metrics";
import { StatTile } from "@/components/StatTile";
import { AdminLogoutButton } from "@/components/AdminLogoutButton";
import { BAND_LABELS } from "@/features/audit/labels";

// The dashboard reads live audit/lead/affiliate data on every request —
// it must never be statically prerendered at build time.
export const dynamic = "force-dynamic";

function formatPercent(value: number | null): string {
  if (value === null) return "—";
  return `${Math.round(value * 100)}%`;
}

export default async function AdminDashboardPage() {
  const [audits, leads, affiliateClicks] = await Promise.all([
    listAudits(),
    listLeads(),
    listAffiliateClicks(),
  ]);

  const metrics = computeAdminMetrics(audits, leads, affiliateClicks);

  return (
    <main className="flex flex-1 flex-col px-6 py-12">
      <div className="mx-auto w-full max-w-5xl">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-zinc-900">
            SiteCheck AI — Admin
          </h1>
          <AdminLogoutButton />
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatTile label="Audit totali" value={String(metrics.totalAudits)} />
          <StatTile label="Audit oggi" value={String(metrics.auditsToday)} />
          <StatTile
            label="Audit ultimi 7gg"
            value={String(metrics.auditsLast7Days)}
          />
          <StatTile
            label="Score medio"
            value={metrics.averageSiteScore?.toString() ?? "—"}
          />
          <StatTile label="Lead email" value={String(metrics.totalLeads)} />
          <StatTile
            label="Tasso cattura email"
            value={formatPercent(metrics.emailCaptureRate)}
          />
          <StatTile
            label="Click affiliati"
            value={String(metrics.affiliateClicks)}
          />
          <StatTile
            label="CTR affiliati"
            value={formatPercent(metrics.affiliateCtr)}
          />
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Problemi più rilevati
            </h2>
            <ul className="mt-3 flex flex-col gap-2">
              {metrics.topIssues.length === 0 && (
                <li className="text-sm text-zinc-400">Nessun dato ancora.</li>
              )}
              {metrics.topIssues.map((issue) => (
                <li
                  key={issue.checkId}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-2 text-sm"
                >
                  <span className="text-zinc-700">{issue.checkId}</span>
                  <span className="font-medium text-zinc-900">
                    {issue.count}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Tecnologie più rilevate
            </h2>
            <ul className="mt-3 flex flex-col gap-2">
              {metrics.topTechnologies.length === 0 && (
                <li className="text-sm text-zinc-400">Nessun dato ancora.</li>
              )}
              {metrics.topTechnologies.map((tech) => (
                <li
                  key={tech.trackerId}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-2 text-sm"
                >
                  <span className="text-zinc-700">{tech.trackerId}</span>
                  <span className="font-medium text-zinc-900">
                    {tech.count}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Audit recenti
          </h2>
          <div className="mt-3 overflow-x-auto rounded-2xl border border-zinc-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Sito</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Stato</th>
                  <th className="px-4 py-3">Data</th>
                </tr>
              </thead>
              <tbody>
                {metrics.recentAudits.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-6 text-center text-zinc-400"
                    >
                      Nessun audit ancora.
                    </td>
                  </tr>
                )}
                {metrics.recentAudits.map((audit) => (
                  <tr key={audit.id} className="border-t border-zinc-100">
                    <td className="px-4 py-3 text-zinc-800">
                      {audit.hostname}
                    </td>
                    <td className="px-4 py-3 text-zinc-800">
                      {audit.siteScore ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      {audit.status === "completed" && audit.band
                        ? BAND_LABELS[audit.band]
                        : audit.status === "failed"
                          ? "Fallito"
                          : "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-500">
                      {new Date(audit.completedAt).toLocaleString("it-IT")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
