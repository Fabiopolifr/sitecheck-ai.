import { NextResponse } from "next/server";
import { z } from "zod";
import {
  ADMIN_SESSION_COOKIE,
  isValidAdminSessionToken,
} from "@/lib/security/adminAuth";
import { normalizeUrl } from "@/features/audit/url";
import { createOutreachSite } from "@/lib/db/outreachRepository";
import { extractCellsFromDelimitedText } from "@/features/outreach/parseCsvUrls";

export const runtime = "nodejs";

const MAX_CELLS_PER_FILE = 2000;

const requestSchema = z.object({
  urls: z.array(z.string().min(1)).min(1).max(200),
});

function domainOf(url: URL): string {
  return url.hostname.replace(/^www\./, "").toLowerCase();
}

async function queueUrls(
  candidates: string[],
): Promise<{ queued: number; invalid: number }> {
  let queued = 0;
  let invalid = 0;

  for (const raw of candidates) {
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

  return { queued, invalid };
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

  const contentType = request.headers.get("content-type") ?? "";

  // CSV/TSV file upload — column-agnostic: every cell that parses as a
  // URL is queued, everything else (business name, city, phone) is
  // silently ignored. See parseCsvUrls.ts. True binary .xlsx is
  // deliberately not supported: the only available parser library has
  // unpatched prototype-pollution/ReDoS advisories on npm, and the
  // vendor's patched build isn't reachable from this environment — see
  // AI/DECISIONS.md D39.
  if (contentType.startsWith("multipart/form-data")) {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
    }

    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "A file is required" },
        { status: 400 },
      );
    }
    if (!/\.(csv|tsv|txt)$/i.test(file.name)) {
      return NextResponse.json(
        { error: "Solo file .csv, .tsv o .txt sono supportati" },
        { status: 400 },
      );
    }

    const text = await file.text();
    const cells = extractCellsFromDelimitedText(text).slice(
      0,
      MAX_CELLS_PER_FILE,
    );
    const { queued, invalid } = await queueUrls(cells);
    return NextResponse.json({ queued, invalid });
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

  const { queued, invalid } = await queueUrls(parsed.data.urls);
  return NextResponse.json({ queued, invalid });
}
