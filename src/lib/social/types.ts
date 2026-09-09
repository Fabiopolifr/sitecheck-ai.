export type SocialPost = {
  contentPostId: string;
  platform: string;
  text: string;
  imageUrl?: string | null;
};

export type PublishResult =
  { ok: true; externalId?: string } | { ok: false; error: string };

export interface SocialPublisher {
  publish(post: SocialPost): Promise<PublishResult>;
  schedule?(post: SocialPost, at: Date): Promise<PublishResult>;
}
