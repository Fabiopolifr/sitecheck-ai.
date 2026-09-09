import type { ContentInsight, ContentPost } from "@/features/content/types";

const globalForStore = globalThis as unknown as {
  __siteCheckContentPosts?: Map<string, ContentPost>;
  __siteCheckContentInsights?: Map<string, ContentInsight>;
};

const posts =
  globalForStore.__siteCheckContentPosts ?? new Map<string, ContentPost>();
globalForStore.__siteCheckContentPosts = posts;

const insights =
  globalForStore.__siteCheckContentInsights ??
  new Map<string, ContentInsight>();
globalForStore.__siteCheckContentInsights = insights;

export function saveContentPost(post: ContentPost): void {
  posts.set(post.id, post);
}

export function listContentPosts(): ContentPost[] {
  return [...posts.values()].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

export function saveContentInsight(insight: ContentInsight): void {
  insights.set(insight.id, insight);
}
