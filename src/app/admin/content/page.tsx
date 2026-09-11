import { listContentPosts } from "@/lib/db/contentRepository";
import { AdminNav } from "@/components/AdminNav";
import type { ContentType } from "@/features/content/types";

export const dynamic = "force-dynamic";

const TYPE_LABELS: Record<ContentType, string> = {
  data_insight: "Data Insight",
  educational: "Educational",
  problem_pain: "Problem / Pain",
  quiz: "Quiz",
  site_score_concept: "Site Score",
  conversion_cta: "Conversione",
};

const STATUS_LABELS: Record<string, string> = {
  queued: "In coda",
  approved: "Approvato",
  published: "Pubblicato",
  rejected: "Rifiutato",
};

export default async function AdminContentPage() {
  const posts = await listContentPosts();

  return (
    <main className="flex flex-1 flex-col px-6 py-12">
      <div className="mx-auto w-full max-w-3xl">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-zinc-900">
            Coda contenuti
          </h1>
          <AdminNav />
        </div>
        <p className="mt-2 text-sm text-zinc-500">
          Generati da{" "}
          <code className="text-xs">POST /api/content/generate</code>. La
          pubblicazione avviene tramite il flusso Claude + Metricool esistente,
          non automaticamente da questa pagina.
        </p>

        <div className="mt-8 flex flex-col gap-4">
          {posts.length === 0 && (
            <p className="text-sm text-zinc-400">Nessun contenuto ancora.</p>
          )}
          {posts.map((post) => (
            <div
              key={post.id}
              className="rounded-2xl border border-zinc-200 px-6 py-5"
            >
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span>{TYPE_LABELS[post.type]}</span>
                <span>{STATUS_LABELS[post.status] ?? post.status}</span>
              </div>
              <h2 className="mt-2 text-base font-semibold text-zinc-900">
                {post.headline}
              </h2>
              <p className="mt-1 text-sm text-zinc-600">{post.body}</p>
              {post.cta && (
                <p className="mt-2 text-sm font-medium text-accent">
                  {post.cta}
                </p>
              )}
              <p className="mt-3 text-xs text-zinc-400">
                {post.sourceType === "insight"
                  ? "Basato su dati reali"
                  : "Contenuto evergreen"}{" "}
                · {new Date(post.createdAt).toLocaleString("it-IT")}
              </p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
