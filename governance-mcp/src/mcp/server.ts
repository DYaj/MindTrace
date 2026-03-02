// governance-mcp/src/mcp/server.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createRequire } from "node:module";

// Ajv imports: handle ESM/CJS interop safely across tsconfig variants
import * as AjvNS from "ajv";
import * as AjvFormatsNS from "ajv-formats";

type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
};

function okJson(obj: any): ToolResult {
  return { content: [{ type: "text", text: JSON.stringify(obj, null, 2) }] };
}

const require = createRequire(import.meta.url);

function requireResolveRoot(pkgName: string): string {
  const entry = require.resolve(pkgName);
  return resolve(dirname(entry), "..");
}

function resolveContractsDir(): { contractsRoot: string; contractsDir: string; schemasDir: string } {
  // Priority:
  // 1) MINDTRACE_CONTRACTS_PATH (explicit)
  // 2) @mindtrace/contracts (workspace or installed)
  const envPath = process.env.MINDTRACE_CONTRACTS_PATH;
  if (envPath && existsSync(envPath)) {
    const contractsDir = envPath.endsWith("/contracts") ? envPath : join(envPath, "contracts");
    const schemasDir = join(contractsDir, "schemas");
    return { contractsRoot: envPath, contractsDir, schemasDir };
  }

  const pkgRoot = requireResolveRoot("@mindtrace/contracts");
  const contractsDir = join(pkgRoot, "contracts");
  const schemasDir = join(contractsDir, "schemas");
  return { contractsRoot: pkgRoot, contractsDir, schemasDir };
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

// Ajv instance for deterministic schema validation (no network, no side effects)
function createAjv() {
  // Resolve default export if present; otherwise use module namespace as constructor
  const AjvCtor: any = (AjvNS as any).default ?? AjvNS;
  const addFormatsFn: any = (AjvFormatsNS as any).default ?? AjvFormatsNS;

  const ajv = new AjvCtor({ allErrors: true, strict: true });
  // ajv-formats exports a function in most builds; guard just in case
  if (typeof addFormatsFn === "function") {
    addFormatsFn(ajv);
  }
  return ajv;
}

const TOOLS: Tool[] = [
  {
    name: "schemas.list",
    description: "List available governance JSON Schemas.",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "schemas.get",
    description: "Get the full text of a schema file.",
    inputSchema: {
      type: "object",
      properties: { file: { type: "string", description: "Schema filename." } },
      required: ["file"]
    }
  },
  {
    name: "contracts.validate",
    description: "Validate a JSON payload against a governance schema (deterministic CI gate). Returns valid + errors.",
    inputSchema: {
      type: "object",
      properties: {
        schemaFile: { type: "string", description: "Schema filename under schemas/." },
        payload: { type: "object", description: "JSON payload to validate." }
      },
      required: ["schemaFile", "payload"]
    }
  },
  {
    name: "toolmap.get",
    description: "Return the Tool Map (capabilities contract) for this MCP, for enterprise pinning and long-term maintainability.",
    inputSchema: { type: "object", properties: {} }
  }
];

export function createGovernanceMcpServer() {
  const server = new Server(
    { name: "mindtrace-governance-mcp", version: "0.1.0" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      const { contractsRoot, contractsDir, schemasDir } = resolveContractsDir();

      if (name === "schemas.list") {
        const files = safeListFiles(schemasDir);
        return okJson({ ok: true, contractsRoot, contractsDir, schemasDir, files });
      }

      if (name === "schemas.get") {
        const file = String((args as any)?.file || "");
        if (!file) throw new Error("Missing required argument: file");
        const p = join(schemasDir, file);
        const text = safeReadText(p);
        return okJson({ ok: true, file, path: p, text });
      }

      if (name === "contracts.validate") {
        const schemaFile = String((args as any)?.schemaFile || "");
        const payload = (args as any)?.payload;

        if (!schemaFile) throw new Error("Missing required argument: schemaFile");
        if (payload === undefined) throw new Error("Missing required argument: payload");

        const schemaPath = join(schemasDir, schemaFile);
        const schema = JSON.parse(safeReadText(schemaPath));

        const ajv = createAjv();
        const validate = ajv.compile(schema);
        const valid = validate(payload);

        return okJson({
          ok: true,
          schemaFile,
          schemaPath,
          result: {
            ok: Boolean(valid),
            errors: validate.errors ?? null
          }
        });
      }

      if (name === "toolmap.get") {
        return okJson({
          ok: true,
          mcp: {
            name: "mindtrace-governance-mcp",
            version: "0.1.0",
            goal: "CI/governance validation: deterministic schema checks and contract gates.",
            deterministic: true,
            ownsSchemas: false,
            ownsValidation: true
          },
          tools: [
            {
              name: "schemas.list",
              io: { in: {}, out: { files: "string[]" } },
              guarantees: ["Deterministic", "No LLM"]
            },
            {
              name: "schemas.get",
              io: { in: { file: "string" }, out: { text: "string" } },
              guarantees: ["Deterministic", "No LLM"]
            },
            {
              name: "contracts.validate",
              io: { in: { schemaFile: "string", payload: "object" }, out: { ok: "boolean", errors: "object|null" } },
              guarantees: ["Deterministic", "No LLM", "CI gate-ready"]
            },
            {
              name: "toolmap.get",
              io: { in: {}, out: { toolmap: "object" } },
              guarantees: ["Stable API surface for enterprise pinning"]
            }
          ]
        });
      }

      throw new Error(`Unknown tool: ${name}`);
    } catch (err: any) {
      return okJson({
        ok: false,
        tool: name,
        error: String(err?.message || err)
      });
    }
  });

  return server;
}

export async function startGovernanceMcpStdioServer() {
  const transport = new StdioServerTransport();
  const server = createGovernanceMcpServer();
  await server.connect(transport);
  console.error("MindTrace Governance MCP server running on stdio");
}
