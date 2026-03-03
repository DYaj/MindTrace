import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";

import type { ScanRepoInput, RepoTopologyJSON } from "../types/topology.js";
import { scanRepo } from "../tools/scanRepo.js";

import {
  detectFramework,
  inferStructure,
  detectLocatorStyle,
  detectAssertionStyle
} from "../tools/infer.js";

import { discoverWrappers } from "../tools/discoverWrappers.js";
import { generateContractFiles } from "../tools/generateContract.js";
import { buildPageSemanticCache } from "../tools/buildPageCache.js";
import { generateContractBundle } from "../tools/generateContractBundle.js";

type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
};

function okJson(obj: any): ToolResult {
  return { content: [{ type: "text", text: JSON.stringify(obj, null, 2) }] };
}

const TOOLS: Tool[] = [
  {
    name: "scan_repo",
    description:
      "Phase 0: deterministically scan a QA automation repo topology and emit architecture signals. No execution. No healing. No LLM.",
    inputSchema: {
      type: "object",
      properties: {
        rootPath: { type: "string" },
        ignore: {
          type: "object",
          properties: {
            dirs: { type: "array", items: { type: "string" } },
            globs: { type: "array", items: { type: "string" } }
          }
        },
        limits: {
          type: "object",
          properties: {
            maxFiles: { type: "number" },
            maxFileBytes: { type: "number" },
            maxSampleFilesPerCategory: { type: "number" }
          }
        }
      },
      required: ["rootPath"]
    }
  },
  {
    name: "detect_framework",
    description: "Phase 0: infer primary framework from RepoTopologyJSON (deterministic).",
    inputSchema: { type: "object", properties: { topology: { type: "object" } }, required: ["topology"] }
  },
  {
    name: "infer_structure",
    description: "Phase 0: infer structure style (native|pom|bdd|hybrid) from RepoTopologyJSON (deterministic).",
    inputSchema: { type: "object", properties: { topology: { type: "object" } }, required: ["topology"] }
  },
  {
    name: "detect_locator_style",
    description: "Phase 0: infer locator preference order + helper conventions from RepoTopologyJSON (deterministic).",
    inputSchema: { type: "object", properties: { topology: { type: "object" } }, required: ["topology"] }
  },
  {
    name: "detect_assertion_style",
    description: "Phase 0: infer assertion style (expect|should|wrapper|unknown) from RepoTopologyJSON (deterministic).",
    inputSchema: { type: "object", properties: { topology: { type: "object" } }, required: ["topology"] }
  },
  {
    name: "discover_wrappers",
    description:
      "Phase 0.3: deterministic static wrapper discovery (locator/assertion/retry signals) from RepoTopologyJSON + repoRoot. No AST, best-effort regex.",
    inputSchema: {
      type: "object",
      properties: {
        repoRoot: { type: "string" },
        topology: { type: "object" },
        limits: {
          type: "object",
          properties: {
            maxFiles: { type: "number" },
            maxFileBytes: { type: "number" }
          }
        }
      },
      required: ["repoRoot", "topology"]
    }
  },
  {
    name: "generate_contract",
    description:
      "Phase 0: write .mcp-contract/* canonical contract files and automation-contract.md from RepoTopologyJSON + deterministic inferences (+ wrapper discovery).",
    inputSchema: {
      type: "object",
      properties: {
        repoRoot: { type: "string" },
        topology: { type: "object" }
      },
      required: ["repoRoot", "topology"]
    }
  },
  {
    name: "build_page_cache",
    description:
      "Phase 1: build .mcp-cache/pages/*.json semantic page cache from repo (deterministic). No DOM. No execution.",
    inputSchema: {
      type: "object",
      properties: {
        repoRoot: { type: "string" },
        topology: { type: "object" },
        limits: {
          type: "object",
          properties: {
            maxPageFiles: { type: "number" },
            maxFileBytes: { type: "number" }
          }
        }
      },
      required: ["repoRoot", "topology"]
    }
  },
  {
    name: "generate_contract_bundle",
    description:
      "Generate complete Phase 0 contract bundle (automation-contract.json, page-key-policy.json, contract.meta.json, contract.fingerprint.sha256)",
    inputSchema: {
      type: "object",
      properties: {
        repoRoot: {
          type: "string",
          description: "Absolute path to repository root"
        },
        mode: {
          type: "string",
          enum: ["strict", "best_effort"],
          description: "Fingerprint mode (default: best_effort)"
        }
      },
      required: ["repoRoot"]
    }
  },
  {
    name: "toolmap.get",
    description: "Return the Tool Map (capabilities contract) for enterprise pinning.",
    inputSchema: { type: "object", properties: {} }
  }
];

export function createRepoIntelligenceMcpServer() {
  const server = new Server(
    { name: "mindtrace-repo-intelligence-mcp", version: "0.1.0" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      if (name === "scan_repo") {
        const input = args as unknown as ScanRepoInput;
        const topology = await scanRepo(input);
        return okJson({ ok: true, topology });
      }

      if (name === "detect_framework") {
        const topology = (args as any).topology as RepoTopologyJSON;
        return okJson({ ok: true, framework: detectFramework(topology) });
      }

      if (name === "infer_structure") {
        const topology = (args as any).topology as RepoTopologyJSON;
        return okJson({ ok: true, structure: inferStructure(topology) });
      }

      if (name === "detect_locator_style") {
        const topology = (args as any).topology as RepoTopologyJSON;
        return okJson({ ok: true, locatorStyle: detectLocatorStyle(topology) });
      }

      if (name === "detect_assertion_style") {
        const topology = (args as any).topology as RepoTopologyJSON;
        return okJson({ ok: true, assertionStyle: detectAssertionStyle(topology) });
      }

      if (name === "discover_wrappers") {
        const repoRoot = String((args as any).repoRoot || "");
        const topology = (args as any).topology as RepoTopologyJSON;
        const limits = (args as any).limits as any | undefined;

        const out = discoverWrappers({ repoRoot, topology, limits });
        return okJson({ ok: true, wrappers: out });
      }

      if (name === "generate_contract") {
        const repoRoot = String((args as any).repoRoot || "");
        const topology = (args as any).topology as RepoTopologyJSON;

        const fw = detectFramework(topology);
        const st = inferStructure(topology);
        const loc = detectLocatorStyle(topology);
        const asrt = detectAssertionStyle(topology);

        const wrappers = discoverWrappers({ repoRoot, topology });

        const out = generateContractFiles({
          repoRoot,
          topology,
          framework: fw,
          structure: st,
          locatorStyle: loc,
          assertionStyle: asrt,
          wrappers
        });

        return okJson({ ok: true, contract: out });
      }

      if (name === "build_page_cache") {
        const repoRoot = String((args as any).repoRoot || "");
        const topology = (args as any).topology as RepoTopologyJSON;
        const limits = (args as any).limits as any | undefined;

        const out = buildPageSemanticCache({ repoRoot, topology, limits });
        return okJson({ ok: true, pageCache: { summary: out.summary, written: out.written } });
      }

      if (name === "generate_contract_bundle") {
        const repoRoot = String((args as any).repoRoot || "");
        const mode = (args as any).mode as "strict" | "best_effort" | undefined;

        const result = await generateContractBundle({ repoRoot, mode });
        return okJson(result);
      }

      if (name === "toolmap.get") {
        return okJson({
          ok: true,
          mcp: {
            name: "mindtrace-repo-intelligence-mcp",
            version: "0.1.0",
            deterministic: true,
            ai: "none",
            execution: "none",
            mutations: "writes .mcp-contract/* and .mcp-cache/pages/* only (explicit)"
          },
          tools: TOOLS.map((t) => ({ name: t.name, description: t.description }))
        });
      }

      throw new Error(`Unknown tool: ${name}`);
    } catch (err: any) {
      return okJson({
        ok: false,
        error: {
          tool: name,
          message: String(err?.message || err)
        }
      });
    }
  });

  return server;
}
