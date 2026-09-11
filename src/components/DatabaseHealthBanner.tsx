import type { DatabaseHealth } from "@/lib/db/healthCheck";

/**
 * Makes the in-memory fallback visible instead of silent: without this,
 * a missing table looks exactly like a working feature until the next
 * restart throws the data away (AI/DECISIONS.md D47).
 */
export function DatabaseHealthBanner({ health }: { health: DatabaseHealth }) {
  if (!health.configured) {
    return (
      <div className="mt-4 rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">
        <p className="font-semibold">
          DATABASE_URL non configurato — i dati NON vengono salvati
        </p>
        <p className="mt-1">
          Tutto sta solo nella memoria del processo e sparisce al primo riavvio.
          Imposta <code>DATABASE_URL</code> nelle variabili d&apos;ambiente del
          pannello di hosting.
        </p>
      </div>
    );
  }

  if (!health.reachable) {
    return (
      <div className="mt-4 rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">
        <p className="font-semibold">
          Database non raggiungibile — i dati NON vengono salvati
        </p>
        <p className="mt-1">
          L&apos;app sta scrivendo in memoria volatile. Errore:{" "}
          <code>{health.error}</code>
        </p>
      </div>
    );
  }

  if (health.missingTables.length > 0) {
    return (
      <div className="mt-4 rounded-lg bg-warning/10 px-4 py-3 text-sm text-warning">
        <p className="font-semibold">
          Migration mancanti: {health.missingTables.length}{" "}
          {health.missingTables.length === 1 ? "tabella" : "tabelle"} non
          esistono
        </p>
        <p className="mt-1">
          I dati di queste tabelle si perdono a ogni riavvio:{" "}
          <code>{health.missingTables.join(", ")}</code>. Esegui{" "}
          <code>migrations/RUN_ALL.sql</code> nel SQL Editor di Neon (vedi
          DEPLOYMENT.md).
        </p>
      </div>
    );
  }

  return (
    <p className="mt-4 text-xs text-zinc-400">
      Database Postgres connesso, tutte le tabelle presenti — i dati sono
      persistenti.
    </p>
  );
}
