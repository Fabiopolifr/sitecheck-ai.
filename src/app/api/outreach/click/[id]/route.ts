import { NextResponse } from "next/server";
import { env } from "@/lib/config/env";
import {
  getOutreachSiteById,
  updateOutreachSite,
} from "@/lib/db/outreachRepository";

export const runtime = "nodejs";

/**
 * Public link embedded in outreach emails ("Vedi il report completo").
 * Records the first click (for the subject-line A/B stats — see
 * computeOutreachVariantStats) then redirects to the actual audit
 * results page. Never 404s on an unknown id — always redirects somewhere
 * sane, since this link is clicked by real recipients, not developers.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const base = env.APP_URL ?? "https://sitecheck.example.com";

  const site = await getOutreachSiteById(id);
  if (!site || !site.auditId) {
    return NextResponse.redirect(base, { status: 302 });
  }

  if (!site.clickedAt) {
    site.clickedAt = new Date().toISOString();
    await updateOutreachSite(site);
  }

  return NextResponse.redirect(`${base}/audit/${site.auditId}`, {
    status: 302,
  });
}
