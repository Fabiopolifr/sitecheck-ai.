import { randomUUID } from "node:crypto";
import { getPool, isDatabaseConfigured } from "./pgClient";
import {
  saveContentPost as saveMemoryPost,
  listContentPosts as listMemoryPosts,
  saveContentInsight as saveMemoryInsight,
} from "./memoryContentStore";
import type {
  ContentInsight,
  ContentPost,
  NewContentInsight,
  NewContentPost,
} from "@/features/content/types";

export async function saveContentInsight(
  insight: NewContentInsight,
): Promise<ContentInsight> {
  const record: ContentInsight = {
    id: randomUUID(),
    ...insight,
    createdAt: new Date().toISOString(),
  };

  if (!isDatabaseConfigured()) {
    saveMemoryInsight(record);
    return record;
  }

  const pool = getPool()!;

  try {
    await pool.query(
      `insert into content_insights
        (id, industry, metric, sample_size, value, period_start, period_end, source_query_hash, created_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        record.id,
        record.industry,
        record.metric,
        record.sampleSize,
        record.value,
        record.periodStart,
        record.periodEnd,
        record.sourceQueryHash,
        record.createdAt,
      ],
    );
  } catch (error) {
    console.error("Failed to persist content insight to Postgres:", error);
    saveMemoryInsight(record);
  }

  return record;
}

export async function saveContentPost(
  post: NewContentPost,
): Promise<ContentPost> {
  const record: ContentPost = {
    id: randomUUID(),
    status: post.status ?? "queued",
    scheduledAt: post.scheduledAt ?? null,
    publishedAt: null,
    createdAt: new Date().toISOString(),
    ...post,
  };

  if (!isDatabaseConfigured()) {
    saveMemoryPost(record);
    return record;
  }

  const pool = getPool()!;

  try {
    await pool.query(
      `insert into content_posts
        (id, type, source_type, source_reference, headline, body, cta, image_url,
         status, scheduled_at, published_at, created_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        record.id,
        record.type,
        record.sourceType,
        record.sourceReference,
        record.headline,
        record.body,
        record.cta,
        record.imageUrl,
        record.status,
        record.scheduledAt,
        record.publishedAt,
        record.createdAt,
      ],
    );
  } catch (error) {
    console.error("Failed to persist content post to Postgres:", error);
    saveMemoryPost(record);
  }

  return record;
}

export async function listContentPosts(limit = 100): Promise<ContentPost[]> {
  if (!isDatabaseConfigured()) {
    return listMemoryPosts().slice(0, limit);
  }

  const pool = getPool()!;

  try {
    const result = await pool.query(
      "select * from content_posts order by created_at desc limit $1",
      [limit],
    );

    return result.rows.map((row) => ({
      id: row.id,
      type: row.type,
      sourceType: row.source_type,
      sourceReference: row.source_reference,
      headline: row.headline,
      body: row.body,
      cta: row.cta,
      imageUrl: row.image_url,
      status: row.status,
      scheduledAt: row.scheduled_at,
      publishedAt: row.published_at,
      createdAt: row.created_at,
    }));
  } catch (error) {
    console.error("Failed to list content posts from Postgres:", error);
    return [];
  }
}
