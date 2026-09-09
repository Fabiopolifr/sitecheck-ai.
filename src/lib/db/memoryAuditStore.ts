import type { AuditResult } from "@/features/audit/types";

/**
 * Phase 1 mock persistence: an in-process Map, not durable across restarts
 * or multiple server instances. Replaced by the PostgreSQL/Supabase
 * `audits` table in Phase 2 (see AI/MASTER_SPEC.md §10, §32).
 *
 * Stashed on `globalThis` rather than a plain module-level variable:
 * Next.js compiles route handlers and pages as separate module graphs, so a
 * module-scoped singleton would not actually be shared between
 * `/api/audit` and `/audit/[id]` — `globalThis` is the one thing guaranteed
 * to be shared across the whole server process.
 */
const globalForStore = globalThis as unknown as {
  __siteCheckAuditStore?: Map<string, AuditResult>;
};

const store =
  globalForStore.__siteCheckAuditStore ?? new Map<string, AuditResult>();
globalForStore.__siteCheckAuditStore = store;

export function saveAudit(result: AuditResult): void {
  store.set(result.id, result);
}

export function getAudit(id: string): AuditResult | undefined {
  return store.get(id);
}

export function listAudits(): AuditResult[] {
  return [...store.values()].sort((a, b) =>
    b.completedAt.localeCompare(a.completedAt),
  );
}
