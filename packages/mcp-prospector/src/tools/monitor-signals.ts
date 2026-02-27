import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SignalMonitorService } from "../services/signal-monitor-service.js";

export function registerMonitorSignals(server: McpServer): void {
  server.tool(
    "monitor_signals",
    "Watches for buying signals in real-time across configured channels. " +
      "Detects job postings, funding events, tech adoption, competitor mentions, and pain point expressions.",
    {
      keywords: z.array(z.string()).describe("Keywords to monitor across channels"),
      channels: z
        .array(
          z.enum([
            "reddit",
            "twitter",
            "hacker_news",
            "job_boards",
            "crunchbase",
            "g2_reviews",
            "product_hunt",
            "github",
          ])
        )
        .describe("Channels to monitor for signals"),
      signal_types: z
        .array(
          z.enum([
            "job_posting",
            "funding_event",
            "tech_adoption",
            "competitor_mention",
            "pain_point_expression",
            "product_launch",
            "review_complaint",
            "social_mention",
          ])
        )
        .optional()
        .describe("Types of signals to look for (all if not specified)"),
      since_hours: z
        .number()
        .int()
        .min(1)
        .max(168)
        .default(24)
        .describe("Look back this many hours for signals"),
    },
    async ({ keywords, channels, signal_types, since_hours }) => {
      const service = new SignalMonitorService();
      const signals = await service.monitor(keywords, channels, {
        signalTypes: signal_types,
        sinceHours: since_hours,
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                keywords,
                channels_monitored: channels,
                time_window_hours: since_hours,
                total_signals: signals.length,
                signals,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );
}
