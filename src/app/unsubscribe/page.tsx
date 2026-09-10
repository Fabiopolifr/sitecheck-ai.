"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

function UnsubscribeForm() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const token = searchParams.get("token") ?? "";
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle",
  );

  async function handleUnsubscribe() {
    setStatus("loading");
    try {
      const response = await fetch("/api/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token }),
      });
      setStatus(response.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  }

  if (!email || !token) {
    return (
      <p className="text-sm text-zinc-600">Link di disiscrizione non valido.</p>
    );
  }

  if (status === "done") {
    return (
      <p className="text-sm text-zinc-700">
        Fatto — <strong>{email}</strong> non riceverà più comunicazioni di
        questo tipo.
      </p>
    );
  }

  return (
    <div>
      <p className="text-sm text-zinc-600">
        Vuoi disiscrivere <strong>{email}</strong> dalle comunicazioni di
        outreach di FreeCookieBe?
      </p>
      <button
        onClick={handleUnsubscribe}
        disabled={status === "loading"}
        className="mt-4 rounded-full bg-zinc-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-60"
      >
        {status === "loading" ? "Attendere…" : "Disiscrivimi"}
      </button>
      {status === "error" && (
        <p className="mt-2 text-xs text-red-600">
          Operazione non riuscita. Riprova o scrivi a info@freesbe.it.
        </p>
      )}
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <main className="flex flex-1 flex-col items-center px-6 py-24 text-center">
      <div className="mx-auto w-full max-w-sm text-left">
        <h1 className="text-xl font-semibold text-zinc-900">Disiscrizione</h1>
        <div className="mt-4">
          <Suspense fallback={null}>
            <UnsubscribeForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
