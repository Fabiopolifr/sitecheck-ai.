import { NextResponse } from "next/server";
import { z } from "zod";
import { runAudit } from "@/features/audit/runAudit";
import { saveAudit } from "@/lib/db/memoryAuditStore";
import { isRateLimited } from "@/lib/security/rateLimit";

export const runtime = "nodejs";

const requestSchema = z.object({
  url: z.string().min(1).max(2048),
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

  const result = await runAudit(parsed.data.url);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  saveAudit(result.audit);

  return NextResponse.json({ id: result.audit.id }, { status: 201 });
}
