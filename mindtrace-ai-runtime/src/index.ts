// mindtrace-ai-runtime/src/index.ts
//
// Package entrypoint (library-safe).
// IMPORTANT: No side effects on import.

export * from "./runtime/index.js";
export * from "./runtime/pipeline.js";

export { createMindtraceMcpServer, startMindtraceMcpStdioServer } from "./mcp/server.js";

// Keep this in sync with package.json version.
// (Later we can auto-generate it during build so you never touch it manually.)
export const VERSION = "1.0.0";
