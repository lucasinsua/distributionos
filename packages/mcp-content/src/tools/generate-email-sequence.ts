import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { EmailSequenceService } from "../services/email-sequence-service.js";

export function registerGenerateEmailSequence(server: McpServer): void {
  server.tool(
    "generate_email_sequence",
    "Creates a drip email sequence tied to a lead magnet. Supports course delivery, " +
      "nurture sequences, and cold outreach templates. Each email is personalization-ready.",
    {
      lead_magnet_id: z.string().uuid().describe("Lead magnet this sequence delivers"),
      length: z
        .number()
        .int()
        .min(3)
        .max(15)
        .default(5)
        .describe("Number of emails in the sequence"),
      type: z
        .enum(["course", "nurture", "cold"])
        .default("course")
        .describe("Type of email sequence"),
      saas_product_id: z
        .string()
        .uuid()
        .optional()
        .describe("SaaS product for contextual CTAs"),
      include_upsell: z
        .boolean()
        .default(true)
        .describe("Include soft product mention in later emails"),
    },
    async ({ lead_magnet_id, length, type, saas_product_id, include_upsell }) => {
      const service = new EmailSequenceService();
      const result = await service.generate({
        leadMagnetId: lead_magnet_id,
        length,
        type,
        saasProductId: saas_product_id,
        includeUpsell: include_upsell,
      });

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
