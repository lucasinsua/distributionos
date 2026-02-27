import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerScoreLead } from "./tools/score-lead.js";
import { registerRouteToSaas } from "./tools/route-to-saas.js";
import { registerAssignNurtureTrack } from "./tools/assign-nurture-track.js";

const server = new McpServer({
  name: "mcp-router",
  version: "0.1.0",
});

registerScoreLead(server);
registerRouteToSaas(server);
registerAssignNurtureTrack(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("mcp-router server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
