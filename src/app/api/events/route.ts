import { NextResponse } from "next/server";
import { trackEventSchema } from "@/lib/analytics/events";
import { saveEvent } from "@/lib/db/eventsRepository";
import { isRateLimited } from "@/lib/security/rateLimit";

export const runtime = "nodejs";

function getClientKey(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() || "unknown";
}

export async function POST(request: Request) {
  // Generous limit: this is a public, high-frequency, low-value endpoint —
  // the goal is to stop abuse, not to throttle normal page-view traffic.
  if (isRateLimited(`events:${getClientKey(request)}`, 60)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = trackEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  }

  await saveEvent(parsed.data);

  return NextResponse.json({ ok: true }, { status: 201 });
}
