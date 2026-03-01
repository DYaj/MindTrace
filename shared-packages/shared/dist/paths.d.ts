/**
 * Resolve the package root (works from dist/* or src/*).
 * Example: dist/mcp/server.js -> dist/mcp -> dist -> (package root)
 */
export declare function resolvePackageRoot(importMetaUrl: string): string;
/**
 * Resolve a base path from env var (preferred) otherwise fall back to package root.
 * This is how you make "packaged prompts/contracts" work reliably.
 */
export declare function resolveBasePath(opts: {
    envVar: string;
    importMetaUrl: string;
}): string;
//# sourceMappingURL=paths.d.ts.map