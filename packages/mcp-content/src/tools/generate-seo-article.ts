import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SeoArticleService } from "../services/seo-article-service.js";

export function registerGenerateSeoArticle(server: McpServer): void {
  server.tool(
    "generate_seo_article",
    "Writes and publishes an SEO-optimized long-form article (1,500-3,000 words) targeting " +
      "a specific keyword. Includes meta tags, Open Graph data, schema markup, and internal links. " +
      "Can cross-post to Medium, Dev.to, and Hashnode with canonical URLs.",
    {
      keyword: z.string().describe("Primary SEO keyword to target"),
      target_saas_product_id: z
        .string()
        .uuid()
        .describe("SaaS product this article should funnel toward"),
      word_count: z
        .number()
        .int()
        .min(500)
        .max(5000)
        .default(2000)
        .describe("Target word count"),
      lead_magnet_id: z
        .string()
        .uuid()
        .optional()
        .describe("Lead magnet to CTA within the article"),
      cross_post: z
        .array(z.enum(["medium", "devto", "hashnode"]))
        .default([])
        .describe("Platforms to cross-post to"),
      publish_immediately: z
        .boolean()
        .default(false)
        .describe("Publish immediately or save as draft"),
    },
    async ({ keyword, target_saas_product_id, word_count, lead_magnet_id, cross_post, publish_immediately }) => {
      const service = new SeoArticleService();
      const result = await service.generate({
        keyword,
        targetSaasProductId: target_saas_product_id,
        wordCount: word_count,
        leadMagnetId: lead_magnet_id,
        crossPost: cross_post,
        publishImmediately: publish_immediately,
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );
}
