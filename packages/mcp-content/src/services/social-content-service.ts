import { getSupabaseClient, generateContent, type Database } from "@prospecting-engine/shared";

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
          content = await this.generateTwitterThread(input.topic, input.tone);
        } else {
          content = await this.generateTweet(input.topic, input.tone);
        }
        hashtags = await this.generateHashtags(input.topic, "twitter");
        break;

      case "linkedin":
        content = await this.generateLinkedInPost(input.topic, input.tone, input.style);
        hashtags = await this.generateHashtags(input.topic, "linkedin");
        break;

      case "reddit":
      case "indie_hackers":
      case "hacker_news":
        content = await this.generateCommunityReply(input.topic, input.platform, input.tone);
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

  private async generateTwitterThread(topic: string, tone: string): Promise<string[]> {
    const placeholder = [
      `🧵 Thread: Everything I've learned about ${topic}\n\nAfter months of research, here are the key insights most people miss:`,
      `1/ [First insight about ${topic}]\n\nThis is the foundation everything else builds on.`,
      `2/ [Second insight about ${topic}]\n\nMost people get this wrong.`,
      `3/ [Third insight about ${topic}]\n\nThis is the counterintuitive part.`,
      `4/ [Practical takeaway]\n\nHere's exactly how to apply this today.`,
      `5/ If you found this helpful, I put together a free resource that goes deeper.\n\n[Link to lead magnet]\n\nRetweet the first tweet to help others find this 🙏`,
    ];

    try {
      const systemPrompt =
        "You are a Twitter/X growth expert who writes viral threads. Write concise, punchy tweets that drive engagement. Each tweet should be under 280 characters. Use hooks, insights, and a clear CTA at the end.";
      const userPrompt =
        `Write a 5-7 tweet thread about "${topic}". Tone: ${tone}.\n` +
        `Return ONLY a JSON array of strings, where each string is one tweet in the thread. No other text.`;

      const response = await generateContent(systemPrompt, userPrompt, {
        maxTokens: 2048,
        temperature: 0.7,
      });

      const parsed = JSON.parse(response.text.trim());
      if (Array.isArray(parsed) && parsed.length > 0 && parsed.every((t: unknown) => typeof t === "string")) {
        return parsed;
      }
      return placeholder;
    } catch {
      return placeholder;
    }
  }

  private async generateTweet(topic: string, tone: string): Promise<string> {
    const placeholder = `[AI-generated tweet about ${topic} with engaging hook and CTA]`;

    try {
      const systemPrompt =
        "You are a Twitter/X growth expert. Write a single, highly engaging tweet that drives likes, retweets, and replies. Maximum 280 characters.";
      const userPrompt = `Write one tweet about "${topic}". Tone: ${tone}. Return ONLY the tweet text, nothing else.`;

      const response = await generateContent(systemPrompt, userPrompt, {
        maxTokens: 256,
        temperature: 0.7,
      });

      const tweet = response.text.trim();
      return tweet.length > 0 && tweet.length <= 280 ? tweet : placeholder;
    } catch {
      return placeholder;
    }
  }

  private async generateLinkedInPost(topic: string, tone: string, style: string): Promise<string> {
    const placeholder =
      `[AI-generated LinkedIn post about ${topic}]\n\n` +
      `Storytelling format with:\n` +
      `- Hook in first line\n` +
      `- Personal anecdote or data point\n` +
      `- 3-5 key insights\n` +
      `- Soft CTA to lead magnet or conversation`;

    try {
      const systemPrompt =
        "You are a LinkedIn content strategist who writes posts that get high engagement. Use the LinkedIn-native format: a strong hook on the first line, short paragraphs, line breaks for readability, and a conversation-starting CTA at the end.";
      const userPrompt =
        `Write a LinkedIn post about "${topic}". Tone: ${tone}. Style: ${style}.\n` +
        `Include a hook, a personal anecdote or data point, 3-5 key insights, and a soft CTA. Return ONLY the post text.`;

      const response = await generateContent(systemPrompt, userPrompt, {
        maxTokens: 2048,
        temperature: 0.7,
      });

      const post = response.text.trim();
      return post.length > 0 ? post : placeholder;
    } catch {
      return placeholder;
    }
  }

  private async generateCommunityReply(topic: string, platform: string, tone: string): Promise<string> {
    const placeholder =
      `[AI-drafted ${platform} reply about ${topic}]\n\n` +
      `⚠️ REQUIRES HUMAN REVIEW before posting.\n\n` +
      `Guidelines:\n` +
      `- Provides genuine, complete answer\n` +
      `- Link to free resource is supplementary, not the goal\n` +
      `- Respects community rules\n` +
      `- 10:1 helpful-to-promotional ratio`;

    try {
      const systemPrompt =
        `You are a helpful community member on ${platform}. Write genuine, value-first replies that follow community rules. ` +
        `Never be overtly promotional. Provide a complete, useful answer. Any mention of external resources should be supplementary and natural, not the focus. ` +
        `Maintain a 10:1 helpful-to-promotional ratio. The reply REQUIRES HUMAN REVIEW before posting.`;
      const userPrompt =
        `Write a community reply about "${topic}" for ${platform}. Tone: ${tone}.\n` +
        `Provide a genuine, helpful answer. Return ONLY the reply text.`;

      const response = await generateContent(systemPrompt, userPrompt, {
        maxTokens: 1024,
        temperature: 0.7,
      });

      const reply = response.text.trim();
      if (reply.length > 0) {
        return `⚠️ REQUIRES HUMAN REVIEW before posting.\n\n${reply}`;
      }
      return placeholder;
    } catch {
      return placeholder;
    }
  }

  private async generateHashtags(topic: string, platform: string): Promise<string[]> {
    const fallbackBase = topic.toLowerCase().replace(/\s+/g, "");
    const fallback =
      platform === "twitter"
        ? [`#${fallbackBase}`, "#buildinpublic", "#saas"]
        : [`#${fallbackBase}`, "#productivity"];

    try {
      const systemPrompt = "You are a social media hashtag expert.";
      const userPrompt =
        `Generate 5-8 relevant hashtags for a ${platform} post about "${topic}". ` +
        `Return only the hashtags, one per line. Each hashtag must start with #.`;

      const response = await generateContent(systemPrompt, userPrompt, {
        maxTokens: 256,
        temperature: 0.7,
      });

      const hashtags = response.text
        .trim()
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.startsWith("#"));

      return hashtags.length > 0 ? hashtags : fallback;
    } catch {
      return fallback;
    }
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
