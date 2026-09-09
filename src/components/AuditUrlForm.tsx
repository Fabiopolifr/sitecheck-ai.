"use client";

import { useState } from "react";

export function AuditUrlForm() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="mt-8 flex w-full max-w-xl flex-col gap-3">
      <form
        className="flex w-full flex-col gap-3 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitted(true);
        }}
      >
        <label htmlFor="site-url" className="sr-only">
          URL del sito
        </label>
        <input
          id="site-url"
          name="url"
          type="text"
          inputMode="url"
          autoComplete="off"
          placeholder="https://example.com"
          className="w-full rounded-full border border-zinc-300 px-5 py-3 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
        <button
          type="submit"
          className="shrink-0 rounded-full bg-accent px-6 py-3 text-base font-medium text-white transition-colors hover:bg-accent/90"
        >
          Analizza gratis
        </button>
      </form>
      {submitted && (
        <p role="status" className="text-sm text-zinc-500">
          Il motore di analisi arriva nella prossima fase di sviluppo.
        </p>
      )}
    </div>
  );
}
