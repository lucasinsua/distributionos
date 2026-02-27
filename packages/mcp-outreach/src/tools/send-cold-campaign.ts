import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ColdCampaignService } from "../services/cold-campaign-service.js";

export function registerSendColdCampaign(server: McpServer): void {
  server.tool(
    "send_cold_campaign",
    "Sends personalized cold emails to a prospect list via Instantly.ai. " +
      "Handles domain rotation, warmup compliance, and deliverability monitoring.",
    {
      prospect_list_id: z.string().uuid().describe("ID of the prospect list to email"),
      template_id: z
        .string()
        .uuid()
        .optional()
        .describe("Email sequence template ID (auto-generates if not provided)"),
      daily_limit: z
        .number()
        .int()
        .min(5)
        .max(50)
        .default(25)
        .describe("Max emails per day per domain"),
      sending_domains: z
        .array(z.string())
        .optional()
        .describe("Domains to send from (uses all warmed domains if not specified)"),
      start_immediately: z
        .boolean()
        .default(false)
        .describe("Start sending now or schedule for next business day"),
    },
    async ({ prospect_list_id, template_id, daily_limit, sending_domains, start_immediately }) => {
      const service = new ColdCampaignService();
      const result = await service.launch({
        prospectListId: prospect_list_id,
        templateId: template_id,
        dailyLimit: daily_limit,
        sendingDomains: sending_domains,
        startImmediately: start_immediately,
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
