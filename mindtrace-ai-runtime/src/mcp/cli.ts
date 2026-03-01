#!/usr/bin/env node
// mindtrace-ai-runtime/src/mcp/cli.ts

import { startMindtraceMcpStdioServer } from "./server.js";

function printHelp() {
  console.log(`Usage: mindtrace-mcp [options]

MindTrace for Playwright MCP server (stdio)

Options:
  -h, --help     display help for command
  -V, --version  output the version number
`);
}

async function printVersion() {
  // Try to read package.json regardless of where the file is executed from.
  // Works both in repo (ts->dist) and when installed from node_modules.
  try {
    const { readFile } = await import("node:fs/promises");
    const { fileURLToPath } = await import("node:url");
    const { dirname, resolve } = await import("node:path");
    const { pathToFileURL } = await import("node:url");

    const here = dirname(fileURLToPath(import.meta.url)); // dist/mcp or src/mcp after compile
    const pkgPathCandidates = [resolve(here, "../../package.json"), resolve(here, "../package.json"), resolve(process.cwd(), "package.json")];

    for (const pkgPath of pkgPathCandidates) {
      try {
        const raw = await readFile(pkgPath, "utf8");
        const pkg = JSON.parse(raw);
        if (pkg?.version) {
          console.log(pkg.version);
          return;
        }
      } catch {
        // try next
      }
    }

    // last resort: try dynamic import if available
    try {
      const pkgUrl = pathToFileURL(resolve(here, "../../package.json")).href;
      const pkg = await import(pkgUrl, { with: { type: "json" } } as any);
      const v = (pkg as any)?.default?.version;
      console.log(v || "unknown");
      return;
    } catch {
      // ignore
    }

    console.log("unknown");
  } catch {
    console.log("unknown");
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("-h") || args.includes("--help")) {
    printHelp();
    process.exit(0);
  }

  if (args.includes("-V") || args.includes("--version")) {
    await printVersion();
    process.exit(0);
  }

  await startMindtraceMcpStdioServer();
}

main().catch((error) => {
  console.error("MCP server error:", error);
  process.exit(1);
});
