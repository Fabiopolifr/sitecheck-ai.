import { NextResponse } from "next/server";
import { z } from "zod";
import { saveLead } from "@/lib/db/leadsRepository";
import { getAudit } from "@/lib/db/auditsRepository";
import { getSummary } from "@/lib/db/summariesRepository";
import { getEmailProvider } from "@/lib/email";
import { saveEvent } from "@/lib/db/eventsRepository";
import { isRateLimited } from "@/lib/security/rateLimit";
import { env } from "@/lib/config/env";
import { resolvePriorities } from "@/features/audit/priorities";
import { BAND_LABELS } from "@/features/audit/labels";
import { getCookieYesRecommendation } from "@/features/affiliate/cookieyesRecommendation";
import type { AuditResult } from "@/features/audit/types";

export const runtime = "nodejs";

/**
 * Builds the lead-capture email from the audit's actual results (score,
 * band, priorities) instead of a fixed "thanks for using us" message —
 * every report should read differently depending on what was found.
 */
async function buildReportEmail(
  audit: AuditResult | undefined,
  resultsUrl: string,
): Promise<{ subject: string; text: string; html: string }> {
  if (!audit || audit.status !== "completed") {
    return {
      subject: "Il tuo report SiteCheck AI",
      text: `Grazie per aver usato SiteCheck AI. Rivedi i risultati qui: ${resultsUrl}`,
      html: `<p>Grazie per aver usato SiteCheck AI.</p><p><a href="${resultsUrl}">Rivedi i risultati</a></p>`,
    };
  }

  const summary = await getSummary(audit.id);
  const allChecks = audit.categories.flatMap((c) => c.checks);
  const priorities = resolvePriorities(allChecks, summary);
  const bandLabel = audit.band ? BAND_LABELS[audit.band] : null;

  const subject = `Il tuo Site Score: ${audit.siteScore ?? "—"}/100 — SiteCheck AI`;

  const priorityLines = priorities
    .map((p, i) => `${i + 1}. ${p.title} — ${p.reason}`)
    .join("\n");

  const text = [
    `Ecco il riepilogo dell'analisi di ${audit.finalUrl ?? audit.requestedUrl}.`,
    "",
    `Site Score: ${audit.siteScore ?? "—"}/100${bandLabel ? ` (${bandLabel})` : ""}`,
    summary ? "" : undefined,
    summary?.summary,
    priorities.length > 0 ? "\nPriorità da sistemare:" : undefined,
    priorities.length > 0 ? priorityLines : undefined,
    `\nRivedi il report completo: ${resultsUrl}`,
  ]
    .filter((line): line is string => line !== undefined)
    .join("\n");

  const priorityItemsHtml = priorities
    .map(
      (p) =>
        `<li style="margin-bottom:8px"><strong>${escapeHtml(p.title)}</strong> — ${escapeHtml(p.reason)}</li>`,
    )
    .join("");

  const html = `
    <div style="font-family:sans-serif;color:#18181b;max-width:520px">
      <p>Ecco il riepilogo dell'analisi di <strong>${escapeHtml(audit.finalUrl ?? audit.requestedUrl)}</strong>.</p>
      <p style="font-size:32px;font-weight:600;margin:16px 0 4px">${audit.siteScore ?? "—"}<span style="font-size:16px;color:#71717a">/100</span></p>
      ${bandLabel ? `<p style="color:#4338ca;font-weight:500;margin-top:0">${escapeHtml(bandLabel)}</p>` : ""}
      ${summary ? `<p>${escapeHtml(summary.summary)}</p>` : ""}
      ${
        priorities.length > 0
          ? `<p style="font-weight:600;margin-bottom:4px">Priorità da sistemare</p><ul style="padding-left:20px">${priorityItemsHtml}</ul>`
          : ""
      }
      <p style="margin-top:24px">
        <a href="${resultsUrl}" style="background:#4338ca;color:#fff;padding:10px 20px;border-radius:999px;text-decoration:none;display:inline-block">Rivedi il report completo</a>
      </p>
    </div>
  `;

  return { subject, text, html };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const requestSchema = z.object({
  auditId: z.string().min(1),
  email: z.string().email(),
  firstName: z.string().min(1).max(200).optional(),
  consentMarketing: z.boolean().default(false),
  sessionId: z.string().min(1).max(100).optional(),
  /** Where the lead form was shown (e.g. "default", "gate") — analytics only. */
  source: z.string().min(1).max(50).optional(),
  /** "Vuoi che configuriamo CookieYes per te?" checkbox on the report form. */
  supportRequested: z.boolean().optional(),
  supportPhone: z.string().min(1).max(50).optional(),
});

function getClientKey(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() || "unknown";
}

export async function POST(request: Request) {
  if (isRateLimited(getClientKey(request), 20)) {
    return NextResponse.json(
      { error: "Too many requests, please try again shortly" },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "A valid email and auditId are required" },
      { status: 400 },
    );
  }

  const {
    auditId,
    email,
    firstName,
    consentMarketing,
    sessionId,
    source,
    supportRequested,
    supportPhone,
  } = parsed.data;
  const audit = await getAudit(auditId);
  const isSetupRequest = source === "cookieyes_setup";
  const wantsSupport = isSetupRequest || Boolean(supportRequested);

  const recommendation = audit
    ? getCookieYesRecommendation(audit.categories)
    : null;

  const lead = await saveLead({
    auditId: audit ? auditId : null,
    email,
    firstName,
    consentMarketing,
    supportRequested: wantsSupport,
    supportPhone: wantsSupport ? (supportPhone ?? null) : null,
    supportReason: wantsSupport ? (recommendation?.reasonCode ?? null) : null,
  });

  if (sessionId) {
    const metadata =
      source || wantsSupport
        ? {
            ...(source ? { source } : {}),
            ...(wantsSupport ? { supportRequested: true } : {}),
          }
        : undefined;
    await saveEvent({
      sessionId,
      auditId,
      eventName: "email_submitted",
      metadata,
    });
  }

  const emailProvider = getEmailProvider();
  const baseUrl = env.APP_URL ?? new URL(request.url).origin;
  const resultsUrl = audit ? `${baseUrl}/audit/${audit.id}` : baseUrl;

  const { subject, text, html } = isSetupRequest
    ? {
        subject: "Richiesta ricevuta — Configurazione assistita CookieYes",
        text: "Grazie per la richiesta di configurazione assistita di CookieYes (€99 una tantum). Ti ricontatteremo a breve per i dettagli.",
        html: "<p>Grazie per la richiesta di configurazione assistita di CookieYes (€99 una tantum). Ti ricontatteremo a breve per i dettagli.</p>",
      }
    : await buildReportEmail(audit, resultsUrl);

  const emailResult = await emailProvider.send({
    to: email,
    subject,
    text,
    html,
  });

  if (!emailResult.ok) {
    // The lead is still saved above — a delivery failure must not lose the
    // lead — but it needs to be visible server-side, since the client
    // only sees a generic success ("we've sent it") once the lead exists.
    console.error("Failed to send lead email via provider:", emailResult.error);
  }

  // A €99 assisted-setup request needs a human at Freesbe to actually
  // follow up — unlike the regular report email, there is no automated
  // fulfillment. Silently skipped (lead is still saved) when
  // SUPPORT_NOTIFICATION_EMAIL isn't configured. The operator should see
  // immediately: name, phone, email, site URL, Site Score, Cookie
  // Consent Score, detected trackers, CMP, and the recommendation reason
  // — everything needed to call the lead without re-opening the audit.
  if (wantsSupport && env.SUPPORT_NOTIFICATION_EMAIL) {
    const trackerLine =
      audit && recommendation && recommendation.trackerCount > 0
        ? audit.categories
            .find((c) => c.category === "tracking")
            ?.checks.filter((c) => c.status === "warning")
            .map((c) => c.evidence?.replace(/\s+rilevato$/, "") ?? c.id)
            .join(", ")
        : "nessuno rilevato";

    const notifyLines = [
      `Nome: ${firstName ?? "—"}`,
      `Telefono: ${supportPhone ?? "—"}`,
      `Email: ${email}`,
      `URL sito: ${audit?.finalUrl ?? audit?.requestedUrl ?? "—"}`,
      `Site Score: ${audit?.siteScore ?? "—"}/100`,
      `Cookie Consent Score: ${recommendation?.cookieConsentScore ?? "—"}/100`,
      `Tracker rilevati: ${trackerLine ?? "—"}`,
      `CMP rilevata: ${recommendation?.cmpVendor ?? "nessuna"}`,
      `Motivo raccomandazione: ${recommendation?.reasonCode ?? "richiesta diretta (pagina di supporto)"}`,
      `Report: ${audit ? resultsUrl : "non disponibile"}`,
      `Lead id: ${lead.id}`,
    ];

    const notifyResult = await emailProvider.send({
      to: env.SUPPORT_NOTIFICATION_EMAIL,
      subject: "Nuova richiesta: configurazione assistita CookieYes (€99)",
      text: notifyLines.join("\n"),
    });
    if (!notifyResult.ok) {
      console.error(
        "Failed to send internal setup-request notification:",
        notifyResult.error,
      );
    }
  }

  return NextResponse.json({ id: lead.id }, { status: 201 });
}
