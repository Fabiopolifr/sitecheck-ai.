/**
 * `register` viene eseguito una volta all'avvio del server, e completato
 * prima che questo accetti richieste: è il punto giusto per allineare lo
 * schema del database al codice appena distribuito (AI/DECISIONS.md D51).
 *
 * Non solleva mai: un problema di migration non deve impedire l'avvio
 * del sito. L'esito resta nel log e lo stato dello schema è comunque
 * visibile nel banner in /admin (D47).
 */
export async function register() {
  // Solo sul runtime Node: l'edge runtime non ha né `pg` né il
  // filesystem con la cartella migrations/.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  try {
    const { runPendingMigrations } = await import("@/lib/db/migrate");
    const outcome = await runPendingMigrations();

    if (outcome.error) {
      console.error("Migrazioni non applicate:", outcome.error);
      return;
    }

    if (outcome.applied.length > 0) {
      console.log(
        `Migrazioni applicate (${outcome.applied.length}): ${outcome.applied.join(", ")}`,
      );
    }
  } catch (error) {
    console.error("Errore inatteso durante le migrazioni all'avvio:", error);
  }
}
