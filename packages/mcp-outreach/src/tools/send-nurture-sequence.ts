import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { NurtureService } from "../services/nurture-service.js";

export function registerSendNurtureSequence(server: McpServer): void {
  server.tool(
    "send_nurture_sequence",
    "Enrolls a lead in a warm nurture sequence via Loops.so or ConvertKit. " +
      "Handles deduplication and sequence conflicts.",
    {
      lead_id: z.string().uuid().describe("ID of the lead to enroll"),
      sequence_id: z.string().uuid().describe("ID of the email sequence to enroll in"),
      skip_if_active: z
        .boolean()
        .default(true)
        .describe("Skip enrollment if lead is already in an active sequence"),
    },
    async ({ lead_id, sequence_id, skip_if_active }) => {
      const service = new NurtureService();
      const result = await service.enroll(lead_id, sequence_id, { skipIfActive: skip_if_active });

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
