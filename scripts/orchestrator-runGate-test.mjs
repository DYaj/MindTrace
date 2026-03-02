import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

function envStrings() {
  return Object.fromEntries(Object.entries(process.env).filter(([, v]) => typeof v === "string"));
}

function readJson(path) {
  if (!existsSync(path)) throw new Error(`Missing file: ${path}`);
  return JSON.parse(readFileSync(path, "utf8"));
}

async function callOrchestratorRunGate({ framework, schemaFile, payload }) {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [resolve("orchestrator-mcp/dist/mcp/cli.js")],
    env: envStrings()
  });

  const client = new Client(
    { name: "orchestrator-runGate-test", version: "0.1.0" },
    { capabilities: {} }
  );

  await client.connect(transport);

  try {
    const res = await client.callTool({
      name: "orchestrator.runGate",
      arguments: { framework, schemaFile, payload }
    });

    const text = res?.content?.[0]?.text;
    if (typeof text !== "string") throw new Error("Unexpected MCP response shape");
    return JSON.parse(text);
  } finally {
    try { await client.close(); } catch {}
    try { await transport.close(); } catch {}
  }
}

async function main() {
  const schemaFile = "locator-manifest.schema.json";
  const framework = "bdd";

  // Canonical VALID example (ships with contracts)
  const examplePath = join(
    process.cwd(),
    "shared-packages",
    "contracts",
    "contracts",
    "examples",
    "locator-manifest.json"
  );

  const validPayload = readJson(examplePath);

  const validRes = await callOrchestratorRunGate({ framework, schemaFile, payload: validPayload });
  console.log("\n=== runGate VALID (example manifest) ===");
  console.log(JSON.stringify(validRes, null, 2));

  // Force INVALID by adding an unexpected top-level property
  const invalidPayload = { ...validPayload, totally: "nope" };

  const invalidRes = await callOrchestratorRunGate({ framework, schemaFile, payload: invalidPayload });
  console.log("\n=== runGate INVALID (extra top-level key) ===");
  console.log(JSON.stringify(invalidRes, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
