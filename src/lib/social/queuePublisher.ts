import type { SocialPublisher, PublishResult } from "./types";

/**
 * Default publisher: does not call any external API. The owner's
 * existing social publishing setup is Metricool, driven through Claude
 * Code's Metricool MCP tools (see the `carosello-freesbe` skill) — an
 * agent-driven workflow, not a service this app's server code should
 * call directly with a guessed HTTP integration (AI/MASTER_SPEC.md §17:
 * "Claude Code should first inspect what integrations or capabilities
 * are actually available... prefer reusing an existing social publishing
 * setup"). This publisher's job is only to mark a post ready for that
 * workflow to pick up from `content_posts` (status stays "queued").
 *
 * If a direct app-to-Metricool integration becomes worthwhile later, a
 * MetricoolPublisher implementing this same interface can replace this
 * one without touching the content generation pipeline — see
 * AI/DECISIONS.md for that trade-off.
 */
export const queuePublisher: SocialPublisher = {
  async publish(post): Promise<PublishResult> {
    console.log("[social queue]", {
      contentPostId: post.contentPostId,
      platform: post.platform,
    });
    return { ok: true };
  },
};
