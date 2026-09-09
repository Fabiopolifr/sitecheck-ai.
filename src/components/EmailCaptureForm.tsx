"use client";

import { useState } from "react";
import { getSessionId } from "@/lib/analytics/client";

type EmailCaptureFormProps = {
  auditId: string;
};

export function EmailCaptureForm({ auditId }: EmailCaptureFormProps) {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle",
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim() || status === "loading") return;

    setStatus("loading");
    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auditId,
          email,
          consentMarketing: consent,
          sessionId: getSessionId(),
        }),
      });

      setStatus(response.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-6 py-6 text-sm text-zinc-700">
        Grazie! Ti abbiamo inviato il report via email.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-200 px-6 py-6">
      <h3 className="text-base font-semibold text-zinc-900">
        Ricevi il report completo via email
      </h3>
      <form
        onSubmit={handleSubmit}
        className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start"
      >
        <input
          type="email"
          required
          placeholder="nome@agenzia.it"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={status === "loading"}
          className="w-full rounded-full border border-zinc-300 px-5 py-3 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="shrink-0 rounded-full bg-accent px-6 py-3 text-base font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-60"
        >
          {status === "loading" ? "Invio…" : "Invia report"}
        </button>
      </form>
      <label className="mt-3 flex items-start gap-2 text-xs text-zinc-500">
        <input
          type="checkbox"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
          className="mt-0.5"
        />
        Acconsento a ricevere comunicazioni marketing da SiteCheck AI
        (facoltativo, separato dall&apos;invio del report).
      </label>
      {status === "error" && (
        <p className="mt-2 text-xs text-red-600">
          Invio non riuscito. Riprova.
        </p>
      )}
    </div>
  );
}
