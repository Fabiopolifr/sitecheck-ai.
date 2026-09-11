"use client";

import { useState } from "react";

type State =
  | { kind: "idle" }
  | { kind: "pending" }
  | { kind: "restarting" }
  | { kind: "error"; message: string; path?: string };

export function AdminRestartButton() {
  const [state, setState] = useState<State>({ kind: "idle" });

  async function restart() {
    if (
      !window.confirm(
        "Riavviare il sito? Sarà irraggiungibile per una decina di secondi.",
      )
    ) {
      return;
    }

    setState({ kind: "pending" });

    try {
      const response = await fetch("/api/admin/restart", { method: "POST" });

      if (response.ok) {
        setState({ kind: "restarting" });
        return;
      }

      const body = await response.json().catch(() => ({}));
      setState({
        kind: "error",
        message: body.detail ?? body.error ?? `Errore ${response.status}`,
        path: body.path,
      });
    } catch {
      // The restart can tear down the connection before the response
      // arrives — that is the expected outcome, not a failure.
      setState({ kind: "restarting" });
    }
  }

  if (state.kind === "restarting") {
    return (
      <span className="text-sm text-success">
        Riavvio avviato — aspetta ~15s e ricarica con Ctrl+Shift+R
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end">
      <button
        type="button"
        onClick={restart}
        disabled={state.kind === "pending"}
        className="text-sm text-zinc-500 hover:text-zinc-800 disabled:opacity-60"
      >
        {state.kind === "pending" ? "Riavvio…" : "Riavvia il sito"}
      </button>
      {state.kind === "error" && (
        <span className="mt-1 max-w-xs text-right text-xs text-danger">
          {state.message}
          {state.path && (
            <>
              <br />
              Percorso tentato: <code>{state.path}</code>
            </>
          )}
        </span>
      )}
    </div>
  );
}
