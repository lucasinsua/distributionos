import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PainPointService } from "../services/pain-point-service.js";

export function registerDiscoverPainPoints(server: McpServer): void {
  server.tool(
    "discover_pain_points",
    "Scrapes forums, Reddit, Twitter, and communities for recurring problems people describe. " +
      "Returns clustered pain points scored by frequency, recency, and alignment with your SaaS products.",
    {
      niche: z.string().describe("The niche or industry to research pain points for"),
      sources: z
        .array(
          z.enum([
            "reddit",
            "hacker_news",
            "twitter",
            "indie_hackers",
            "product_hunt",
            "quora",
            "discord",
            "slack",
          ])
        )
        .describe("Sources to scan for pain points"),
      saas_product_id: z
        .string()
        .uuid()
        .optional()
        .describe("Optional SaaS product ID to score alignment against"),
      max_results: z
        .number()
        .int()
        .min(1)
        .max(50)
        .default(10)
        .describe("Maximum number of pain points to return"),
    },
    async ({ niche, sources, saas_product_id, max_results }) => {
      const service = new PainPointService();
      const painPoints = await service.discover(niche, sources, {
        saasProductId: saas_product_id,
        maxResults: max_results,
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                niche,
                sources_scanned: sources,
                total_found: painPoints.length,
                pain_points: painPoints,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );
}
