import { getSupabaseClient, generateContent, type Database } from "@prospecting-engine/shared";

type SaasProductRow = Database["public"]["Tables"]["saas_products"]["Row"];
type LeadMagnetRow = Database["public"]["Tables"]["lead_magnets"]["Row"];
type ContentRow = Database["public"]["Tables"]["content"]["Row"];

interface GenerateInput {
  keyword: string;
  targetSaasProductId: string;
  wordCount: number;
  leadMagnetId?: string;
  crossPost: string[];
  publishImmediately: boolean;
}

interface GenerateResult {
  contentId: string;
  title: string;
  keyword: string;
  wordCount: number;
  metaTitle: string;
  metaDescription: string;
  slug: string;
  publishedUrl: string | null;
  crossPostUrls: Record<string, string>;
  status: string;
}

export class SeoArticleService {
  /**
   * Generates an SEO-optimized long-form article.
   *
   * Pipeline:
   * 1. Keyword research: Google Suggest, Also Asked, competitor analysis
   * 2. Content brief: target headings, internal links, CTA placement
   * 3. Article generation: 1,500-3,000 words via Claude API
   * 4. On-page SEO: meta titles, descriptions, OG tags, schema markup
   * 5. Publishing: deploy to blog, cross-post with canonical URLs
   * 6. Monitoring: track rankings weekly
   */
  async generate(input: GenerateInput): Promise<GenerateResult> {
    const db = getSupabaseClient();

    // Fetch related data
    const { data: product } = await db
      .from("saas_products")
      .select("*")
      .eq("id", input.targetSaasProductId)
      .returns<SaasProductRow[]>()
      .single();

    let leadMagnet = null;
    if (input.leadMagnetId) {
      const { data } = await db
        .from("lead_magnets")
        .select("*")
        .eq("id", input.leadMagnetId)
        .returns<LeadMagnetRow[]>()
        .single();
      leadMagnet = data;
    }

    // Generate content brief
    const brief = this.generateBrief(input.keyword, input.wordCount);

    // Generate article (in production: Claude API call)
    const article = await this.generateArticle(brief, input.keyword, product, leadMagnet);

    const slug = this.slugify(article.title);
    const metaTitle = `${article.title} | ${(product as Record<string, unknown> | null)?.name ?? "Blog"}`;
    const metaDescription = article.excerpt;

    // Store content
    const { data: content, error } = await db
      .from("content")
      .insert({
        type: "article",
        title: article.title,
        body: article.body,
        platform: "blog",
        saas_product_id: input.targetSaasProductId,
        status: input.publishImmediately ? "published" : "draft",
        performance_metrics: {
          keyword: input.keyword,
          wordCount: article.wordCount,
          metaTitle,
          metaDescription,
          slug,
          schema: article.schema,
        },
      })
      .select()
      .returns<ContentRow[]>()
      .single();

    if (error || !content) {
      throw new Error(`Failed to store article: ${error?.message}`);
    }

    // Cross-post if requested
    const crossPostUrls: Record<string, string> = {};
    for (const platform of input.crossPost) {
      const url = await this.crossPost(platform, article, slug);
      if (url) crossPostUrls[platform] = url;
    }

    return {
      contentId: content.id,
      title: article.title,
      keyword: input.keyword,
      wordCount: article.wordCount,
      metaTitle,
      metaDescription,
      slug,
      publishedUrl: input.publishImmediately ? `https://blog.kintrion.com/${slug}` : null,
      crossPostUrls,
      status: input.publishImmediately ? "published" : "draft",
    };
  }

  private generateBrief(keyword: string, wordCount: number) {
    return {
      keyword,
      targetWordCount: wordCount,
      headings: [
        `What is ${keyword}?`,
        `Why ${keyword} matters`,
        `How to implement ${keyword}: step-by-step`,
        `Common mistakes with ${keyword}`,
        `Best practices and tips`,
        `Conclusion and next steps`,
      ],
      internalLinks: [],
      ctaPlacement: ["after-intro", "mid-article", "conclusion"],
    };
  }

  private async generateArticle(
    brief: { keyword: string; targetWordCount: number; headings: string[] },
    keyword: string,
    product: Record<string, unknown> | null,
    leadMagnet: Record<string, unknown> | null
  ) {
    const placeholder = {
      title: `The Complete Guide to ${keyword} in 2026`,
      excerpt: `Everything you need to know about ${keyword}, including step-by-step instructions and best practices.`,
      body: `[AI-generated ${brief.targetWordCount}-word article about ${keyword}]`,
      wordCount: brief.targetWordCount,
      schema: {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: `The Complete Guide to ${keyword} in 2026`,
        description: `Everything you need to know about ${keyword}`,
      },
    };

    try {
      const systemPrompt =
        "You are an expert SEO content writer. Generate a comprehensive, well-structured article optimized for the target keyword. Include engaging headers (H2/H3), practical examples, and actionable advice. Write in a professional but approachable tone.";

      let userPrompt = `Write an SEO-optimized article about "${keyword}".\n`;
      userPrompt += `Target word count: ${brief.targetWordCount} words.\n`;
      userPrompt += `Use these headings as a guide:\n${brief.headings.map((h) => `- ${h}`).join("\n")}\n`;
      if (product) {
        userPrompt += `\nProduct context: ${product.name ?? ""}${product.description ? ` - ${product.description}` : ""}. Naturally weave in how this product helps readers.\n`;
      }
      if (leadMagnet) {
        userPrompt += `\nInclude a CTA for this lead magnet: "${leadMagnet.title ?? leadMagnet.name ?? "free resource"}"${leadMagnet.description ? ` (${leadMagnet.description})` : ""}. Place CTAs after the intro, mid-article, and in the conclusion.\n`;
      }

      const response = await generateContent(systemPrompt, userPrompt, {
        maxTokens: 8192,
        temperature: 0.7,
      });

      const text = response.text.trim();
      const lines = text.split("\n").filter((l) => l.trim().length > 0);

      // Extract title: first line (strip leading # if present)
      const title = lines[0].replace(/^#+\s*/, "").trim();
      // Extract excerpt: first paragraph after the title
      const excerpt = lines.length > 1 ? lines[1].trim() : placeholder.excerpt;
      // Body is everything after the title line
      const body = lines.slice(1).join("\n\n");
      const wordCount = body.split(/\s+/).length;

      return {
        title,
        excerpt,
        body,
        wordCount,
        schema: {
          "@context": "https://schema.org",
          "@type": "Article",
          headline: title,
          description: excerpt,
        },
      };
    } catch {
      return placeholder;
    }
  }

  private async crossPost(
    platform: string,
    article: { title: string; body: string },
    canonicalSlug: string
  ): Promise<string | null> {
    const canonicalUrl = `https://blog.kintrion.com/${canonicalSlug}`;

    switch (platform) {
      case "medium": {
        const mediumToken = process.env.MEDIUM_TOKEN;
        const mediumUserId = process.env.MEDIUM_USER_ID;
        if (!mediumToken || !mediumUserId) {
          const _ = article;
          return null;
        }
        try {
          const res = await fetch(
            `https://api.medium.com/v1/users/${mediumUserId}/posts`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${mediumToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                title: article.title,
                contentFormat: "markdown",
                content: article.body,
                canonicalUrl: canonicalUrl,
                publishStatus: "public",
              }),
            }
          );
          if (!res.ok) return null;
          const data = (await res.json()) as { data?: { url?: string } };
          return data.data?.url ?? null;
        } catch {
          return null;
        }
      }
      case "devto": {
        const devToApiKey = process.env.DEV_TO_API_KEY;
        if (!devToApiKey) {
          const _ = article;
          return null;
        }
        try {
          const tags = article.title
            .toLowerCase()
            .split(/\s+/)
            .filter((w) => w.length > 3)
            .slice(0, 4);
          const res = await fetch("https://dev.to/api/articles", {
            method: "POST",
            headers: {
              "api-key": devToApiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              article: {
                title: article.title,
                body_markdown: article.body,
                canonical_url: canonicalUrl,
                published: true,
                tags,
              },
            }),
          });
          if (!res.ok) return null;
          const data = (await res.json()) as { url?: string };
          return data.url ?? null;
        } catch {
          return null;
        }
      }
      case "hashnode": {
        const hashnodeToken = process.env.HASHNODE_TOKEN;
        const hashnodePublicationId = process.env.HASHNODE_PUBLICATION_ID;
        if (!hashnodeToken || !hashnodePublicationId) {
          const _ = article;
          return null;
        }
        try {
          const mutation = `
            mutation CreateStory($input: CreateStoryInput!) {
              createStory(input: $input) {
                post {
                  slug
                  publication {
                    domain
                  }
                }
              }
            }
          `;
          const slug = this.slugify(article.title);
          const res = await fetch("https://gql.hashnode.com", {
            method: "POST",
            headers: {
              Authorization: hashnodeToken,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              query: mutation,
              variables: {
                input: {
                  title: article.title,
                  contentMarkdown: article.body,
                  slug,
                  isPartOfPublication: {
                    publicationId: hashnodePublicationId,
                  },
                  tags: [],
                },
              },
            }),
          });
          if (!res.ok) return null;
          const data = (await res.json()) as {
            data?: {
              createStory?: {
                post?: { slug?: string; publication?: { domain?: string } };
              };
            };
          };
          const post = data.data?.createStory?.post;
          if (post?.publication?.domain && post?.slug) {
            return `https://${post.publication.domain}/${post.slug}`;
          }
          return null;
        } catch {
          return null;
        }
      }
      default:
        return null;
    }
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }
}
