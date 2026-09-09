export type Lead = {
  id: string;
  auditId: string | null;
  email: string;
  firstName: string | null;
  consentMarketing: boolean;
  createdAt: string;
};

/** Phase 2 mock persistence fallback — see memoryAuditStore.ts for why
 * this is stashed on globalThis rather than a plain module variable. */
const globalForStore = globalThis as unknown as {
  __siteCheckLeadStore?: Lead[];
};

const store = globalForStore.__siteCheckLeadStore ?? [];
globalForStore.__siteCheckLeadStore = store;

export function saveLead(lead: Lead): void {
  store.push(lead);
}

export function listLeads(): Lead[] {
  return [...store];
}
