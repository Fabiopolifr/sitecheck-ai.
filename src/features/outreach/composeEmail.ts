import { createHmac } from "node:crypto";
import { env } from "@/lib/config/env";

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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Cold outreach email body, built strictly from what the audit actually
 * found (never generic sales copy) — see AI/DECISIONS.md D37. Every send
 * carries: who is writing and why (transparency), the specific finding
 * that triggered it, and a working one-click unsubscribe link that adds
 * the recipient to a permanent suppression list.
 */
export function composeOutreachEmail(params: {
  businessName: string | null;
  website: string;
  toEmail: string;
  reason: string;
}): { subject: string; text: string; html: string } {
  const { businessName, website, toEmail, reason } = params;
  const name = businessName || website;
  const unsubscribe = unsubscribeUrl(toEmail);

  const subject = `${name}: un problema di privacy/cookie sul vostro sito`;

  const text = [
    `Salve,`,
    ``,
    `Sono Freesbe, analizziamo automaticamente la conformità privacy e cookie dei siti web con SiteCheck AI (${website}).`,
    ``,
    `Durante un controllo automatico del sito ${website} abbiamo rilevato quanto segue:`,
    `${reason}`,
    ``,
    `Non è una consulenza legale, ma un'analisi tecnica automatizzata: un approfondimento manuale è comunque consigliato. Se volete, possiamo aiutarvi a sistemarlo.`,
    ``,
    `Se non volete ricevere altre comunicazioni di questo tipo, potete disiscrivervi qui: ${unsubscribe}`,
    ``,
    `Freesbe S.r.l.`,
  ].join("\n");

  const html = `
    <div style="font-family:sans-serif;color:#18181b;max-width:520px">
      <p>Salve,</p>
      <p>Sono Freesbe, analizziamo automaticamente la conformità privacy e cookie dei siti web con SiteCheck AI (<a href="${escapeHtml(website)}">${escapeHtml(website)}</a>).</p>
      <p>Durante un controllo automatico del sito <strong>${escapeHtml(website)}</strong> abbiamo rilevato quanto segue:</p>
      <p style="background:#fef2f2;border-radius:8px;padding:12px 16px">${escapeHtml(reason)}</p>
      <p>Non è una consulenza legale, ma un'analisi tecnica automatizzata: un approfondimento manuale è comunque consigliato. Se volete, possiamo aiutarvi a sistemarlo.</p>
      <p style="margin-top:24px;font-size:12px;color:#71717a">
        Freesbe S.r.l. — Se non volete ricevere altre comunicazioni di questo tipo,
        <a href="${escapeHtml(unsubscribe)}">disiscrivetevi qui</a>.
      </p>
    </div>
  `;

  return { subject, text, html };
}
