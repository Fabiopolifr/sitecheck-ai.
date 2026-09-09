"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
      const response = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
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
          className="w-full rounded-full border border-zinc-300 px-5 py-3 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={loading}
          className="shrink-0 rounded-full bg-accent px-6 py-3 text-base font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-60"
        >
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
