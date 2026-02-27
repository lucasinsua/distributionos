import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { NurtureTrackService } from "../services/nurture-track-service.js";

export function registerAssignNurtureTrack(server: McpServer): void {
  server.tool(
    "assign_nurture_track",
    "Enrolls a lead in the appropriate nurture sequence based on their assigned SaaS product. " +
      "Handles multi-product leads with portfolio nurture tracks.",
    {
      lead_id: z.string().uuid().describe("ID of the lead to assign"),
      saas_product_id: z
        .string()
        .uuid()
        .optional()
        .describe("Override: specific SaaS product to nurture toward"),
    },
    async ({ lead_id, saas_product_id }) => {
      const service = new NurtureTrackService();
      const result = await service.assign(lead_id, saas_product_id);

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
