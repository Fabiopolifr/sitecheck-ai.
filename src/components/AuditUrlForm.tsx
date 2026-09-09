"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSessionId, getUtmParams } from "@/lib/analytics/client";

export function AuditUrlForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!url.trim() || loading) return;

    setLoading(true);
    setError(null);

    try {
      const utm = getUtmParams();
      const response = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          sessionId: getSessionId(),
          utmSource: utm.utmSource,
          utmMedium: utm.utmMedium,
          utmCampaign: utm.utmCampaign,
        }),
      });

      const data = (await response.json()) as { id?: string; error?: string };

      if (!response.ok || !data.id) {
        setError(data.error ?? "Analisi non riuscita. Riprova.");
        setLoading(false);
        return;
      }

      router.push(`/audit/${data.id}`);
    } catch {
      setError("Analisi non riuscita. Riprova.");
      setLoading(false);
    }
  }

  return (
    <div className="mt-8 flex w-full max-w-xl flex-col gap-3">
      <form
        className="flex w-full flex-col gap-3 sm:flex-row"
        onSubmit={handleSubmit}
      >
        <input
          name="url"
          type="text"
          inputMode="url"
          autoComplete="off"
          aria-label="URL del sito"
          placeholder="https://example.com"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          disabled={loading}
          className="w-full rounded-full border border-zinc-300 bg-white px-5 py-3 text-base text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={loading}
          className="flex shrink-0 items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-base font-medium text-white shadow-sm shadow-accent/30 transition-colors hover:bg-accent/90 disabled:opacity-60"
        >
          {loading && (
            <svg
              className="h-4 w-4 animate-spin text-white"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-90"
                fill="currentColor"
                d="M4 12a8 8 0 0 1 8-8V0C5.4 0 0 5.4 0 12h4Z"
              />
            </svg>
          )}
          {loading ? "Analisi in corso…" : "Analizza gratis"}
        </button>
      </form>
      {error && (
        <p role="status" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
