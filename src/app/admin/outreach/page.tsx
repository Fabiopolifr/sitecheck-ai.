import Link from "next/link";
import { listOutreachSites } from "@/lib/db/outreachRepository";
import { StatTile } from "@/components/StatTile";
import { OutreachQueueForm } from "@/components/OutreachQueueForm";
import { AdminNav } from "@/components/AdminNav";
import type { OutreachStatus } from "@/features/outreach/types";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<OutreachStatus, string> = {
  queued: "In coda",
  analyzed: "Analizzato",
  ineligible: "Non idoneo",
  no_email_found: "Nessuna email trovata",
  emailed: "Email inviata",
  send_failed: "Invio fallito",
  suppressed: "Soppresso (opt-out)",
};

const STATUS_BADGE: Record<OutreachStatus, string> = {
  queued: "bg-zinc-100 text-zinc-600",
  analyzed: "bg-zinc-100 text-zinc-600",
  ineligible: "bg-zinc-100 text-zinc-500",
  no_email_found: "bg-warning/10 text-warning",
  emailed: "bg-success/10 text-success",
  send_failed: "bg-danger/10 text-danger",
  suppressed: "bg-zinc-100 text-zinc-500",
};

type EligibleFilter = "all" | "eligible" | "ineligible";

export default async function AdminOutreachPage({
  searchParams,
}: {
  searchParams: Promise<{ eligible?: string; status?: string }>;
}) {
  const { eligible: eligibleParam, status: statusParam } = await searchParams;
  const sites = await listOutreachSites();

  const eligibleFilter: EligibleFilter =
    eligibleParam === "eligible" || eligibleParam === "ineligible"
      ? eligibleParam
      : "all";

  const filtered = sites.filter((site) => {
    if (eligibleFilter === "eligible" && site.eligible !== true) return false;
    if (eligibleFilter === "ineligible" && site.eligible !== false)
      return false;
    if (statusParam && site.status !== statusParam) return false;
    return true;
  });

  const stats = {
    total: sites.length,
    eligible: sites.filter((s) => s.eligible === true).length,
    ineligible: sites.filter((s) => s.eligible === false).length,
    emailed: sites.filter((s) => s.status === "emailed").length,
    queued: sites.filter((s) => s.status === "queued").length,
  };

  function filterHref(next: Partial<{ eligible: string; status: string }>) {
    const params = new URLSearchParams();
    const eligibleValue = next.eligible ?? eligibleParam;
    const statusValue = next.status ?? statusParam;
    if (eligibleValue) params.set("eligible", eligibleValue);
    if (statusValue) params.set("status", statusValue);
    const query = params.toString();
    return `/admin/outreach${query ? `?${query}` : ""}`;
  }

  return (
    <main className="flex flex-1 flex-col px-6 py-12">
      <div className="mx-auto w-full max-w-4xl">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-zinc-900">
            Outreach automatico
          </h1>
          <AdminNav />
        </div>
        <p className="mt-2 text-sm text-zinc-500">
          Analisi giornaliera di siti (coda manuale + scoperta Google Maps),
          filtro per idoneità privacy/cookie, invio email automatico ai siti
          idonei.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
          <StatTile label="Totale analizzati" value={String(stats.total)} />
          <StatTile label="Idonei" value={String(stats.eligible)} />
          <StatTile label="Non idonei" value={String(stats.ineligible)} />
          <StatTile label="Email inviate" value={String(stats.emailed)} />
          <StatTile label="In coda" value={String(stats.queued)} />
        </div>

        <div className="mt-8">
          <OutreachQueueForm />
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Filtro:
          </span>
          <Link
            href={filterHref({ eligible: "" })}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              eligibleFilter === "all"
                ? "bg-zinc-900 text-white"
                : "bg-zinc-100 text-zinc-600"
            }`}
          >
            Tutti
          </Link>
          <Link
            href={filterHref({ eligible: "eligible" })}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              eligibleFilter === "eligible"
                ? "bg-zinc-900 text-white"
                : "bg-zinc-100 text-zinc-600"
            }`}
          >
            Idonei
          </Link>
          <Link
            href={filterHref({ eligible: "ineligible" })}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              eligibleFilter === "ineligible"
                ? "bg-zinc-900 text-white"
                : "bg-zinc-100 text-zinc-600"
            }`}
          >
            Non idonei
          </Link>
        </div>

        <div className="mt-4 overflow-x-auto rounded-2xl border border-zinc-200">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/60 text-xs uppercase tracking-wide text-zinc-500">
                <th className="px-4 py-3">Sito</th>
                <th className="px-4 py-3">Fonte</th>
                <th className="px-4 py-3">Motivo</th>
                <th className="px-4 py-3">Email contatto</th>
                <th className="px-4 py-3">Stato</th>
                <th className="px-4 py-3">Data</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 100).map((site) => (
                <tr
                  key={site.id}
                  className="border-b border-zinc-100 last:border-0"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-zinc-900">
                      {site.businessName ?? site.domain}
                    </p>
                    <p className="text-xs text-zinc-400">{site.website}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500">
                    {site.source === "manual" ? "Manuale" : "Google Maps"}
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-600">
                    {site.eligibilityReason ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-600">
                    {site.contactEmail ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE[site.status]}`}
                    >
                      {STATUS_LABELS[site.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-400">
                    {new Date(site.createdAt).toLocaleDateString("it-IT")}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-6 text-center text-sm text-zinc-400"
                  >
                    Nessun sito trovato con questo filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
