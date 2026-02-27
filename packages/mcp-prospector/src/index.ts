import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerDiscoverPainPoints } from "./tools/discover-pain-points.js";
import { registerBuildProspectList } from "./tools/build-prospect-list.js";
import { registerEnrichLead } from "./tools/enrich-lead.js";
import { registerMonitorSignals } from "./tools/monitor-signals.js";

const server = new McpServer({
  name: "mcp-prospector",
  version: "0.1.0",
});

// Register all tools
registerDiscoverPainPoints(server);
registerBuildProspectList(server);
registerEnrichLead(server);
registerMonitorSignals(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("mcp-prospector server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
