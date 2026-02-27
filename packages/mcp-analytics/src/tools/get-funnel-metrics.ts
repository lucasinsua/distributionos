import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { FunnelService } from "../services/funnel-service.js";

export function registerGetFunnelMetrics(server: McpServer): void {
  server.tool(
    "get_funnel_metrics",
    "Returns conversion data per funnel stage for a given date range. " +
      "Tracks leads from first touch through qualification to conversion.",
    {
      start_date: z.string().describe("Start date (ISO 8601)"),
      end_date: z.string().describe("End date (ISO 8601)"),
      saas_product_id: z
        .string()
        .uuid()
        .optional()
        .describe("Filter by SaaS product (all products if not specified)"),
    },
    async ({ start_date, end_date, saas_product_id }) => {
      const service = new FunnelService();
      const result = await service.getMetrics(start_date, end_date, saas_product_id);

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
