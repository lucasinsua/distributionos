import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ReportService } from "../services/report-service.js";

export function registerGenerateReport(server: McpServer): void {
  server.tool(
    "generate_report",
    "Produces formatted weekly or monthly performance reports. " +
      "Includes funnel metrics, channel performance, lead quality, and recommendations.",
    {
      type: z.enum(["weekly", "monthly"]).describe("Report type"),
      start_date: z.string().describe("Report period start date (ISO 8601)"),
      end_date: z.string().describe("Report period end date (ISO 8601)"),
      format: z
        .enum(["markdown", "html", "json"])
        .default("markdown")
        .describe("Output format"),
    },
    async ({ type, start_date, end_date, format }) => {
      const service = new ReportService();
      const result = await service.generate(type, start_date, end_date, format);

      return {
        content: [
          {
            type: "text" as const,
            text: result,
          },
        ],
      };
    }
  );
}
