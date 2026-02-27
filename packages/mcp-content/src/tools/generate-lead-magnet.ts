import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { LeadMagnetService } from "../services/lead-magnet-service.js";

export function registerGenerateLeadMagnet(server: McpServer): void {
  server.tool(
    "generate_lead_magnet",
    "Creates a complete lead magnet (email course, PDF guide, interactive tool, or template pack) " +
      "based on pain-point research. Generates all content and stores it for deployment.",
    {
      topic: z.string().describe("The topic/pain point this lead magnet addresses"),
      format: z
        .enum(["email_course", "pdf_guide", "interactive_tool", "template_pack", "mini_saas"])
        .describe("Format of the lead magnet"),
      target_saas_product_id: z
        .string()
        .uuid()
        .describe("ID of the SaaS product this lead magnet feeds into"),
      title: z.string().optional().describe("Custom title (auto-generated if not provided)"),
      course_length: z
        .number()
        .int()
        .min(3)
        .max(10)
        .default(5)
        .describe("Number of lessons/days for email courses"),
      target_audience: z
        .string()
        .optional()
        .describe("Description of the target audience for content tone"),
    },
    async ({ topic, format, target_saas_product_id, title, course_length, target_audience }) => {
      const service = new LeadMagnetService();
      const result = await service.generate({
        topic,
        format,
        targetSaasProductId: target_saas_product_id,
        title,
        courseLength: course_length,
        targetAudience: target_audience,
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
