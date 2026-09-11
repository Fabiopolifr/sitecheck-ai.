import { createHmac } from "node:crypto";
import { env } from "@/lib/config/env";
import { pickVariant } from "./variants";

export function signUnsubscribeToken(email: string): string {
  return createHmac("sha256", env.OUTREACH_SECRET ?? "sitecheck-outreach")
    .update(email.toLowerCase())
    .digest("hex")
    .slice(0, 16);
}

function unsubscribeUrl(email: string): string {
  const base = env.APP_URL ?? "https://sitecheck.example.com";
  const params = new URLSearchParams({
    email,
    token: signUnsubscribeToken(email),
  });
  return `${base}/unsubscribe?${params.toString()}`;
}

function reportUrl(siteId: string): string {
  const base = env.APP_URL ?? "https://sitecheck.example.com";
  return `${base}/api/outreach/click/${siteId}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Subject-line variants for the first-contact email — all honest framings
 * of the same real finding (no fake urgency/scarcity), tested against
 * each other to see which gets more clicks/conversions. See
 * AI/DECISIONS.md D42 and computeOutreachVariantStats in metrics.ts for
 * how the results are read.
 */
const SUBJECT_VARIANTS = [
  {
    id: "A",
    build: (name: string) =>
      `${name}: un problema di privacy/cookie sul vostro sito`,
  },
  {
    id: "B",
    build: (name: string) =>
      `${name}, verifica gratuita: conformità cookie e privacy del sito`,
  },
  {
    id: "C",
    build: (name: string) =>
      `Rilevato un problema di conformità sul sito di ${name}`,
  },
] as const;

const FOLLOWUP_SUBJECT_VARIANTS = [
  {
    id: "F1",
    build: (name: string) =>
      `${name}, il problema privacy/cookie segnalato risulta ancora aperto`,
  },
  {
    id: "F2",
    build: (name: string) =>
      `${name} — il report gratuito della scorsa email è ancora disponibile`,
  },
] as const;

function buildBody(params: {
  website: string;
  reason: string;
  unsubscribe: string;
  report: string;
  intro: string;
}): { text: string; html: string } {
  const { website, reason, unsubscribe, report, intro } = params;

  const text = [
    `Salve,`,
    ``,
    intro,
    ``,
    `Durante un controllo automatico del sito ${website} abbiamo rilevato quanto segue:`,
    `${reason}`,
    ``,
    `Non è una consulenza legale, ma un'analisi tecnica automatizzata: un approfondimento manuale è comunque consigliato. Il report completo è disponibile qui: ${report}`,
    ``,
    `Se non volete ricevere altre comunicazioni di questo tipo, potete disiscrivervi qui: ${unsubscribe}`,
    ``,
    `Freesbe S.r.l.`,
  ].join("\n");

  const html = `
    <div style="font-family:sans-serif;color:#18181b;max-width:520px">
      <p>Salve,</p>
      <p>${escapeHtml(intro)}</p>
      <p>Durante un controllo automatico del sito <strong>${escapeHtml(website)}</strong> abbiamo rilevato quanto segue:</p>
      <p style="background:#fef2f2;border-radius:8px;padding:12px 16px">${escapeHtml(reason)}</p>
      <p>Non è una consulenza legale, ma un'analisi tecnica automatizzata: un approfondimento manuale è comunque consigliato.</p>
      <p><a href="${escapeHtml(report)}" style="display:inline-block;background:#c8863f;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Vedi il report completo</a></p>
      <p style="margin-top:24px;font-size:12px;color:#71717a">
        Freesbe S.r.l. — Se non volete ricevere altre comunicazioni di questo tipo,
        <a href="${escapeHtml(unsubscribe)}">disiscrivetevi qui</a>.
      </p>
    </div>
  `;

  return { text, html };
}

export type ComposedOutreachEmail = {
  subject: string;
  text: string;
  html: string;
  variant: string;
};

/**
 * Cold outreach email body, built strictly from what the audit actually
 * found (never generic sales copy) — see AI/DECISIONS.md D37. Every send
 * carries: who is writing and why (transparency), the specific finding
 * that triggered it, a link to the full report, and a working one-click
 * unsubscribe link that adds the recipient to a permanent suppression
 * list. The subject line is A/B tested (D42): `siteId` deterministically
 * picks a variant so the same site always sees the same subject on
 * resend/logging.
 */
export function composeOutreachEmail(params: {
  siteId: string;
  businessName: string | null;
  website: string;
  toEmail: string;
  reason: string;
}): ComposedOutreachEmail {
  const { siteId, businessName, website, toEmail, reason } = params;
  const name = businessName || website;
  const variant = pickVariant(siteId, SUBJECT_VARIANTS);

  const { text, html } = buildBody({
    website,
    reason,
    unsubscribe: unsubscribeUrl(toEmail),
    report: reportUrl(siteId),
    intro: `Sono Freesbe, analizziamo automaticamente la conformità privacy e cookie dei siti web con SiteCheck AI (${website}).`,
  });

  return { subject: variant.build(name), text, html, variant: variant.id };
}

/**
 * One follow-up, sent once per site (see runOutreachBatch.ts) if there
 * has been no conversion (no lead captured on the audit) after the
 * configured delay. Same sender/domain/identity as the first email —
 * explicitly framed as a follow-up to what was already sent, not a new
 * unrelated contact.
 */
export function composeOutreachFollowUpEmail(params: {
  siteId: string;
  businessName: string | null;
  website: string;
  toEmail: string;
  reason: string;
}): ComposedOutreachEmail {
  const { siteId, businessName, website, toEmail, reason } = params;
  const name = businessName || website;
  const variant = pickVariant(`${siteId}:followup`, FOLLOWUP_SUBJECT_VARIANTS);

  const { text, html } = buildBody({
    website,
    reason,
    unsubscribe: unsubscribeUrl(toEmail),
    report: reportUrl(siteId),
    intro: `Sono di nuovo Freesbe: vi avevamo scritto qualche giorno fa a proposito del sito ${website} (SiteCheck AI).`,
  });

  return { subject: variant.build(name), text, html, variant: variant.id };
}
