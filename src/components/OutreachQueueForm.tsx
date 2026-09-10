"use client";

import { useState } from "react";

export function OutreachQueueForm() {
  const [urls, setUrls] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle",
  );
  const [result, setResult] = useState<{
    queued: number;
    invalid: number;
  } | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const list = urls
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (list.length === 0) return;

    setStatus("loading");
    try {
      const response = await fetch("/api/admin/outreach/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: list }),
      });
      if (response.ok) {
        setResult(await response.json());
        setStatus("done");
        setUrls("");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-zinc-200 p-5"
    >
      <h3 className="text-sm font-semibold text-zinc-900">
        Aggiungi siti alla coda manuale
      </h3>
      <p className="mt-1 text-xs text-zinc-500">
        Un URL per riga. Verranno analizzati fino a 30 al giorno, in ordine di
        inserimento.
      </p>
      <textarea
        value={urls}
        onChange={(event) => setUrls(event.target.value)}
        rows={5}
        placeholder={"https://esempio1.it\nhttps://esempio2.it"}
        className="mt-3 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className="mt-3 rounded-full bg-accent px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-60"
      >
        {status === "loading" ? "Invio…" : "Aggiungi alla coda"}
      </button>
      {status === "done" && result && (
        <p className="mt-2 text-xs text-success">
          {result.queued} URL aggiunti alla coda
          {result.invalid > 0 ? `, ${result.invalid} non validi` : ""}.
        </p>
      )}
      {status === "error" && (
        <p className="mt-2 text-xs text-red-600">
          Invio non riuscito. Riprova.
        </p>
      )}
    </form>
  );
}
