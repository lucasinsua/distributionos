import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerSendColdCampaign } from "./tools/send-cold-campaign.js";
import { registerSendNurtureSequence } from "./tools/send-nurture-sequence.js";
import { registerPersonalizeEmail } from "./tools/personalize-email.js";
import { registerManageWarmup } from "./tools/manage-warmup.js";

const server = new McpServer({
  name: "mcp-outreach",
  version: "0.1.0",
});

registerSendColdCampaign(server);
registerSendNurtureSequence(server);
registerPersonalizeEmail(server);
registerManageWarmup(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("mcp-outreach server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
