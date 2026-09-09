import { NextResponse } from "next/server";
import { z } from "zod";
import { saveLead } from "@/lib/db/leadsRepository";
import { getAudit } from "@/lib/db/auditsRepository";
import { getEmailProvider } from "@/lib/email";
import { isRateLimited } from "@/lib/security/rateLimit";
import { env } from "@/lib/config/env";

export const runtime = "nodejs";

const requestSchema = z.object({
  auditId: z.string().min(1),
  email: z.string().email(),
  firstName: z.string().min(1).max(200).optional(),
  consentMarketing: z.boolean().default(false),
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

  const { auditId, email, firstName, consentMarketing } = parsed.data;
  const audit = await getAudit(auditId);

  const lead = await saveLead({
    auditId: audit ? auditId : null,
    email,
    firstName,
    consentMarketing,
  });

  const emailProvider = getEmailProvider();
  const scoreLine =
    audit?.status === "completed" && audit.siteScore !== null
      ? `Il tuo Site Score: ${audit.siteScore}/100.`
      : "";
  const baseUrl = env.APP_URL ?? new URL(request.url).origin;
  const resultsLine = audit
    ? `Rivedi i risultati completi qui: ${baseUrl}/audit/${audit.id}`
    : "";

  await emailProvider.send({
    to: email,
    subject: "Il tuo report SiteCheck AI",
    text: `Grazie per aver usato SiteCheck AI. ${scoreLine} ${resultsLine}`.trim(),
  });

  return NextResponse.json({ id: lead.id }, { status: 201 });
}
