import { NextResponse } from "next/server";
import { z } from "zod";
import { runAudit } from "@/features/audit/runAudit";
import { generateAuditSummary } from "@/features/audit/aiSummary";
import { saveAudit } from "@/lib/db/auditsRepository";
import { saveSummary } from "@/lib/db/summariesRepository";
import { saveEvent } from "@/lib/db/eventsRepository";
import { isRateLimited } from "@/lib/security/rateLimit";

export const runtime = "nodejs";

const requestSchema = z.object({
  url: z.string().min(1).max(2048),
  sessionId: z.string().min(1).max(100).optional(),
  utmSource: z.string().max(200).optional(),
  utmMedium: z.string().max(200).optional(),
  utmCampaign: z.string().max(200).optional(),
});

function getClientKey(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() || "unknown";
}

export async function POST(request: Request) {
  if (isRateLimited(getClientKey(request))) {
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
      { error: 'A valid "url" field is required' },
      { status: 400 },
    );
  }

  const { url, sessionId, utmSource, utmMedium, utmCampaign } = parsed.data;

  if (sessionId) {
    await saveEvent({
      sessionId,
      eventName: "audit_started",
      metadata: { url },
    });
  }

  const result = await runAudit(url);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  result.audit.utmSource = utmSource ?? null;
  result.audit.utmMedium = utmMedium ?? null;
  result.audit.utmCampaign = utmCampaign ?? null;

  await saveAudit(result.audit);

  if (sessionId) {
    await saveEvent({
      sessionId,
      auditId: result.audit.id,
      eventName:
        result.audit.status === "completed"
          ? "audit_completed"
          : "audit_failed",
    });
  }

  if (result.audit.status === "completed") {
    const summary = await generateAuditSummary(result.audit);
    await saveSummary(result.audit.id, summary);
  }

  return NextResponse.json({ id: result.audit.id }, { status: 201 });
}
