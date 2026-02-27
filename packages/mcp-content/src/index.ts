import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerGenerateLeadMagnet } from "./tools/generate-lead-magnet.js";
import { registerGenerateLandingPage } from "./tools/generate-landing-page.js";
import { registerGenerateSeoArticle } from "./tools/generate-seo-article.js";
import { registerGenerateSocialContent } from "./tools/generate-social-content.js";
import { registerGenerateEmailSequence } from "./tools/generate-email-sequence.js";

const server = new McpServer({
  name: "mcp-content",
  version: "0.1.0",
});

// Register all tools
registerGenerateLeadMagnet(server);
registerGenerateLandingPage(server);
registerGenerateSeoArticle(server);
registerGenerateSocialContent(server);
registerGenerateEmailSequence(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("mcp-content server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
