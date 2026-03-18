import { resolve, dirname } from 'path';
import { existsSync } from 'fs';

/**
 * Resolve the BreakLine monorepo root
 *
 * CRITICAL: The UI server runs from ui-server/, but must access
 * artifacts at the repo root (.mcp-contract, .mcp-cache, runs/, etc.)
 *
 * Resolution strategy:
 * 1. Explicit override: BREAKLINE_REPO_ROOT env var
 * 2. Walk up from process.cwd() until repo markers found
 */
export function resolveRepoRoot(): string {
  // 1. Prefer explicit env override
  if (process.env.BREAKLINE_REPO_ROOT) {
    const root = resolve(process.env.BREAKLINE_REPO_ROOT);
    if (existsSync(root)) {
      return root;
    }
    throw new Error(`BREAKLINE_REPO_ROOT set but path does not exist: ${root}`);
  }

  // 2. Walk up from current directory
  let current = process.cwd();

  while (true) {
    // Check for repo markers
    const hasMindtraceRuntime = existsSync(resolve(current, 'mindtrace-ai-runtime'));
    const hasFrameworks = existsSync(resolve(current, 'frameworks'));

    if (hasMindtraceRuntime && hasFrameworks) {
      return current;
    }

    // Move to parent directory
    const parent = dirname(current);
    if (parent === current) {
      // Reached filesystem root without finding markers
      throw new Error(
        'Failed to resolve BreakLine repo root. ' +
          'Expected to find mindtrace-ai-runtime and frameworks directories. ' +
          'Set BREAKLINE_REPO_ROOT env var to specify explicitly.'
      );
    }

    current = parent;
  }
}

/**
 * Cached repo root - computed once on first access
 */
let cachedRepoRoot: string | undefined;

/**
 * Get the repo root (cached after first resolution)
 */
export function getRepoRoot(): string {
  if (!cachedRepoRoot) {
    cachedRepoRoot = resolveRepoRoot();
  }
  return cachedRepoRoot;
}
