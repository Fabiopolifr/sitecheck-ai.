import { getPool, isDatabaseConfigured } from "./pgClient";

/**
 * Every table the app expects to exist. A missing one is not a crash:
 * each repository silently falls back to the in-memory store, so the
 * feature keeps working but its data dies with the Node process — which
 * Passenger restarts on every deploy. That failure mode cost real data
 * (the outreach queue) before anyone noticed, which is why it now has a
 * visible indicator in /admin. See AI/DECISIONS.md D47.
 */
const EXPECTED_TABLES = [
  "audits",
  "audit_checks",
  "audit_summaries",
  "leads",
  "affiliate_clicks",
  "analytics_events",
  "content_insights",
  "content_posts",
  "content_publications",
  "outreach_sites",
  "outreach_suppressions",
  "app_settings",
] as const;

export type DatabaseHealth = {
  configured: boolean;
  reachable: boolean;
  missingTables: string[];
  error: string | null;
};

export async function checkDatabaseHealth(): Promise<DatabaseHealth> {
  if (!isDatabaseConfigured()) {
    return {
      configured: false,
      reachable: false,
      missingTables: [...EXPECTED_TABLES],
      error: null,
    };
  }

  const pool = getPool()!;

  try {
    const result = await pool.query(
      `select table_name from information_schema.tables
       where table_schema = 'public'`,
    );

    const present = new Set(result.rows.map((row) => row.table_name as string));

    return {
      configured: true,
      reachable: true,
      missingTables: EXPECTED_TABLES.filter((table) => !present.has(table)),
      error: null,
    };
  } catch (error) {
    return {
      configured: true,
      reachable: false,
      missingTables: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
