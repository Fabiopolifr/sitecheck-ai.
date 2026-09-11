import { normalizeUrl } from "@/features/audit/url";
import { runAudit } from "@/features/audit/runAudit";
import { safeFetch } from "@/lib/security/safeFetch";
import { getEmailProvider } from "@/lib/email";
import { listLeads } from "@/lib/db/leadsRepository";
import {
  createOutreachSite,
  findOutreachSiteByDomain,
  isOutreachSuppressed,
  listOutreachSites,
  updateOutreachSite,
} from "@/lib/db/outreachRepository";
import { searchBusinesses } from "@/lib/leadDiscovery/googlePlaces";
import { extractContactEmail } from "./extractContactEmail";
import { evaluateOutreachEligibility } from "./eligibility";
import { evaluateDomainExclusion } from "./exclusions";
import {
  composeOutreachEmail,
  composeOutreachFollowUpEmail,
} from "./composeEmail";
import type { OutreachSite } from "./types";

const DEFAULT_MANUAL_PER_DAY = 30;
const DEFAULT_DISCOVERY_PER_DAY = 10;
const DEFAULT_FOLLOW_UP_PER_DAY = 30;
const FOLLOW_UP_DELAY_DAYS = 4;

export type OutreachBatchSummary = {
  manualProcessed: number;
  discovered: number;
  analyzed: number;
  eligible: number;
  emailed: number;
  followedUp: number;
  errors: number;
};

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

/**
 * Processes one site end to end: audit it, decide eligibility (privacy/
 * cookie issues specifically — see eligibility.ts), extract a contact
 * email if eligible, send the outreach email, and persist every outcome
 * — including "not eligible" and "no email found" — so nothing silently
 * disappears (AI/DECISIONS.md D37: filterable eligible/not-eligible
 * status is the whole point of the admin view).
 */
async function processSite(site: OutreachSite): Promise<void> {
  const normalized = normalizeUrl(site.website);
  if (!normalized.ok) {
    site.status = "send_failed";
    site.analyzedAt = new Date().toISOString();
    await updateOutreachSite(site);
    return;
  }

  if (await isOutreachSuppressed(null, site.domain)) {
    site.status = "suppressed";
    site.analyzedAt = new Date().toISOString();
    await updateOutreachSite(site);
    return;
  }

  // Checked before the audit runs: no point spending a fetch on a
  // franchise/portal domain we would never email anyway (D43).
  const domainExclusion = evaluateDomainExclusion(site.domain);
  if (domainExclusion.excluded) {
    site.status = "ineligible";
    site.eligible = false;
    site.eligibilityReason = domainExclusion.reason;
    site.analyzedAt = new Date().toISOString();
    await updateOutreachSite(site);
    return;
  }

  const auditResult = await runAudit(site.website);
  if (!auditResult.ok || auditResult.audit.status !== "completed") {
    site.status = "send_failed";
    site.analyzedAt = new Date().toISOString();
    await updateOutreachSite(site);
    return;
  }

  const { audit } = auditResult;
  const { eligible, reason } = evaluateOutreachEligibility(audit);

  site.auditId = audit.id;
  site.siteScore = audit.siteScore;
  site.band = audit.band;
  site.eligible = eligible;
  site.eligibilityReason = reason;
  site.analyzedAt = new Date().toISOString();

  if (!eligible) {
    site.status = "ineligible";
    await updateOutreachSite(site);
    return;
  }

  const pageFetch = await safeFetch(normalized.url);
  const contactEmail = pageFetch.ok
    ? extractContactEmail(pageFetch.html, normalized.url.hostname)
    : null;

  if (!contactEmail) {
    site.status = "no_email_found";
    await updateOutreachSite(site);
    return;
  }

  if (await isOutreachSuppressed(contactEmail, site.domain)) {
    site.status = "suppressed";
    await updateOutreachSite(site);
    return;
  }

  site.contactEmail = contactEmail;

  const { subject, text, html, variant } = composeOutreachEmail({
    siteId: site.id,
    businessName: site.businessName,
    website: site.website,
    toEmail: contactEmail,
    reason,
  });

  const emailProvider = getEmailProvider();
  const sendResult = await emailProvider.send({
    to: contactEmail,
    subject,
    text,
    html,
  });

  if (sendResult.ok) {
    site.status = "emailed";
    site.emailedAt = new Date().toISOString();
    site.emailVariant = variant;
  } else {
    console.error("Failed to send outreach email:", sendResult.error);
    site.status = "send_failed";
  }

  await updateOutreachSite(site);
}

/**
 * Sends one follow-up per site that was emailed at least
 * FOLLOW_UP_DELAY_DAYS ago, never followed up before, isn't suppressed,
 * and hasn't converted (no lead captured against its audit) — see
 * AI/DECISIONS.md D42. Same sender identity as the first email, framed
 * explicitly as a follow-up, not a fresh unrelated contact.
 */
async function processFollowUps(followUpPerDay: number): Promise<number> {
  const [allSites, leads] = await Promise.all([
    listOutreachSites(),
    listLeads(),
  ]);
  const convertedAuditIds = new Set(
    leads.map((l) => l.auditId).filter((id): id is string => id !== null),
  );

  const cutoff = Date.now() - FOLLOW_UP_DELAY_DAYS * 24 * 60 * 60 * 1000;

  const candidates = allSites
    .filter(
      (s) =>
        s.status === "emailed" &&
        s.followUpSentAt === null &&
        s.contactEmail &&
        s.emailedAt &&
        new Date(s.emailedAt).getTime() <= cutoff &&
        !(s.auditId && convertedAuditIds.has(s.auditId)),
    )
    .sort((a, b) => (a.emailedAt ?? "").localeCompare(b.emailedAt ?? ""))
    .slice(0, followUpPerDay);

  let sent = 0;

  for (const site of candidates) {
    if (await isOutreachSuppressed(site.contactEmail, site.domain)) {
      continue;
    }

    const { subject, text, html, variant } = composeOutreachFollowUpEmail({
      siteId: site.id,
      businessName: site.businessName,
      website: site.website,
      toEmail: site.contactEmail!,
      reason: site.eligibilityReason ?? "problema di conformità rilevato",
    });

    const emailProvider = getEmailProvider();
    const sendResult = await emailProvider.send({
      to: site.contactEmail!,
      subject,
      text,
      html,
    });

    if (sendResult.ok) {
      site.followUpSentAt = new Date().toISOString();
      site.followUpVariant = variant;
      sent++;
    } else {
      console.error(
        "Failed to send outreach follow-up email:",
        sendResult.error,
      );
    }

    await updateOutreachSite(site);
  }

  return sent;
}

export async function runOutreachBatch(options?: {
  discoveryQueries?: string[];
  manualPerDay?: number;
  discoveryPerDay?: number;
  followUpPerDay?: number;
}): Promise<OutreachBatchSummary> {
  const manualPerDay = options?.manualPerDay ?? DEFAULT_MANUAL_PER_DAY;
  const discoveryPerDay = options?.discoveryPerDay ?? DEFAULT_DISCOVERY_PER_DAY;
  const followUpPerDay = options?.followUpPerDay ?? DEFAULT_FOLLOW_UP_PER_DAY;

  const summary: OutreachBatchSummary = {
    manualProcessed: 0,
    discovered: 0,
    analyzed: 0,
    eligible: 0,
    emailed: 0,
    followedUp: 0,
    errors: 0,
  };

  const allSites = await listOutreachSites();

  // 1. Manual queue: oldest-first, up to the daily cap.
  const queuedManual = allSites
    .filter((s) => s.source === "manual" && s.status === "queued")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .slice(0, manualPerDay);

  for (const site of queuedManual) {
    try {
      await processSite(site);
      summary.manualProcessed++;
      summary.analyzed++;
      if (site.eligible) summary.eligible++;
      if (site.status === "emailed") summary.emailed++;
    } catch (error) {
      console.error(`Outreach batch failed for ${site.website}:`, error);
      summary.errors++;
    }
  }

  // 2. Google Maps discovery: new candidates not already tracked.
  const queries = options?.discoveryQueries ?? [];
  const known = new Set(allSites.map((s) => s.domain));

  for (const query of queries) {
    if (summary.discovered >= discoveryPerDay) break;

    const remaining = discoveryPerDay - summary.discovered;
    const found = await searchBusinesses(query, remaining);

    for (const business of found) {
      if (summary.discovered >= discoveryPerDay) break;

      const domain = domainOf(business.website);
      if (known.has(domain)) continue;
      known.add(domain);

      const existing = await findOutreachSiteByDomain(domain);
      if (existing) continue;

      const site = await createOutreachSite({
        source: "google_maps",
        website: business.website,
        domain,
        businessName: business.name,
        city: business.city,
        queryUsed: query,
      });

      summary.discovered++;

      try {
        await processSite(site);
        summary.analyzed++;
        if (site.eligible) summary.eligible++;
        if (site.status === "emailed") summary.emailed++;
      } catch (error) {
        console.error(`Outreach batch failed for ${site.website}:`, error);
        summary.errors++;
      }
    }
  }

  // 3. Follow-up: sites emailed a while ago with no conversion yet.
  try {
    summary.followedUp = await processFollowUps(followUpPerDay);
  } catch (error) {
    console.error("Outreach follow-up pass failed:", error);
    summary.errors++;
  }

  return summary;
}
