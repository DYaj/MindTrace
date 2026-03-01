// orchestrator-mcp/src/mcp/server.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
function okJson(obj) {
    return { content: [{ type: "text", text: JSON.stringify(obj, null, 2) }] };
}
/**
 * IMPORTANT (by design):
 * - This orchestrator is intentionally THIN in Phase 1.
 * - It does NOT implement any routing to other MCPs yet.
 * - It exists to give enterprise users a single endpoint later if needed,
 *   while preserving clean separation of responsibilities today.
 */
const TOOLS = [
    {
        name: "toolmap.get",
        description: "Return the Tool Map (capabilities contract) for the orchestrator MCP.",
        inputSchema: { type: "object", properties: {} }
    },
    {
        name: "orchestrator.status",
        description: "Return orchestrator status + intended delegation model (no routing in Phase 1).",
        inputSchema: { type: "object", properties: {} }
    }
];
export function createMindtraceMcpOrchestratorServer() {
    const server = new Server({ name: "mindtrace-mcp-orchestrator", version: "0.1.0" }, { capabilities: { tools: {} } });
    server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name } = request.params;
        try {
            if (name === "toolmap.get") {
                return okJson({
                    ok: true,
                    mcp: {
                        name: "mindtrace-mcp-orchestrator",
                        version: "0.1.0",
                        goal: "Optional single entrypoint (thin). Delegation will be added later without moving business logic into this layer.",
                        deterministic: true,
                        ownsSchemas: false,
                        ownsValidation: false
                    },
                    tools: [
                        {
                            name: "toolmap.get",
                            guarantees: ["Deterministic", "Stable API surface for enterprise pinning"]
                        },
                        {
                            name: "orchestrator.status",
                            guarantees: ["Deterministic", "No routing in Phase 1"]
                        }
                    ],
                    delegatesTo: [
                        {
                            mcp: "@mindtrace/contracts-mcp",
                            role: "Contracts / CI / Governance (deterministic, auditable)"
                        },
                        {
                            mcp: "@mindtrace/frameworks-mcp",
                            role: "Framework prompts + routing (fast evolving, generation later)"
                        }
                    ],
                    notes: [
                        "Phase 1: Orchestrator is a skeleton only.",
                        "Later: if customers require a single MCP process, add routing here by delegating tool calls to the two MCPs.",
                        "Rule: Orchestrator must remain thin; no contract logic, no generation logic."
                    ]
                });
            }
            if (name === "orchestrator.status") {
                return okJson({
                    ok: true,
                    name: "mindtrace-mcp-orchestrator",
                    version: "0.1.0",
                    phase: 1,
                    routingEnabled: false,
                    message: "Skeleton only. Run contracts-mcp and frameworks-mcp separately for now. Orchestrator routing can be added later if customers demand a single server."
                });
            }
            throw new Error(`Unknown tool: ${name}`);
        }
        catch (err) {
            return okJson({ ok: false, tool: name, error: String(err?.message || err) });
        }
    });
    return server;
}
export async function startMindtraceMcpOrchestratorStdioServer() {
    const server = createMindtraceMcpOrchestratorServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("MindTrace MCP Orchestrator server running on stdio");
}
//# sourceMappingURL=server.js.map