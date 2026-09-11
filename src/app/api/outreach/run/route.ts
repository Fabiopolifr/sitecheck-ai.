import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/config/env";
import { runOutreachBatch } from "@/features/outreach/runOutreachBatch";
import { isOutreachPaused } from "@/features/outreach/pause";
import { recordOutreachRun } from "@/features/outreach/lastRun";

export const runtime = "nodejs";

const requestSchema = z.object({
  discoveryQueries: z.array(z.string().min(1)).max(20).optional(),
  manualPerDay: z.number().int().min(0).max(100).optional(),
  discoveryPerDay: z.number().int().min(0).max(50).optional(),
  followUpPerDay: z.number().int().min(0).max(100).optional(),
});

function isAuthorized(request: Request): boolean {
  if (!env.OUTREACH_SECRET) return false;

  const provided = request.headers.get("x-outreach-secret") ?? "";
  const expected = Buffer.from(env.OUTREACH_SECRET);
  const actual = Buffer.from(provided);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/**
 * Meant to be called by an external scheduler (Hostinger Cloud Startup has
 * no cron — see AI/DECISIONS.md D37 for the recommended free pinger
 * setup), same pattern as /api/content/generate. Runs the daily outreach
 * batch: the manual queue (up to manualPerDay) plus Google Maps discovery
 * (up to discoveryPerDay per query).
 */
export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    // Empty body is fine — falls back to defaults.
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Registrata anche quando in pausa: serve a sapere che lo scheduler è
  // vivo, distinguendo "fermo per scelta" da "fermo perché il cronjob
  // non chiama più" (AI/DECISIONS.md D52).
  if (await isOutreachPaused()) {
    await recordOutreachRun({ paused: true, summary: null });
    return NextResponse.json({ paused: true });
  }

  const summary = await runOutreachBatch(parsed.data);
  await recordOutreachRun({ paused: false, summary });
  return NextResponse.json(summary);
}
