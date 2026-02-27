import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { RoutingService } from "../services/routing-service.js";

export function registerRouteToSaas(server: McpServer): void {
  server.tool(
    "route_to_saas",
    "Matches a lead to the best SaaS product based on their profile, behavior, and enrichment data. " +
      "Uses primary (lead magnet consumed), secondary (ICP match), and tertiary (behavioral) signals.",
    {
      lead_id: z.string().uuid().describe("ID of the lead to route"),
    },
    async ({ lead_id }) => {
      const service = new RoutingService();
      const result = await service.route(lead_id);

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
