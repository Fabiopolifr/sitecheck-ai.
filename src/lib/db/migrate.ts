import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { getPool, isDatabaseConfigured } from "./pgClient";

/**
 * Applica le migration in `migrations/` non ancora eseguite, tenendone
 * traccia in `schema_migrations`. Chiamato all'avvio del server da
 * `src/instrumentation.ts` (AI/DECISIONS.md D51).
 *
 * Nasce da un problema reale: le migration andavano eseguite a mano sul
 * SQL Editor di Neon, e dimenticarne una non dava errori — i repository
 * ripiegano sullo store in memoria, quindi la funzionalità sembrava
 * funzionare e i dati sparivano al riavvio successivo (D47).
 */

// I file sono `0001_*.sql`…: esclude RUN_ALL.sql, che è la
// concatenazione di tutti e li rieseguirebbe inutilmente.
const MIGRATION_FILE = /^\d{4}_.+\.sql$/;

// Chiave arbitraria ma fissa per il lock: Passenger può avere più
// processi Node, e devono applicare le migration uno alla volta.
const ADVISORY_LOCK_KEY = 827411;

export type MigrationOutcome = {
  applied: string[];
  /** true quando non c'era nulla da fare o un altro processo stava già migrando */
  skipped: boolean;
  error: string | null;
};

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function readMigrationFiles(): Promise<string[]> {
  const dir = path.join(process.cwd(), "migrations");
  const entries = await readdir(dir);
  return entries.filter((name) => MIGRATION_FILE.test(name)).sort();
}

export async function runPendingMigrations(): Promise<MigrationOutcome> {
  if (!isDatabaseConfigured()) {
    return { applied: [], skipped: true, error: null };
  }

  const pool = getPool()!;
  let client;

  try {
    client = await pool.connect();
  } catch (error) {
    return { applied: [], skipped: false, error: messageOf(error) };
  }

  try {
    const lock = await client.query<{ ok: boolean }>(
      "select pg_try_advisory_lock($1) as ok",
      [ADVISORY_LOCK_KEY],
    );

    // Un altro processo sta già migrando: non è un errore, si lascia
    // fare a lui invece di applicare le stesse migration in parallelo.
    if (!lock.rows[0]?.ok) {
      return { applied: [], skipped: true, error: null };
    }

    try {
      await client.query(
        `create table if not exists schema_migrations (
           filename text primary key,
           applied_at timestamptz not null default now()
         )`,
      );

      const recorded = await client.query<{ filename: string }>(
        "select filename from schema_migrations",
      );
      const done = new Set(recorded.rows.map((row) => row.filename));

      const files = await readMigrationFiles();
      const applied: string[] = [];

      for (const file of files) {
        if (done.has(file)) continue;

        const sql = await readFile(
          path.join(process.cwd(), "migrations", file),
          "utf8",
        );

        // Una transazione per migration: se una fallisce si annulla solo
        // quella, senza lasciare uno schema a metà.
        await client.query("begin");
        try {
          await client.query(sql);
          await client.query(
            "insert into schema_migrations (filename) values ($1)",
            [file],
          );
          await client.query("commit");
        } catch (error) {
          await client.query("rollback");
          throw new Error(`migration ${file}: ${messageOf(error)}`);
        }

        applied.push(file);
      }

      return { applied, skipped: applied.length === 0, error: null };
    } finally {
      await client.query("select pg_advisory_unlock($1)", [ADVISORY_LOCK_KEY]);
    }
  } catch (error) {
    return { applied: [], skipped: false, error: messageOf(error) };
  } finally {
    client.release();
  }
}
