import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  configured: true,
  lockAvailable: true,
  recorded: [] as string[],
  failOn: null as string | null,
  queries: [] as string[],
  connectFails: false,
  released: 0,
}));

vi.mock("@/lib/db/pgClient", () => ({
  isDatabaseConfigured: () => db.configured,
  getPool: () => ({
    connect: async () => {
      if (db.connectFails) throw new Error("too many connections");
      return {
        query: async (sql: string, params?: unknown[]) => {
          db.queries.push(sql.trim().split("\n")[0]);

          if (sql.includes("pg_try_advisory_lock")) {
            return { rows: [{ ok: db.lockAvailable }] };
          }
          if (sql.includes("select filename from schema_migrations")) {
            return { rows: db.recorded.map((filename) => ({ filename })) };
          }
          if (sql.startsWith("insert into schema_migrations")) {
            db.recorded.push((params as string[])[0]);
            return { rows: [] };
          }
          // Contenuto di una migration: `failOn` simula un errore SQL.
          if (db.failOn && sql.includes(db.failOn)) {
            throw new Error("syntax error at or near");
          }
          return { rows: [] };
        },
        release: () => {
          db.released++;
        },
      };
    },
  }),
}));

import { runPendingMigrations } from "@/lib/db/migrate";

describe("runPendingMigrations", () => {
  beforeEach(() => {
    db.configured = true;
    db.lockAvailable = true;
    db.recorded = [];
    db.failOn = null;
    db.queries = [];
    db.connectFails = false;
    db.released = 0;
  });

  it("applies every migration in filename order on a fresh database", async () => {
    const outcome = await runPendingMigrations();

    expect(outcome.error).toBeNull();
    expect(outcome.applied.length).toBeGreaterThanOrEqual(8);
    expect(outcome.applied[0]).toBe("0001_init.sql");
    expect([...outcome.applied]).toEqual([...outcome.applied].sort());
  });

  it("never applies RUN_ALL.sql, which would re-run everything", async () => {
    const outcome = await runPendingMigrations();
    expect(outcome.applied).not.toContain("RUN_ALL.sql");
  });

  it("applies nothing on a second run", async () => {
    await runPendingMigrations();
    const second = await runPendingMigrations();

    expect(second.applied).toEqual([]);
    expect(second.skipped).toBe(true);
  });

  it("applies only the migrations missing from an existing database", async () => {
    db.recorded = ["0001_init.sql", "0002_audit_summaries.sql"];

    const outcome = await runPendingMigrations();
    expect(outcome.applied).not.toContain("0001_init.sql");
    expect(outcome.applied).toContain("0003_analytics_events.sql");
  });

  it("rolls back and reports the failing migration by name", async () => {
    db.failOn = "create table if not exists app_settings";

    const outcome = await runPendingMigrations();

    expect(outcome.error).toContain("0007_app_settings.sql");
    expect(db.queries).toContain("rollback");
    // Non registrata: un prossimo avvio deve riprovarla.
    expect(db.recorded).not.toContain("0007_app_settings.sql");
  });

  it("releases the advisory lock even when a migration fails", async () => {
    db.failOn = "create table if not exists app_settings";
    await runPendingMigrations();
    expect(db.queries.some((q) => q.includes("pg_advisory_unlock"))).toBe(true);
    expect(db.released).toBe(1);
  });

  it("stands aside when another process holds the lock", async () => {
    db.lockAvailable = false;

    const outcome = await runPendingMigrations();
    expect(outcome.applied).toEqual([]);
    expect(outcome.skipped).toBe(true);
    expect(outcome.error).toBeNull();
  });

  it("does nothing when no database is configured", async () => {
    db.configured = false;

    const outcome = await runPendingMigrations();
    expect(outcome).toEqual({ applied: [], skipped: true, error: null });
    expect(db.queries).toEqual([]);
  });

  it("reports a connection failure instead of throwing at startup", async () => {
    db.connectFails = true;

    const outcome = await runPendingMigrations();
    expect(outcome.error).toContain("too many connections");
  });
});
