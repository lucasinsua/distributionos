import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { EnrichmentService } from "../services/enrichment-service.js";

export function registerEnrichLead(server: McpServer): void {
  server.tool(
    "enrich_lead",
    "Enriches a lead or company with data from Hunter.io, Clearbit, Clay, and public sources. " +
      "Returns company size, tech stack, role, funding info, and social profiles.",
    {
      email: z.string().email().optional().describe("Email address to enrich"),
      domain: z.string().optional().describe("Company domain to enrich"),
      lead_id: z.string().uuid().optional().describe("Existing lead ID to update with enrichment data"),
    },
    async ({ email, domain, lead_id }) => {
      if (!email && !domain) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ error: "Either email or domain must be provided" }),
            },
          ],
          isError: true,
        };
      }

      const service = new EnrichmentService();
      const enrichment = await service.enrich({ email, domain, leadId: lead_id });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(enrichment, null, 2),
          },
        ],
      };
    }
  );
}
