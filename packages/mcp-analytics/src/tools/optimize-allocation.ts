import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { OptimizationService } from "../services/optimization-service.js";

export function registerOptimizeAllocation(server: McpServer): void {
  server.tool(
    "optimize_allocation",
    "Analyzes performance data and recommends resource reallocation to highest-ROI activities. " +
      "Suggests budget shifts, content focus changes, and channel prioritization.",
    {
      lookback_days: z
        .number()
        .int()
        .min(7)
        .max(90)
        .default(30)
        .describe("Days of data to analyze"),
    },
    async ({ lookback_days }) => {
      const service = new OptimizationService();
      const result = await service.optimize(lookback_days);

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
