export type AffiliateClick = {
  id: string;
  auditId: string | null;
  partner: string;
  destination: string;
  detectedIssue: string | null;
  utmSource: string | null;
  utmCampaign: string | null;
  createdAt: string;
};

const globalForStore = globalThis as unknown as {
  __siteCheckAffiliateStore?: AffiliateClick[];
};

const store = globalForStore.__siteCheckAffiliateStore ?? [];
globalForStore.__siteCheckAffiliateStore = store;

export function saveAffiliateClick(click: AffiliateClick): void {
  store.push(click);
}

export function listAffiliateClicks(): AffiliateClick[] {
  return [...store];
}
