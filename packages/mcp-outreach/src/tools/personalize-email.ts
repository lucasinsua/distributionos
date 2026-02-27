import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PersonalizationService } from "../services/personalization-service.js";

export function registerPersonalizeEmail(server: McpServer): void {
  server.tool(
    "personalize_email",
    "Generates hyper-personalized email copy for a specific lead using their company context, " +
      "personal activity, pain points, and timing signals. Feels hand-written, not templated.",
    {
      lead_id: z.string().uuid().describe("ID of the lead to personalize for"),
      template: z
        .string()
        .describe("Base email template with {{placeholders}} for personalization"),
      personalization_depth: z
        .enum(["light", "medium", "deep"])
        .default("medium")
        .describe("How deeply to research and personalize"),
    },
    async ({ lead_id, template, personalization_depth }) => {
      const service = new PersonalizationService();
      const result = await service.personalize(lead_id, template, personalization_depth);

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
