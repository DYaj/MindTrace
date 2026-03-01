// contracts-mcp/src/index.ts
//
// Package entrypoint (library-safe).
// IMPORTANT: No side effects on import.

export { createContractsMcpServer, startContractsMcpStdioServer } from "./mcp/server.js";

// Keep in sync with package.json version (we can auto-gen later)
export const VERSION = "0.1.0";
