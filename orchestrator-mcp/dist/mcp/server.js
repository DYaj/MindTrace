// orchestrator-mcp/src/mcp/server.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
// MCP client (for cross-MCP enforcement)
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { getPromptText } from "@mindtrace/promptpacks";
function okJson(obj) {
    return { content: [{ type: "text", text: JSON.stringify(obj, null, 2) }] };
}
const require = createRequire(import.meta.url);
function requireResolveRoot(pkgName) {
    // Resolve to package entry, then walk up one level to package root.
    const entry = require.resolve(pkgName);
    return resolve(dirname(entry), "..");
}
function resolvePromptpacksRoot() {
    try {
        return requireResolveRoot("@mindtrace/promptpacks");
    }
    catch {
        return null;
    }
}
function resolveGovernanceCliPath() {
    try {
        const pkgRoot = requireResolveRoot("@mindtrace/governance-mcp");
        const cli = join(pkgRoot, "dist", "mcp", "cli.js");
        return existsSync(cli) ? cli : null;
    }
    catch {
        return null;
    }
}
function safeReadText(p) {
    if (!existsSync(p))
        throw new Error(`File not found: ${p}`);
    return readFileSync(p, "utf8");
}
function sha256(text) {
    return createHash("sha256").update(text, "utf8").digest("hex");
}
async function callGovernanceValidate(schemaFile, payload) {
    const cliPath = resolveGovernanceCliPath();
    if (!cliPath) {
        throw new Error("Could not resolve @mindtrace/governance-mcp CLI (dist/mcp/cli.js). Ensure @mindtrace/governance-mcp is installed/linked.");
    }
    // Spawn governance-mcp as an MCP server over stdio, then call its tool.
    const transport = new StdioClientTransport({
        command: process.execPath, // node
        args: [cliPath],
        env: Object.fromEntries(Object.entries(process.env).filter(([, v]) => typeof v === "string"))
    });
    const client = new Client({ name: "mindtrace-mcp-orchestrator-client", version: "0.1.0" }, { capabilities: {} });
    await client.connect(transport);
    try {
        const res = await client.callTool({
            name: "contracts.validate",
            arguments: { schemaFile, payload }
        });
        // governance-mcp returns JSON text inside MCP content
        const text = res?.content?.[0]?.text;
        if (typeof text !== "string") {
            return { ok: false, error: "governance-mcp returned unexpected response shape", raw: res };
        }
        const parsed = JSON.parse(text);
        return parsed;
    }
    finally {
        // Best-effort shutdown
        try {
            await client.close();
        }
        catch { }
        try {
            await transport.close();
        }
        catch { }
    }
}
function deriveGate(governanceResult) {
    const govOk = Boolean(governanceResult?.result?.ok);
    return {
        ok: govOk,
        exitCode: govOk ? 0 : 3,
        reason: govOk ? "OK" : "POLICY_VIOLATION"
    };
}
const TOOLS = [
    {
        name: "orchestrator.enforce",
        description: "Orchestrator → Frameworks → Governance: resolve a prompt pack file (frameworks output) and validate a JSON payload via governance-mcp (cross-MCP enforcement).",
        inputSchema: {
            type: "object",
            properties: {
                framework: { type: "string", description: "Prompt pack name (bdd, native, pom-bdd)." },
                promptFile: { type: "string", description: "Prompt filename (default: main.md)." },
                schemaFile: {
                    type: "string",
                    description: "Schema filename under governance schemas/ (default: locator-manifest.schema.json)."
                },
                payload: { type: "object", description: "JSON payload to validate against schemaFile." }
            },
            required: ["framework", "payload"]
        }
    },
    {
        name: "orchestrator.runGate",
        description: "CI gate: returns only governance gate status (ok/exitCode/reason + errors) after resolving prompt pack (for pinning).",
        inputSchema: {
            type: "object",
            properties: {
                framework: { type: "string", description: "Prompt pack name (bdd, native, pom-bdd)." },
                promptFile: { type: "string", description: "Prompt filename (default: main.md)." },
                schemaFile: {
                    type: "string",
                    description: "Schema filename under governance schemas/ (default: locator-manifest.schema.json)."
                },
                payload: { type: "object", description: "JSON payload to validate against schemaFile." }
            },
            required: ["framework", "payload"]
        }
    },
    {
        name: "toolmap.get",
        description: "Return the Tool Map (capabilities contract) for this MCP, for enterprise pinning and long-term maintainability.",
        inputSchema: { type: "object", properties: {} }
    }
];
export function createOrchestratorMcpServer() {
    const server = new Server({ name: "mindtrace-mcp-orchestrator", version: "0.1.0" }, { capabilities: { tools: {} } });
    server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;
        try {
            if (name === "orchestrator.enforce" || name === "orchestrator.runGate") {
                const framework = String(args?.framework || "");
                const promptFile = String(args?.promptFile || "main.md");
                const schemaFile = String(args?.schemaFile || "locator-manifest.schema.json");
                const payload = args?.payload;
                if (!framework)
                    throw new Error("Missing required argument: framework");
                if (payload === undefined)
                    throw new Error("Missing required argument: payload");
                // --- Frameworks output (promptpacks) resolution ---
                const promptpacksRoot = resolvePromptpacksRoot();
                if (!promptpacksRoot)
                    throw new Error("Could not resolve @mindtrace/promptpacks");
                const promptsDir = join(promptpacksRoot, "prompts");
                const promptPath = join(promptsDir, framework, promptFile);
                // getPromptText(promptRoot: string, framework: string, filename: string)
                const promptText = getPromptText(promptsDir, framework, promptFile);
                const promptSha = sha256(promptText);
                // --- Governance enforcement (cross-MCP call) ---
                const governance = await callGovernanceValidate(schemaFile, payload);
                const gate = deriveGate(governance);
                // Gate-only tool (CI surface)
                if (name === "orchestrator.runGate") {
                    return okJson({
                        ok: gate.ok,
                        exitCode: gate.exitCode,
                        reason: gate.reason,
                        gateSummary: {
                            framework,
                            promptFile,
                            promptSha256: promptSha,
                            schemaFile
                        },
                        errors: governance?.result?.errors ?? null
                    });
                }
                // Full enforcement output (includes framework + governance blobs)
                return okJson({
                    ok: gate.ok,
                    exitCode: gate.exitCode,
                    reason: gate.reason,
                    flow: "orchestrator → frameworks(promptpacks) → governance(governance-mcp over stdio)",
                    framework: { framework, promptFile, promptPath, promptSha256: promptSha },
                    governance
                });
            }
            if (name === "toolmap.get") {
                return okJson({
                    ok: true,
                    mcp: {
                        name: "mindtrace-mcp-orchestrator",
                        version: "0.1.0",
                        goal: "Coordinates Frameworks (prompt packs) + Governance (contract validation) and exposes an enforcement flow as a single MCP surface.",
                        deterministic: true,
                        ownsSchemas: false,
                        ownsValidation: true
                    },
                    tools: [
                        {
                            name: "orchestrator.enforce",
                            io: {
                                in: { framework: "string", promptFile: "string?", schemaFile: "string?", payload: "object" },
                                out: { ok: "boolean", exitCode: "number", reason: "string", framework: "object", governance: "object" }
                            },
                            guarantees: ["Deterministic", "No LLM", "Cross-MCP enforcement via stdio"]
                        },
                        {
                            name: "orchestrator.runGate",
                            io: {
                                in: { framework: "string", promptFile: "string?", schemaFile: "string?", payload: "object" },
                                out: { ok: "boolean", exitCode: "number", reason: "string", errors: "object|null" }
                            },
                            guarantees: ["Deterministic", "No LLM", "CI gate surface"]
                        },
                        {
                            name: "toolmap.get",
                            io: { in: {}, out: { toolmap: "object" } },
                            guarantees: ["Stable API surface for enterprise pinning"]
                        }
                    ],
                    notes: [
                        "Phase 1: orchestrator resolves promptpacks deterministically and enforces governance by calling governance-mcp over stdio.",
                        "Next: extend enforcement to validate framework output shape (promptpack contract) and enforce policy decisions."
                    ]
                });
            }
            throw new Error(`Unknown tool: ${name}`);
        }
        catch (err) {
            return okJson({
                ok: false,
                tool: name,
                error: String(err?.message || err)
            });
        }
    });
    return server;
}
export async function startOrchestratorMcpStdioServer() {
    const transport = new StdioServerTransport();
    const server = createOrchestratorMcpServer();
    await server.connect(transport);
    console.error("MindTrace MCP Orchestrator server running on stdio");
}
//# sourceMappingURL=server.js.map