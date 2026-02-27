import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ProspectListService } from "../services/prospect-list-service.js";

export function registerBuildProspectList(server: McpServer): void {
  server.tool(
    "build_prospect_list",
    "Finds matching companies and people from public data sources based on ICP criteria. " +
      "Sources include job boards, GitHub, Product Hunt, company websites, Crunchbase, G2 reviews, and social media.",
    {
      icp_criteria: z
        .object({
          industries: z.array(z.string()).optional(),
          company_sizes: z.array(z.string()).optional(),
          roles: z.array(z.string()).optional(),
          tech_stack: z.array(z.string()).optional(),
          geographies: z.array(z.string()).optional(),
          funding_stages: z.array(z.string()).optional(),
          keywords: z.array(z.string()).optional(),
        })
        .describe("ICP criteria to match prospects against"),
      sources: z
        .array(
          z.enum([
            "job_boards",
            "github",
            "product_hunt",
            "company_websites",
            "crunchbase",
            "g2_reviews",
            "twitter",
            "podcasts",
          ])
        )
        .describe("Data sources to search for prospects"),
      saas_product_id: z
        .string()
        .uuid()
        .optional()
        .describe("SaaS product this list is being built for"),
      list_name: z.string().describe("Name for this prospect list"),
      max_prospects: z
        .number()
        .int()
        .min(1)
        .max(500)
        .default(100)
        .describe("Maximum number of prospects to find"),
    },
    async ({ icp_criteria, sources, saas_product_id, list_name, max_prospects }) => {
      const service = new ProspectListService();
      const result = await service.build(
        list_name,
        icp_criteria,
        sources,
        {
          saasProductId: saas_product_id,
          maxProspects: max_prospects,
        }
      );

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                list_id: result.listId,
                list_name,
                sources_searched: sources,
                prospects_found: result.prospectsFound,
                status: result.status,
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
