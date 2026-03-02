import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createRepoIntelligenceMcpServer } from "./server.js";

async function main() {
  const server = createRepoIntelligenceMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("[mindtrace-repo-intelligence-mcp] fatal:", err);
  process.exit(1);
});
