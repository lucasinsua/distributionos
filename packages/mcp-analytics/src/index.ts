import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerGetFunnelMetrics } from "./tools/get-funnel-metrics.js";
import { registerGetChannelPerformance } from "./tools/get-channel-performance.js";
import { registerOptimizeAllocation } from "./tools/optimize-allocation.js";
import { registerGenerateReport } from "./tools/generate-report.js";

const server = new McpServer({
  name: "mcp-analytics",
  version: "0.1.0",
});

registerGetFunnelMetrics(server);
registerGetChannelPerformance(server);
registerOptimizeAllocation(server);
registerGenerateReport(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("mcp-analytics server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
