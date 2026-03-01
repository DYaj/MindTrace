// frameworks-mcp/src/mcp/server.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve, dirname as pathDirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { config } from "dotenv";

config();

type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
};

function okJson(obj: any): ToolResult {
  return { content: [{ type: "text", text: JSON.stringify(obj, null, 2) }] };
}

function tryResolveFromRequire(requireFn: NodeRequire, spec: string): string | null {
  try {
    return requireFn.resolve(spec);
  } catch {
    return null;
  }
}

/**
 * Resolve an installed package root by finding its package.json.
 * Works for:
 * - monorepo workspaces (symlinks under repo root node_modules)
 * - normal node_modules installs
 * - packaged tarball installs
 */
function resolvePackageRoot(pkgName: string): string | null {
  const spec = `${pkgName}/package.json`;

  // 1) Resolve relative to this file
  const r1 = createRequire(import.meta.url);
  const p1 = tryResolveFromRequire(r1, spec);
  if (p1) return pathDirname(p1);

  // 2) Resolve relative to current working dir
  try {
    const cwdUrl = pathToFileURL(join(process.cwd(), "package.json")).href;
    const r2 = createRequire(cwdUrl);
    const p2 = tryResolveFromRequire(r2, spec);
    if (p2) return pathDirname(p2);
  } catch {
    // ignore
  }

  // 3) Walk upward from CWD and try node_modules manually
  // (very stable for workspaces where node_modules is at repo root)
  let cur = process.cwd();
  for (let i = 0; i < 8; i++) {
    const candidate = join(cur, "node_modules", ...pkgName.split("/"), "package.json");
    if (existsSync(candidate)) return pathDirname(candidate);
    const parent = resolve(cur, "..");
    if (parent === cur) break;
    cur = parent;
  }

  return null;
}

/**
 * Base path resolution (fallback only).
 * - If MINDTRACE_BASE_PATH is set, use it.
 * - Otherwise, derive from dist/mcp/server.js => package root.
 */
function getLocalBasePathFallback() {
  const envPath = process.env.MINDTRACE_BASE_PATH;
  if (envPath && existsSync(envPath)) return envPath;

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = pathDirname(__filename);
  return resolve(__dirname, "../..");
}

/**
 * Source-of-truth directories:
 * Prefer shared packages:
 *   - @mindtrace/promptpacks/prompts
 *   - @mindtrace/contracts/contracts
 *
 * Allow overrides for enterprise/CI:
 *   - MINDTRACE_PROMPTS_PATH
 *   - MINDTRACE_CONTRACTS_PATH
 *
 * Fall back to local package folders if needed.
 */
function resolvePromptsDir(): { dir: string; source: string } {
  const override = process.env.MINDTRACE_PROMPTS_PATH;
  if (override && existsSync(override)) return { dir: override, source: "env:MINDTRACE_PROMPTS_PATH" };

  const promptpacksRoot = resolvePackageRoot("@mindtrace/promptpacks");
  if (promptpacksRoot) {
    const d = join(promptpacksRoot, "prompts");
    if (existsSync(d)) return { dir: d, source: "@mindtrace/promptpacks" };
  }

  const base = getLocalBasePathFallback();
  return { dir: join(base, "prompts"), source: "fallback:local" };
}

function resolveContractsDir(): { dir: string; source: string } {
  const override = process.env.MINDTRACE_CONTRACTS_PATH;
  if (override && existsSync(override)) return { dir: override, source: "env:MINDTRACE_CONTRACTS_PATH" };

  const contractsRoot = resolvePackageRoot("@mindtrace/contracts");
  if (contractsRoot) {
    const d = join(contractsRoot, "contracts");
    if (existsSync(d)) return { dir: d, source: "@mindtrace/contracts" };
  }

  const base = getLocalBasePathFallback();
  return { dir: join(base, "contracts"), source: "fallback:local" };
}

function safeListDirs(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .map((name) => join(dir, name))
    .filter((p) => {
      try {
        return statSync(p).isDirectory();
      } catch {
        return false;
      }
    })
    .map((p) => p.split("/").pop() as string)
    .sort();
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
    name: "frameworks.list",
    description: "List available framework prompt packs (e.g. native, bdd, pom-bdd).",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "prompts.list",
    description: "List prompt files for a given framework pack.",
    inputSchema: {
      type: "object",
      properties: {
        framework: { type: "string", description: "Framework pack name (e.g. native, bdd, pom-bdd)." }
      },
      required: ["framework"]
    }
  },
  {
    name: "prompts.get",
    description: "Get the full text of a prompt file from a framework pack.",
    inputSchema: {
      type: "object",
      properties: {
        framework: { type: "string" },
        file: { type: "string", description: "Prompt filename (e.g. main.md)." }
      },
      required: ["framework", "file"]
    }
  },
  {
    name: "toolmap.get",
    description: "Return the Tool Map (capabilities contract) for this MCP.",
    inputSchema: { type: "object", properties: {} }
  }
];

export function createFrameworksMcpServer() {
  const server = new Server(
    { name: "mindtrace-frameworks-mcp", version: "0.1.0" },
    { capabilities: { tools: {} } }
  );

  const prompts = resolvePromptsDir();
  const contracts = resolveContractsDir();

  const PROMPTS_DIR = prompts.dir;
  const CONTRACTS_DIR = contracts.dir;

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      if (name === "frameworks.list") {
        const frameworks = safeListDirs(PROMPTS_DIR);
        return okJson({
          ok: true,
          promptsDir: PROMPTS_DIR,
          promptsSource: prompts.source,
          contractsDir: CONTRACTS_DIR,
          contractsSource: contracts.source,
          frameworks
        });
      }

      if (name === "prompts.list") {
        const framework = String((args as any)?.framework || "");
        if (!framework) throw new Error("Missing required argument: framework");
        const packDir = join(PROMPTS_DIR, framework);
        const files = safeListFiles(packDir);
        return okJson({ ok: true, framework, files });
      }

      if (name === "prompts.get") {
        const framework = String((args as any)?.framework || "");
        const file = String((args as any)?.file || "");
        if (!framework) throw new Error("Missing required argument: framework");
        if (!file) throw new Error("Missing required argument: file");

        const p = join(PROMPTS_DIR, framework, file);
        const text = safeReadText(p);

        return okJson({ ok: true, framework, file, path: p, text });
      }

      if (name === "toolmap.get") {
        return okJson({
          ok: true,
          mcp: {
            name: "mindtrace-frameworks-mcp",
            version: "0.1.0",
            goal: "Flexible prompt packs + routing; contract-aware consumer; evolves fast.",
            deterministic: true,
            ownsSchemas: false,
            ownsValidation: false
          },
          tools: TOOLS.map((t) => t.name),
          notes: [
            "Phase 1 is read-only (list/get prompts).",
            "Validation stays owned by @mindtrace/contracts-mcp.",
            "Prompts/contracts resolve from shared packages when available; otherwise fallback:local."
          ]
        });
      }

      throw new Error(`Unknown tool: ${name}`);
    } catch (err: any) {
      return okJson({ ok: false, tool: name, error: String(err?.message || err) });
    }
  });

  return server;
}

export async function startFrameworksMcpStdioServer() {
  const server = createFrameworksMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MindTrace Frameworks MCP server running on stdio");
}
