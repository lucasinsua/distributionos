import { getSupabaseClient, type Database } from "@prospecting-engine/shared";

type ContentRow = Database["public"]["Tables"]["content"]["Row"];

interface GenerateInput {
  topic: string;
  platform: string;
  style: string;
  targetSaasProductId?: string;
  leadMagnetId?: string;
  tone: string;
}

interface GenerateResult {
  contentId: string;
  platform: string;
  style: string;
  content: string | string[]; // string[] for threads
  hashtags: string[];
  estimatedReach: string;
  status: string;
}

export class SocialContentService {
  /**
   * Generates platform-native social content.
   *
   * Twitter/X: threads, single posts, quote tweets
   * LinkedIn: thought leadership posts, storytelling
   * Reddit/HN/IH: community replies (require human approval)
   */
  async generate(input: GenerateInput): Promise<GenerateResult> {
    const db = getSupabaseClient();

    let content: string | string[];
    let hashtags: string[] = [];

    switch (input.platform) {
      case "twitter":
        if (input.style === "thread") {
          content = this.generateTwitterThread(input.topic, input.tone);
        } else {
          content = this.generateTweet(input.topic, input.tone);
        }
        hashtags = this.generateHashtags(input.topic, "twitter");
        break;

      case "linkedin":
        content = this.generateLinkedInPost(input.topic, input.tone, input.style);
        hashtags = this.generateHashtags(input.topic, "linkedin");
        break;

      case "reddit":
      case "indie_hackers":
      case "hacker_news":
        content = this.generateCommunityReply(input.topic, input.platform, input.tone);
        break;

      default:
        content = `[Content about ${input.topic} for ${input.platform}]`;
    }

    // Determine if this needs human review (community posts always do)
    const needsReview = ["reddit", "indie_hackers", "hacker_news"].includes(input.platform);

    // Store content
    const { data: record, error } = await db
      .from("content")
      .insert({
        type: input.style === "reply" ? "community_reply" : "social_post",
        title: `${input.platform}: ${input.topic}`,
        body: Array.isArray(content) ? content.join("\n\n---\n\n") : content,
        platform: input.platform,
        saas_product_id: input.targetSaasProductId ?? null,
        status: needsReview ? "pending_review" : "draft",
      })
      .select()
      .returns<ContentRow[]>()
      .single();

    if (error || !record) {
      throw new Error(`Failed to store content: ${error?.message}`);
    }

    return {
      contentId: record.id,
      platform: input.platform,
      style: input.style,
      content,
      hashtags,
      estimatedReach: this.estimateReach(input.platform, input.style),
      status: needsReview ? "pending_review" : "draft",
    };
  }

  private generateTwitterThread(topic: string, tone: string): string[] {
    // In production: Claude API generates a 5-10 tweet thread
    return [
      `🧵 Thread: Everything I've learned about ${topic}\n\nAfter months of research, here are the key insights most people miss:`,
      `1/ [First insight about ${topic}]\n\nThis is the foundation everything else builds on.`,
      `2/ [Second insight about ${topic}]\n\nMost people get this wrong.`,
      `3/ [Third insight about ${topic}]\n\nThis is the counterintuitive part.`,
      `4/ [Practical takeaway]\n\nHere's exactly how to apply this today.`,
      `5/ If you found this helpful, I put together a free resource that goes deeper.\n\n[Link to lead magnet]\n\nRetweet the first tweet to help others find this 🙏`,
    ];
  }

  private generateTweet(topic: string, _tone: string): string {
    return `[AI-generated tweet about ${topic} with engaging hook and CTA]`;
  }

  private generateLinkedInPost(topic: string, _tone: string, _style: string): string {
    return `[AI-generated LinkedIn post about ${topic}]\n\n` +
      `Storytelling format with:\n` +
      `- Hook in first line\n` +
      `- Personal anecdote or data point\n` +
      `- 3-5 key insights\n` +
      `- Soft CTA to lead magnet or conversation`;
  }

  private generateCommunityReply(topic: string, platform: string, _tone: string): string {
    return `[AI-drafted ${platform} reply about ${topic}]\n\n` +
      `⚠️ REQUIRES HUMAN REVIEW before posting.\n\n` +
      `Guidelines:\n` +
      `- Provides genuine, complete answer\n` +
      `- Link to free resource is supplementary, not the goal\n` +
      `- Respects community rules\n` +
      `- 10:1 helpful-to-promotional ratio`;
  }

  private generateHashtags(topic: string, platform: string): string[] {
    // In production: research trending and relevant hashtags
    const base = topic.toLowerCase().replace(/\s+/g, "");
    if (platform === "twitter") {
      return [`#${base}`, "#buildinpublic", "#saas"];
    }
    return [`#${base}`, "#productivity"];
  }

  private estimateReach(platform: string, style: string): string {
    const estimates: Record<string, string> = {
      twitter_thread: "500-5,000 impressions",
      twitter_single_post: "200-2,000 impressions",
      linkedin_thought_leadership: "1,000-10,000 impressions",
      reddit_reply: "50-500 views",
    };
    return estimates[`${platform}_${style}`] ?? "Varies";
  }
}
