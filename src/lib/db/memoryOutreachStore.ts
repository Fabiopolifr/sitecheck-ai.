import type {
  OutreachSite,
  OutreachSuppression,
} from "@/features/outreach/types";

const globalForStore = globalThis as unknown as {
  __siteCheckOutreachSites?: OutreachSite[];
  __siteCheckOutreachSuppressions?: OutreachSuppression[];
};

const sites = globalForStore.__siteCheckOutreachSites ?? [];
globalForStore.__siteCheckOutreachSites = sites;

const suppressions = globalForStore.__siteCheckOutreachSuppressions ?? [];
globalForStore.__siteCheckOutreachSuppressions = suppressions;

export function saveOutreachSite(site: OutreachSite): void {
  const index = sites.findIndex((s) => s.id === site.id);
  if (index >= 0) sites[index] = site;
  else sites.push(site);
}

export function listOutreachSites(): OutreachSite[] {
  return [...sites];
}

export function findOutreachSiteByDomain(domain: string): OutreachSite | null {
  return sites.find((s) => s.domain === domain) ?? null;
}

export function findOutreachSiteById(id: string): OutreachSite | null {
  return sites.find((s) => s.id === id) ?? null;
}

export function saveOutreachSuppression(
  suppression: OutreachSuppression,
): void {
  suppressions.push(suppression);
}

export function listOutreachSuppressions(): OutreachSuppression[] {
  return [...suppressions];
}

export function isSuppressed(email: string | null, domain: string): boolean {
  return suppressions.some(
    (s) =>
      (email && s.email && s.email.toLowerCase() === email.toLowerCase()) ||
      (s.domain && s.domain.toLowerCase() === domain.toLowerCase()),
  );
}
