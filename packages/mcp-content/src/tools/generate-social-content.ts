import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SocialContentService } from "../services/social-content-service.js";

export function registerGenerateSocialContent(server: McpServer): void {
  server.tool(
    "generate_social_content",
    "Creates platform-native social media content for Twitter/X threads, LinkedIn posts, " +
      "or community replies. Each piece is tailored to the platform's style and audience.",
    {
      topic: z.string().describe("Topic to create content about"),
      platform: z
        .enum(["twitter", "linkedin", "reddit", "indie_hackers", "hacker_news"])
        .describe("Target platform"),
      style: z
        .enum(["thread", "single_post", "reply", "thought_leadership", "educational"])
        .describe("Content style"),
      target_saas_product_id: z
        .string()
        .uuid()
        .optional()
        .describe("SaaS product to subtly reference"),
      lead_magnet_id: z
        .string()
        .uuid()
        .optional()
        .describe("Lead magnet to link to"),
      tone: z
        .enum(["professional", "casual", "technical", "storytelling"])
        .default("professional")
        .describe("Tone of the content"),
    },
    async ({ topic, platform, style, target_saas_product_id, lead_magnet_id, tone }) => {
      const service = new SocialContentService();
      const result = await service.generate({
        topic,
        platform,
        style,
        targetSaasProductId: target_saas_product_id,
        leadMagnetId: lead_magnet_id,
        tone,
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
