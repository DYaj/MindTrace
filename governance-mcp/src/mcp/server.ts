// contracts-mcp/src/mcp/server.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve, dirname as pathDirname } from "node:path";
import { config } from "dotenv";
import { fileURLToPath } from "node:url";

config();

/**
 * Contracts resolution:
 * - If MINDTRACE_CONTRACTS_PATH is set, use it (explicit override).
 * - Else: prefer @mindtrace/contracts workspace package (shared-packages/contracts).
 * - Else: fall back to local ./contracts within this MCP package.
 */
function resolveContractsRoot() {
  const env = process.env.MINDTRACE_CONTRACTS_PATH;
  if (env && existsSync(env)) return env;

  try {
    // Resolve package root (NOT package.json subpath; avoids exports restrictions)
    const pkgRoot = pathDirname(fileURLToPath(import.meta.resolve("@mindtrace/contracts")));
    // dist/index.js -> dist -> package root
    const root = resolve(pkgRoot, "..");
    if (existsSync(root)) return root;
  } catch {
    // ignore
  }

  // fallback: local
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = pathDirname(__filename);
  return resolve(__dirname, "../..");
}

type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
};

function okJson(obj: any): ToolResult {
  return { content: [{ type: "text", text: JSON.stringify(obj, null, 2) }] };
}

function safeListFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .map((name) => join(dir, name))
    .filter((p) => {
      try {
        return statSync(p).isFile();
      } catch {
        return false;
      }
    })
    .map((p) => p.split("/").pop() as string)
    .sort();
}

function safeReadText(p: string): string {
  if (!existsSync(p)) throw new Error(`File not found: ${p}`);
  return readFileSync(p, "utf8");
}

const TOOLS: Tool[] = [
  {
    name: "contracts.schemas.list",
    description: "List available JSON Schema files in the contracts bundle.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "contracts.schemas.get",
    description: "Get the raw JSON schema text by filename.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "Schema filename (e.g. locator-manifest.schema.json)" },
      },
      required: ["file"],
    },
  },
  {
    name: "toolmap.get",
    description:
      "Return the Tool Map (capabilities contract) for this MCP. Stable surface for enterprise CI pinning.",
    inputSchema: { type: "object", properties: {} },
  },
];

export function createContractsMcpServer() {
  const server = new Server(
    { name: "mindtrace-governance-mcp", version: "0.1.0" },
    { capabilities: { tools: {} } }
  );

  const CONTRACTS_ROOT = resolveContractsRoot();
  const CONTRACTS_DIR = join(CONTRACTS_ROOT, "contracts");
  const SCHEMAS_DIR = join(CONTRACTS_DIR, "schemas");

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      if (name === "contracts.schemas.list") {
        const files = safeListFiles(SCHEMAS_DIR);
        return okJson({
          ok: true,
          contractsRoot: CONTRACTS_ROOT,
          contractsDir: CONTRACTS_DIR,
          schemasDir: SCHEMAS_DIR,
          files,
        });
      }

      if (name === "contracts.schemas.get") {
        const file = String((args as any)?.file || "");
        if (!file) throw new Error("Missing required argument: file");
        const p = join(SCHEMAS_DIR, file);
        const text = safeReadText(p);

        return okJson({
          ok: true,
          file,
          path: p,
          text,
        });
      }

      if (name === "toolmap.get") {
        return okJson({
          ok: true,
          mcp: {
            name: "mindtrace-governance-mcp",
            version: "0.1.0",
            goal: "Deterministic CI-grade contract governance: schemas + lint + DoD enforcement (Phase 1 = schemas only).",
            deterministic: true,
            ownsSchemas: true,
            ownsValidation: true
          },
          tools: [
            {
              name: "contracts.schemas.list",
              guarantees: ["Deterministic", "No LLM", "Filesystem-backed"],
            },
            {
              name: "contracts.schemas.get",
              guarantees: ["Deterministic", "No LLM", "Transparent schema retrieval"],
            },
            {
              name: "toolmap.get",
              guarantees: ["Stable API surface for enterprise pinning"],
            },
          ],
          notes: [
            "Phase 1 intentionally limited to schemas listing/retrieval + toolmap.",
            "Later: contracts.validate, contracts.lint, contracts.dod.evaluate, contracts.diff, contracts.patchPlan.validate, compatibility checks."
          ],
        });
      }

      throw new Error(`Unknown tool: ${name}`);
    } catch (err: any) {
      return okJson({
        ok: false,
        tool: name,
        error: String(err?.message || err),
      });
    }
  });

  return server;
}

export async function startContractsMcpStdioServer() {
  const server = createContractsMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MindTrace Governance MCP server running on stdio");
}
