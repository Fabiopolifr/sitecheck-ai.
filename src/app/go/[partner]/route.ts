import { NextResponse } from "next/server";
import { getPartnerConfig } from "@/features/affiliate/partners";
import { logAffiliateClick } from "@/lib/db/affiliateRepository";
import { getAudit } from "@/lib/db/auditsRepository";
import { saveEvent } from "@/lib/db/eventsRepository";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ partner: string }> },
) {
  const { partner } = await params;
  const config = getPartnerConfig(partner);

  if (!config || !config.destination) {
    return NextResponse.json(
      { error: "Unknown or unconfigured affiliate partner" },
      { status: 404 },
    );
  }

  const requestUrl = new URL(request.url);
  const auditId = requestUrl.searchParams.get("audit");
  const issue = requestUrl.searchParams.get("issue");
  const placement = requestUrl.searchParams.get("placement");
  const sessionId = requestUrl.searchParams.get("session");

  const audit = auditId ? await getAudit(auditId) : undefined;

  const destination = new URL(config.destination);
  destination.searchParams.set("utm_source", "sitecheck-ai");
  destination.searchParams.set("utm_medium", "referral");
  destination.searchParams.set("utm_campaign", config.utmCampaign);

  await logAffiliateClick({
    auditId: audit ? audit.id : null,
    partner,
    destination: destination.toString(),
    detectedIssue: issue,
    utmSource: "sitecheck-ai",
    utmCampaign: config.utmCampaign,
  });

  if (sessionId) {
    await saveEvent({
      sessionId,
      auditId: audit ? audit.id : undefined,
      eventName: "affiliate_clicked",
      metadata: {
        partner,
        ...(issue ? { reasonCode: issue } : {}),
        ...(placement ? { placement } : {}),
      },
    });
  }

  return NextResponse.redirect(destination, { status: 302 });
}
