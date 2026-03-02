import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [
    "/Users/davidyang/Desktop/MindTrace Inc/mindtrace-for-playwright/orchestrator-mcp/dist/mcp/cli.js"
  ],
  env: Object.fromEntries(Object.entries(process.env).filter(([, v]) => typeof v === "string")),
});

const client = new Client(
  { name: "mindtrace-orchestrator-e2e-test", version: "0.1.0" },
  { capabilities: {} }
);

async function main() {
  await client.connect(transport);

  // VALID-ish payload (may still fail if schema is stricter — that’s OK)
  const validPayload = {
    version: "1.0",
    generated_at: new Date().toISOString(),
    locators: []
  };

  const res1 = await client.callTool({
    name: "orchestrator.enforce",
    arguments: {
      framework: "bdd",
      promptFile: "main.md",
      schemaFile: "locator-manifest.schema.json",
      payload: validPayload
    }
  });

  console.log("\n=== VALID PAYLOAD RESULT ===");
  console.log(res1.content?.[0]?.text ?? res1);

  // INVALID payload
  const invalidPayload = { totally: "wrong", nope: true };

  const res2 = await client.callTool({
    name: "orchestrator.enforce",
    arguments: {
      framework: "bdd",
      promptFile: "main.md",
      schemaFile: "locator-manifest.schema.json",
      payload: invalidPayload
    }
  });

  console.log("\n=== INVALID PAYLOAD RESULT ===");
  console.log(res2.content?.[0]?.text ?? res2);

  await client.close();
  await transport.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
