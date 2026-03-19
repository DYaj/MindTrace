import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Resolve BreakLine installation root
 *
 * This is where BreakLine itself is installed:
 * - mindtrace-ai-runtime
 * - ui-server
 * - ui-client
 * - producer packages
 *
 * Resolution strategy:
 * 1. Explicit override: BREAKLINE_ROOT or BREAKLINE_HOME env var
 * 2. Walk up from current file location to find installation markers
 */
export function resolveBreaklineRoot(): string {
  // 1. Prefer explicit env override
  const envRoot = process.env.BREAKLINE_ROOT || process.env.BREAKLINE_HOME;
  if (envRoot) {
    const root = resolve(envRoot);
    if (existsSync(root)) {
      return root;
    }
    throw new Error(`BREAKLINE_ROOT/BREAKLINE_HOME set but path does not exist: ${root}`);
  }

  // 2. Walk up from current file location to find BreakLine installation markers
  // This file is at: {breakline-root}/ui-server/src/utils/breakline-root.ts
  // So we need to go up 3 levels to reach the installation root
  let current = dirname(__dirname); // from src/utils to src
  current = dirname(current); // from src to ui-server
  current = dirname(current); // from ui-server to breakline-root

  // Verify this is actually the BreakLine installation root
  const hasMindtraceRuntime = existsSync(resolve(current, 'mindtrace-ai-runtime'));
  const hasUiServer = existsSync(resolve(current, 'ui-server'));

  if (hasMindtraceRuntime && hasUiServer) {
    return current;
  }

  // Fallback: walk up from process.cwd()
  current = process.cwd();

  while (true) {
    const hasMindtraceRuntime = existsSync(resolve(current, 'mindtrace-ai-runtime'));
    const hasUiServer = existsSync(resolve(current, 'ui-server'));

    if (hasMindtraceRuntime && hasUiServer) {
      return current;
    }

    // Move to parent directory
    const parent = dirname(current);
    if (parent === current) {
      // Reached filesystem root without finding markers
      throw new Error(
        'Failed to resolve BreakLine installation root. ' +
          'Expected to find mindtrace-ai-runtime and ui-server directories. ' +
          'Set BREAKLINE_ROOT env var to specify explicitly.'
      );
    }

    current = parent;
  }
}

/**
 * Cached BreakLine installation root - computed once on first access
 */
let cachedBreaklineRoot: string | undefined;

/**
 * Get the BreakLine installation root (cached after first resolution)
 *
 * Use this for:
 * - Runtime CLI path
 * - Internal package/service resolution
 * - Producer packages
 */
export function getBreaklineRoot(): string {
  if (!cachedBreaklineRoot) {
    cachedBreaklineRoot = resolveBreaklineRoot();
  }
  return cachedBreaklineRoot;
}
