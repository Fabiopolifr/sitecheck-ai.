import type { AuditSummary } from "@/lib/ai";

const globalForStore = globalThis as unknown as {
  __siteCheckSummaryStore?: Map<string, AuditSummary>;
};

const store =
  globalForStore.__siteCheckSummaryStore ?? new Map<string, AuditSummary>();
globalForStore.__siteCheckSummaryStore = store;

export function saveSummary(auditId: string, summary: AuditSummary): void {
  store.set(auditId, summary);
}

export function getSummary(auditId: string): AuditSummary | undefined {
  return store.get(auditId);
}
