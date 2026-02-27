import { getSupabaseClient } from "@prospecting-engine/shared";

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
      .single();

    let leadMagnet = null;
    if (input.leadMagnetId) {
      const { data } = await db
        .from("lead_magnets")
        .select("*")
        .eq("id", input.leadMagnetId)
        .single();
      leadMagnet = data;
    }

    // Generate content brief
    const brief = this.generateBrief(input.keyword, input.wordCount);

    // Generate article (in production: Claude API call)
    const article = this.generateArticle(brief, input.keyword, product, leadMagnet);

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
      publishedUrl: input.publishImmediately ? `https://blog.yourdomain.com/${slug}` : null,
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

  private generateArticle(
    brief: { keyword: string; targetWordCount: number; headings: string[] },
    keyword: string,
    _product: Record<string, unknown> | null,
    _leadMagnet: Record<string, unknown> | null
  ) {
    // In production: call Claude API with the brief to generate full article
    return {
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
  }

  private async crossPost(
    platform: string,
    article: { title: string; body: string },
    canonicalSlug: string
  ): Promise<string | null> {
    const canonicalUrl = `https://blog.yourdomain.com/${canonicalSlug}`;

    switch (platform) {
      case "medium":
        // Medium API: POST https://api.medium.com/v1/users/{userId}/posts
        return null; // TODO: implement
      case "devto":
        // Dev.to API: POST https://dev.to/api/articles
        return null; // TODO: implement
      case "hashnode":
        // Hashnode GraphQL API
        return null; // TODO: implement
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
