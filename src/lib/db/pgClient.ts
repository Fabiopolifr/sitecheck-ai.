import { Pool } from "pg";
import { env } from "@/lib/config/env";

let pool: Pool | null | undefined;

export function isDatabaseConfigured(): boolean {
  return Boolean(env.DATABASE_URL);
}

/**
 * Server-only Postgres connection pool. Works against any Postgres
 * instance — a self-managed one on a Hostinger VPS, Supabase, or
 * anywhere else — since the app only ever speaks plain SQL to it (no
 * provider-specific client). Returns null when DATABASE_URL is not
 * configured; every repository in `src/lib/db/` must fall back to the
 * in-memory store in that case (see AI/DECISIONS.md).
 */
export function getPool(): Pool | null {
  if (pool !== undefined) return pool;

  if (!isDatabaseConfigured()) {
    pool = null;
    return pool;
  }

  // Self-managed Postgres (e.g. on the same VPS, or over a private
  // network) typically has no TLS listener at all; only enable it when
  // the connection string explicitly asks for it, matching how psql/libpq
  // interpret `sslmode` (node-postgres does not parse this itself).
  const requiresSsl = /[?&]sslmode=require/.test(env.DATABASE_URL!);

  pool = new Pool({
    connectionString: env.DATABASE_URL,
    ssl: requiresSsl ? { rejectUnauthorized: false } : undefined,
  });

  pool.on("error", (error) => {
    console.error("Unexpected Postgres pool error:", error);
  });

  return pool;
}
