import { NextResponse } from "next/server";
import { z } from "zod";
import {
  ADMIN_SESSION_COOKIE,
  isValidAdminSessionToken,
} from "@/lib/security/adminAuth";
import { normalizeUrl } from "@/features/audit/url";
import { createOutreachSite } from "@/lib/db/outreachRepository";

export const runtime = "nodejs";

const requestSchema = z.object({
  urls: z.array(z.string().min(1)).min(1).max(200),
});

function domainOf(url: URL): string {
  return url.hostname.replace(/^www\./, "").toLowerCase();
}

export async function POST(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const token = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${ADMIN_SESSION_COOKIE}=`))
    ?.slice(ADMIN_SESSION_COOKIE.length + 1);

  if (!isValidAdminSessionToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
      { error: "A list of URLs is required" },
      {
        status: 400,
      },
    );
  }

  let queued = 0;
  let invalid = 0;

  for (const raw of parsed.data.urls) {
    const normalized = normalizeUrl(raw);
    if (!normalized.ok) {
      invalid++;
      continue;
    }
    await createOutreachSite({
      source: "manual",
      website: normalized.url.toString(),
      domain: domainOf(normalized.url),
    });
    queued++;
  }

  return NextResponse.json({ queued, invalid });
}
