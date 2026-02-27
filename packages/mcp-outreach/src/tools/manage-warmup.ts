import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WarmupService } from "../services/warmup-service.js";

export function registerManageWarmup(server: McpServer): void {
  server.tool(
    "manage_warmup",
    "Manages email warmup for sending domains via Instantly.ai. " +
      "Tracks warmup progress, monitors deliverability, and reports domain readiness.",
    {
      domain: z.string().describe("Sending domain to manage warmup for"),
      action: z
        .enum(["start", "status", "pause", "resume"])
        .default("status")
        .describe("Warmup management action"),
    },
    async ({ domain, action }) => {
      const service = new WarmupService();
      const result = await service.manage(domain, action);

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
