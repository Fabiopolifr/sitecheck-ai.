import { NextResponse } from "next/server";
import { z } from "zod";
import { saveLead } from "@/lib/db/leadsRepository";
import { getAudit } from "@/lib/db/auditsRepository";
import { getEmailProvider } from "@/lib/email";
import { saveEvent } from "@/lib/db/eventsRepository";
import { isRateLimited } from "@/lib/security/rateLimit";
import { env } from "@/lib/config/env";

export const runtime = "nodejs";

const requestSchema = z.object({
  auditId: z.string().min(1),
  email: z.string().email(),
  firstName: z.string().min(1).max(200).optional(),
  consentMarketing: z.boolean().default(false),
  sessionId: z.string().min(1).max(100).optional(),
  /** Where the lead form was shown (e.g. "default", "gate") — analytics only. */
  source: z.string().min(1).max(50).optional(),
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

  const { auditId, email, firstName, consentMarketing, sessionId, source } =
    parsed.data;
  const audit = await getAudit(auditId);

  const lead = await saveLead({
    auditId: audit ? auditId : null,
    email,
    firstName,
    consentMarketing,
  });

  if (sessionId) {
    await saveEvent({
      sessionId,
      auditId,
      eventName: "email_submitted",
      metadata: source ? { source } : undefined,
    });
  }

  const emailProvider = getEmailProvider();
  const scoreLine =
    audit?.status === "completed" && audit.siteScore !== null
      ? `Il tuo Site Score: ${audit.siteScore}/100.`
      : "";
  const baseUrl = env.APP_URL ?? new URL(request.url).origin;
  const resultsLine = audit
    ? `Rivedi i risultati completi qui: ${baseUrl}/audit/${audit.id}`
    : "";

  const emailResult = await emailProvider.send({
    to: email,
    subject: "Il tuo report SiteCheck AI",
    text: `Grazie per aver usato SiteCheck AI. ${scoreLine} ${resultsLine}`.trim(),
  });

  if (!emailResult.ok) {
    // The lead is still saved above — a delivery failure must not lose the
    // lead — but it needs to be visible server-side, since the client
    // only sees a generic success ("we've sent it") once the lead exists.
    console.error("Failed to send lead email via provider:", emailResult.error);
  }

  return NextResponse.json({ id: lead.id }, { status: 201 });
}
