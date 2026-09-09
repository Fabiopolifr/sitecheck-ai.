import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/config/env";
import { listAudits } from "@/lib/db/auditsRepository";
import {
  saveContentInsight,
  saveContentPost,
} from "@/lib/db/contentRepository";
import { generateContent } from "@/features/content/generate";
import { getScheduledContentType } from "@/features/content/schedule";
import { queuePublisher } from "@/lib/social/queuePublisher";

export const runtime = "nodejs";

const requestSchema = z.object({
  type: z
    .enum([
      "data_insight",
      "educational",
      "problem_pain",
      "quiz",
      "site_score_concept",
      "conversion_cta",
    ])
    .optional(),
});

function isAuthorized(request: Request): boolean {
  if (!env.CONTENT_GENERATION_SECRET) return false;

  const provided = request.headers.get("x-content-secret") ?? "";
  const expected = Buffer.from(env.CONTENT_GENERATION_SECRET);
  const actual = Buffer.from(provided);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/**
 * Meant to be called by an external scheduler (Vercel Cron or similar) —
 * see AI/DECISIONS.md for why this app has no in-process job scheduler.
 * Without a forced `type`, generates whatever AI/MASTER_SPEC.md §16's
 * weekly cadence schedules for today; on an off day, no-ops.
 */
export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    // Empty body is fine — type falls back to today's schedule.
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const type = parsed.data.type ?? getScheduledContentType(new Date());
  if (!type) {
    return NextResponse.json({ skipped: true, reason: "not scheduled today" });
  }

  const audits = await listAudits();
  const { post, insightToSave } = generateContent(type, audits);

  let sourceReference: string | null = null;
  if (insightToSave) {
    const savedInsight = await saveContentInsight(insightToSave);
    sourceReference = savedInsight.id;
  }

  const savedPost = await saveContentPost({ ...post, sourceReference });

  await queuePublisher.publish({
    contentPostId: savedPost.id,
    platform: "instagram",
    text: `${savedPost.headline}\n\n${savedPost.body}`,
    imageUrl: savedPost.imageUrl,
  });

  return NextResponse.json(
    { id: savedPost.id, type: savedPost.type },
    { status: 201 },
  );
}
