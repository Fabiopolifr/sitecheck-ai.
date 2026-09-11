import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  configured: false,
  query: vi.fn(),
}));

vi.mock("@/lib/db/pgClient", () => ({
  isDatabaseConfigured: () => db.configured,
  getPool: () => ({ query: db.query }),
}));

import { checkDatabaseHealth } from "@/lib/db/healthCheck";

function rowsFor(tables: string[]) {
  return { rows: tables.map((table_name) => ({ table_name })) };
}

const ALL_TABLES = [
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
];

describe("checkDatabaseHealth", () => {
  beforeEach(() => {
    db.configured = false;
    db.query.mockReset();
  });

  it("reports an unconfigured database as not persisting anything", async () => {
    const health = await checkDatabaseHealth();
    expect(health.configured).toBe(false);
    expect(health.reachable).toBe(false);
    expect(health.missingTables).toEqual(ALL_TABLES);
  });

  it("reports a healthy database with no missing tables", async () => {
    db.configured = true;
    db.query.mockResolvedValue(rowsFor([...ALL_TABLES, "some_other_table"]));

    const health = await checkDatabaseHealth();
    expect(health.reachable).toBe(true);
    expect(health.missingTables).toEqual([]);
    expect(health.error).toBeNull();
  });

  it("names exactly the tables that a missing migration left out", async () => {
    db.configured = true;
    // The real case from this project: migrations 0006-0008 never run.
    db.query.mockResolvedValue(
      rowsFor(
        ALL_TABLES.filter(
          (t) =>
            ![
              "outreach_sites",
              "outreach_suppressions",
              "app_settings",
            ].includes(t),
        ),
      ),
    );

    const health = await checkDatabaseHealth();
    expect(health.missingTables).toEqual([
      "outreach_sites",
      "outreach_suppressions",
      "app_settings",
    ]);
  });

  it("surfaces a connection error instead of pretending the db is fine", async () => {
    db.configured = true;
    db.query.mockRejectedValue(new Error("password authentication failed"));

    const health = await checkDatabaseHealth();
    expect(health.configured).toBe(true);
    expect(health.reachable).toBe(false);
    expect(health.error).toContain("password authentication failed");
  });
});
