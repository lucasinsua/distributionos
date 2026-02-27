import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ChannelPerformanceService } from "../services/channel-performance-service.js";

export function registerGetChannelPerformance(server: McpServer): void {
  server.tool(
    "get_channel_performance",
    "Returns ROI and performance metrics per acquisition channel. " +
      "Compares SEO, social, community, cold email, and paid channels.",
    {
      start_date: z.string().describe("Start date (ISO 8601)"),
      end_date: z.string().describe("End date (ISO 8601)"),
    },
    async ({ start_date, end_date }) => {
      const service = new ChannelPerformanceService();
      const result = await service.getPerformance(start_date, end_date);

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
