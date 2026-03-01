// mindtrace-ai-runtime/src/mcp/server.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { readdirSync, existsSync } from "fs";
import { join, resolve, dirname as pathDirname } from "path";
import { config } from "dotenv";

// ✅ ESM-safe __dirname replacement
import { fileURLToPath } from "url";

config();

const TOOLS: Tool[] = [
  {
    name: "listFrameworks",
    description: "List all available automation frameworks (native, bdd, pom-bdd)",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "listPrompts",
    description: "List all prompt files for a given framework",
    inputSchema: {
      type: "object",
      properties: {
        framework: {
          type: "string",
          enum: ["native", "bdd", "pom-bdd"],
          description: "Framework name"
        }
      },
      required: ["framework"]
    }
  }
];

function getBasePath() {
  const envPath = process.env.MINDTRACE_BASE_PATH;
  if (envPath && existsSync(envPath)) return envPath;

  // In ESM, __dirname is not defined — derive from import.meta.url.
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = pathDirname(__filename);

  // dist/mcp/server.js -> dist/mcp -> dist -> (package root)
  return resolve(__dirname, "../..");
}

export function createMindtraceMcpServer() {
  const server = new Server(
    { name: "mindtrace-playwright", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );

  const BASE_PATH = getBasePath();
  const PROMPTS_DIR = join(BASE_PATH, "prompts");

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case "listFrameworks": {
          const frameworks = existsSync(PROMPTS_DIR)
            ? readdirSync(PROMPTS_DIR, { withFileTypes: true })
                .filter((d) => d.isDirectory())
                .map((d) => d.name)
            : [];

          return {
            content: [{ type: "text", text: JSON.stringify({ frameworks }, null, 2) }]
          };
        }

        case "listPrompts": {
          const { framework } = args as { framework: string };
          const frameworkDir = join(PROMPTS_DIR, framework);

          if (!existsSync(frameworkDir)) throw new Error(`Framework directory not found: ${framework}`);

          const prompts = readdirSync(frameworkDir)
            .filter((f) => f.endsWith(".md"))
            .map((f) => ({ name: f, path: join(frameworkDir, f) }));

          return {
            content: [{ type: "text", text: JSON.stringify({ framework, prompts }, null, 2) }]
          };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { error: error instanceof Error ? error.message : String(error) },
              null,
              2
            )
          }
        ],
        isError: true
      };
    }
  });

  return server;
}

export async function startMindtraceMcpStdioServer() {
  const server = createMindtraceMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MindTrace for Playwright MCP server running on stdio");
}
