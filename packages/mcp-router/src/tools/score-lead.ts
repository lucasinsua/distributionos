import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { LeadScoringService } from "../services/lead-scoring-service.js";

export function registerScoreLead(server: McpServer): void {
  server.tool(
    "score_lead",
    "Calculates a comprehensive qualification score (0-100) for a lead based on " +
      "fit (40%), intent (35%), and engagement (25%) dimensions. Updates the lead record.",
    {
      lead_id: z.string().uuid().describe("ID of the lead to score"),
      force_refresh: z
        .boolean()
        .default(false)
        .describe("Recalculate even if recently scored"),
    },
    async ({ lead_id, force_refresh }) => {
      const service = new LeadScoringService();
      const result = await service.score(lead_id, { forceRefresh: force_refresh });

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
