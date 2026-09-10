"use client";

import { useRef, useState } from "react";

type QueueResult = { queued: number; invalid: number };

export function OutreachQueueForm() {
  const [urls, setUrls] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle",
  );
  const [result, setResult] = useState<QueueResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function submitUrls(list: string[]) {
    setStatus("loading");
    setErrorMessage(null);
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

  async function submitFile(file: File) {
    setStatus("loading");
    setErrorMessage(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/admin/outreach/queue", {
        method: "POST",
        body: formData,
      });
      if (response.ok) {
        setResult(await response.json());
        setStatus("done");
      } else {
        const body = await response.json().catch(() => null);
        setErrorMessage(body?.error ?? null);
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const list = urls
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (list.length === 0) return;
    await submitUrls(list);
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) submitFile(file);
    event.target.value = "";
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file) submitFile(file);
  }

  return (
    <div className="rounded-2xl border border-zinc-200 p-5">
      <h3 className="text-sm font-semibold text-zinc-900">
        Aggiungi siti alla coda manuale
      </h3>
      <p className="mt-1 text-xs text-zinc-500">
        Verranno analizzati fino a 30 al giorno, in ordine di inserimento.
      </p>

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`mt-3 cursor-pointer rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors ${
          dragOver
            ? "border-accent bg-accent-soft"
            : "border-zinc-300 hover:border-accent/50"
        }`}
      >
        <p className="text-sm font-medium text-zinc-700">
          Trascina qui un file .csv, oppure clicca per selezionarlo
        </p>
        <p className="mt-1 text-xs text-zinc-400">
          Ogni cella che sembra un sito web viene aggiunta alla coda — le altre
          colonne (nome, città, telefono...) vengono ignorate. Se hai un Excel,
          salvalo prima come CSV (&quot;Salva con nome&quot; → CSV).
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.tsv,.txt"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      <form onSubmit={handleSubmit} className="mt-4">
        <p className="text-xs font-medium text-zinc-500">
          Oppure incolla gli URL a mano, uno per riga:
        </p>
        <textarea
          value={urls}
          onChange={(event) => setUrls(event.target.value)}
          rows={4}
          placeholder={"https://esempio1.it\nhttps://esempio2.it"}
          className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="mt-3 rounded-full bg-accent px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-60"
        >
          {status === "loading" ? "Invio…" : "Aggiungi alla coda"}
        </button>
      </form>

      {status === "done" && result && (
        <p className="mt-2 text-xs text-success">
          {result.queued} URL aggiunti alla coda
          {result.invalid > 0 ? `, ${result.invalid} non validi` : ""}.
        </p>
      )}
      {status === "error" && (
        <p className="mt-2 text-xs text-red-600">
          {errorMessage ?? "Invio non riuscito. Riprova."}
        </p>
      )}
    </div>
  );
}
