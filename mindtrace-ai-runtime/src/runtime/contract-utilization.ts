// mindtrace-ai-runtime/src/runtime/contract-utilization.ts
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join, resolve } from "path";

export type ContractUtilization = {
  schema_version: "0.1.0";
  generatedAt: string;
  repoRoot: string;

  // From AutomationContractContext
  contractOk: boolean;
  contractDir?: string | null;
  cacheDir?: string | null;
  warnings?: string[];

  files?: Record<string, string>;
  summary?: {
    hasFrameworkPattern?: boolean;
    hasSelectorStrategy?: boolean;
    hasAssertionStyle?: boolean;
    hasWrapperDiscovery?: boolean;
    pageCount?: number;
    pagesLoaded?: number;
  };

  // Derived / deterministic extra signal
  selectorOrder?: string[];
  wrapperSignals?: {
    locatorWrappers: number;
    assertionWrappers: number;
    retrySignals: number;
  };

  notes: string[];
};

function readJsonSafe<T = any>(p: string): T | null {
  try {
    return JSON.parse(readFileSync(p, "utf-8")) as T;
  } catch {
    return null;
  }
}

function countWrappers(wrapperDiscovery: any): { locatorWrappers: number; assertionWrappers: number; retrySignals: number } {
  const w = (wrapperDiscovery?.wrappers ?? wrapperDiscovery ?? {}) as any;
  return {
    locatorWrappers: Array.isArray(w.locatorWrappers) ? w.locatorWrappers.length : 0,
    assertionWrappers: Array.isArray(w.assertionWrappers) ? w.assertionWrappers.length : 0,
    retrySignals: Array.isArray(w.retrySignals) ? w.retrySignals.length : 0
  };
}

/**
 * Phase 2.1 (additive):
 * Emit a deterministic "contract-utilization.json" artifact showing what the runtime loaded.
 * This must NOT change gate decisions. It is observability-only.
 */
export function writeContractUtilizationArtifact(args: {
  repoRoot: string;
  artifactsDir: string;

  // The runtime already emits automation-contract-context.json (Phase 2.0).
  // If you pass that object in, great. If not, we’ll load it from disk.
  contractContext?: any;
}): string {
  const repoRoot = resolve(args.repoRoot);
  const artifactsDir = resolve(args.artifactsDir);

  const notes: string[] = [];

  const ctxPath = join(artifactsDir, "automation-contract-context.json");
  const ctx = args.contractContext ?? (existsSync(ctxPath) ? readJsonSafe<any>(ctxPath) : null);

  if (!ctx) {
    // Still write artifact deterministically to prove it was not available.
    const out: ContractUtilization = {
      schema_version: "0.1.0",
      generatedAt: new Date().toISOString(),
      repoRoot,
      contractOk: false,
      contractDir: null,
      cacheDir: null,
      warnings: ["CONTRACT_CONTEXT_MISSING"],
      files: {},
      summary: {},
      selectorOrder: [],
      wrapperSignals: { locatorWrappers: 0, assertionWrappers: 0, retrySignals: 0 },
      notes: ["automation-contract-context.json not found in artifactsDir"]
    };
    const outPath = join(artifactsDir, "contract-utilization.json");
    writeFileSync(outPath, JSON.stringify(out, null, 2), "utf-8");
    return outPath;
  }

  const files: Record<string, string> = (ctx.files && typeof ctx.files === "object") ? ctx.files : {};
  const contractOk = Boolean(ctx.ok);

  // Derive selector order deterministically (if selector-strategy.json exists)
  let selectorOrder: string[] = [];
  const selectorStrategyPath = files.selectorStrategy;
  if (selectorStrategyPath && existsSync(selectorStrategyPath)) {
    const ss = readJsonSafe<any>(selectorStrategyPath);
    const order = ss?.strategy?.order;
    if (Array.isArray(order)) selectorOrder = order.map((x: any) => String(x));
  } else {
    notes.push("selector-strategy.json missing/unreadable; selectorOrder empty");
  }

  // Wrapper signals
  let wrapperSignals = { locatorWrappers: 0, assertionWrappers: 0, retrySignals: 0 };
  const wrapperPath = files.wrapperDiscovery;
  if (wrapperPath && existsSync(wrapperPath)) {
    const wd = readJsonSafe<any>(wrapperPath);
    if (wd) wrapperSignals = countWrappers(wd);
  } else {
    notes.push("wrapper-discovery.json missing/unreadable; wrapperSignals zeroed");
  }

  const out: ContractUtilization = {
    schema_version: "0.1.0",
    generatedAt: new Date().toISOString(),
    repoRoot,
    contractOk,
    contractDir: ctx.contractDir ?? null,
    cacheDir: ctx.cacheDir ?? null,
    warnings: Array.isArray(ctx.warnings) ? ctx.warnings.map((w: any) => String(w)) : [],
    files,
    summary: (ctx.summary && typeof ctx.summary === "object") ? ctx.summary : {},
    selectorOrder,
    wrapperSignals,
    notes
  };

  const outPath = join(artifactsDir, "contract-utilization.json");
  writeFileSync(outPath, JSON.stringify(out, null, 2), "utf-8");
  return outPath;
}
