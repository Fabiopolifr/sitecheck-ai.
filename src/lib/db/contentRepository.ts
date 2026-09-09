import { randomUUID } from "node:crypto";
import { getSupabaseClient, isSupabaseConfigured } from "./supabaseClient";
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

  if (!isSupabaseConfigured()) {
    saveMemoryInsight(record);
    return record;
  }

  const supabase = getSupabaseClient()!;
  const { error } = await supabase.from("content_insights").insert({
    id: record.id,
    industry: record.industry,
    metric: record.metric,
    sample_size: record.sampleSize,
    value: record.value,
    period_start: record.periodStart,
    period_end: record.periodEnd,
    source_query_hash: record.sourceQueryHash,
    created_at: record.createdAt,
  });

  if (error) {
    console.error("Failed to persist content insight to Supabase:", error);
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

  if (!isSupabaseConfigured()) {
    saveMemoryPost(record);
    return record;
  }

  const supabase = getSupabaseClient()!;
  const { error } = await supabase.from("content_posts").insert({
    id: record.id,
    type: record.type,
    source_type: record.sourceType,
    source_reference: record.sourceReference,
    headline: record.headline,
    body: record.body,
    cta: record.cta,
    image_url: record.imageUrl,
    status: record.status,
    scheduled_at: record.scheduledAt,
    published_at: record.publishedAt,
    created_at: record.createdAt,
  });

  if (error) {
    console.error("Failed to persist content post to Supabase:", error);
    saveMemoryPost(record);
  }

  return record;
}

export async function listContentPosts(limit = 100): Promise<ContentPost[]> {
  if (!isSupabaseConfigured()) {
    return listMemoryPosts().slice(0, limit);
  }

  const supabase = getSupabaseClient()!;
  const { data, error } = await supabase
    .from("content_posts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    console.error("Failed to list content posts from Supabase:", error);
    return [];
  }

  return data.map((row) => ({
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
}
