#!/usr/bin/env node
// governance-mcp/src/mcp/cli.ts
import { startGovernanceMcpStdioServer } from "./server.js";
function printHelp() {
    console.log(`Usage: mindtrace-governance-mcp [options]

MindTrace Governance MCP server (stdio)

Options:
  -h, --help     display help for command
  -V, --version  output the version number
`);
}
async function printVersion() {
    try {
        const { readFile } = await import("node:fs/promises");
        const { fileURLToPath } = await import("node:url");
        const { dirname, resolve } = await import("node:path");
        const here = dirname(fileURLToPath(import.meta.url)); // dist/mcp or src/mcp
        const candidates = [
            resolve(here, "../../package.json"),
            resolve(here, "../package.json"),
            resolve(process.cwd(), "package.json"),
        ];
        for (const p of candidates) {
            try {
                const raw = await readFile(p, "utf8");
                const pkg = JSON.parse(raw);
                if (pkg?.version) {
                    console.log(pkg.version);
                    return;
                }
            }
            catch { }
        }
        console.log("unknown");
    }
    catch {
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
    await startGovernanceMcpStdioServer();
}
main().catch((error) => {
    console.error("Governance MCP server error:", error);
    process.exit(1);
});
//# sourceMappingURL=cli.js.map