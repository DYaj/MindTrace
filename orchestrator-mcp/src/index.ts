// orchestrator-mcp/src/index.ts
//
// Package entrypoint (library-safe).
// IMPORTANT: No side effects on import.

export {
  createMindtraceMcpOrchestratorServer,
  startMindtraceMcpOrchestratorStdioServer
} from "./mcp/server.js";

export const VERSION = "0.1.0";
