// mindtrace-ai-runtime/src/runtime/contract-plumbing.ts
//
// Phase 2.2 (additive):
// Provide runtime-level plumbing utilities to read the repo-generated Automation Contract
// and Page Semantic Cache context, without enforcing governance decisions.
//
// Phase 2.0 Integration:
// Modified to delegate to Phase 2.0 contract-awareness pipeline instead of using old implementation.
//
// Non-goals:
// - Do NOT change test execution behavior
// - Do NOT change governance pass/fail
// - Do NOT require contract presence (that is governed by policy and/or later phases)

import { existsSync, readFileSync } from "fs";
import { join } from "path";
import {
  loadContractBundle,
  validateContractBundle,
  verifyFingerprint,
  bindCacheToContract,
  buildRuntimeStrategyContext,
  writeContractAwarenessArtifact,
} from "../contract-awareness/index";
import type { RuntimeStrategyContext } from "../contract-awareness/index";

export type AutomationContractContextSnapshot = {
  ok: boolean;
  repoRoot: string;
  contractDir: string | null;
  cacheDir: string | null;
  warnings: string[];
  files: Record<string, string>;
  summary: Record<string, unknown>;
};

// Minimal, stable runtime-facing view.
// Later phases can add "data" / "pagesById" etc without breaking callers.
export type RuntimeContractContext = {
  ok: boolean;
  source: "artifacts" | "repo" | "missing";
  repoRoot: string | null;
  contractDir: string | null;
  cacheDir: string | null;
  warnings: string[];
  files: Record<string, string>;
  summary: Record<string, unknown>;
  notes: string[];
};

function safeJsonParse<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * Read the contract context snapshot that CLI writes into the run artifacts:
 * runs/<runName>/artifacts/automation-contract-context.json
 *
 * This is the *most portable* approach across repos because:
 * - CLI already determined repoRoot/layout
 * - timing is naturally correct (written before post-run artifacts)
 */
export function readAutomationContractContextFromArtifacts(
  artifactsDir: string
): RuntimeContractContext {
  const snapshotPath = join(artifactsDir, "automation-contract-context.json");
  if (!existsSync(snapshotPath)) {
    return {
      ok: false,
      source: "missing",
      repoRoot: null,
      contractDir: null,
      cacheDir: null,
      warnings: ["CONTRACT_CONTEXT_MISSING"],
      files: {},
      summary: {},
      notes: ["automation-contract-context.json not found in artifactsDir"],
    };
  }

  const raw = readFileSync(snapshotPath, "utf-8");
  const snap = safeJsonParse<AutomationContractContextSnapshot | null>(raw, null);

  if (!snap || typeof snap !== "object") {
    return {
      ok: false,
      source: "artifacts",
      repoRoot: null,
      contractDir: null,
      cacheDir: null,
      warnings: ["CONTRACT_CONTEXT_PARSE_FAILED"],
      files: {},
      summary: {},
      notes: ["automation-contract-context.json could not be parsed as JSON"],
    };
  }

  return {
    ok: Boolean(snap.ok),
    source: "artifacts",
    repoRoot: typeof snap.repoRoot === "string" ? snap.repoRoot : null,
    contractDir: typeof snap.contractDir === "string" ? snap.contractDir : null,
    cacheDir: typeof snap.cacheDir === "string" ? snap.cacheDir : null,
    warnings: Array.isArray(snap.warnings) ? snap.warnings.map(String) : [],
    files: snap.files && typeof snap.files === "object" ? (snap.files as Record<string, string>) : {},
    summary: snap.summary && typeof snap.summary === "object" ? (snap.summary as Record<string, unknown>) : {},
    notes: [],
  };
}

/**
 * Phase 2.2 convenience:
 * Prefer artifacts snapshot (run-specific), fall back to env var pointing at a snapshot.
 *
 * This stays additive and safe for different repos and timing differences because:
 * - artifacts snapshot is written per run
 * - env fallback is optional and non-fatal
 */
export function resolveRuntimeContractContext(args: {
  artifactsDir: string;
}): RuntimeContractContext {
  const fromArtifacts = readAutomationContractContextFromArtifacts(args.artifactsDir);
  if (fromArtifacts.ok) return fromArtifacts;

  const envPath = process.env.MINDTRACE_AUTOMATION_CONTRACT_CONTEXT_PATH;
  if (envPath && existsSync(envPath)) {
    const raw = readFileSync(envPath, "utf-8");
    const snap = safeJsonParse<AutomationContractContextSnapshot | null>(raw, null);
    if (snap && typeof snap === "object") {
      return {
        ok: Boolean(snap.ok),
        source: "repo",
        repoRoot: typeof snap.repoRoot === "string" ? snap.repoRoot : null,
        contractDir: typeof snap.contractDir === "string" ? snap.contractDir : null,
        cacheDir: typeof snap.cacheDir === "string" ? snap.cacheDir : null,
        warnings: Array.isArray(snap.warnings) ? snap.warnings.map(String) : [],
        files: snap.files && typeof snap.files === "object" ? (snap.files as Record<string, string>) : {},
        summary: snap.summary && typeof snap.summary === "object" ? (snap.summary as Record<string, unknown>) : {},
        notes: ["Loaded from MINDTRACE_AUTOMATION_CONTRACT_CONTEXT_PATH"],
      };
    }
  }

  // Return the original (non-ok) result, but annotate it.
  return {
    ...fromArtifacts,
    notes: [...fromArtifacts.notes, "No env fallback snapshot found"],
  };
}


/**
 * Result type for applyRuntimeContractContextEnv.
 *
 * Returns structured result instead of process.exit(3):
 * - ok: true if contract loaded successfully, false otherwise
 * - context: RuntimeStrategyContext from Phase 2.0 (or null on failure)
 * - exitCode: 3 for COMPLIANCE failures (undefined otherwise)
 * - warnings: non-critical issues (WARN severity)
 * - errors: critical issues (ERROR severity)
 */
export type ApplyRuntimeContractContextResult = {
  ok: boolean;
  context: RuntimeStrategyContext | null;
  exitCode?: number; // 3 for COMPLIANCE failures, undefined otherwise
  warnings: string[];
  errors: string[];
};

/**
 * Phase 2.2.3 (additive): export resolved contract context into environment variables
 * so runtime components can consume contract + page cache paths without re-scanning.
 *
 * Phase 2.0 Integration:
 * Now delegates to Phase 2.0 pipeline (load → validate → verify → bind → build → write)
 * instead of using old implementation.
 *
 * Non-goals:
 * - Must NOT affect governance/pass-fail (return exitCode signal instead)
 * - Must NOT throw (callers should wrap in try/catch anyway)
 */
export function applyRuntimeContractContextEnv(args: {
  artifactsDir: string;
  repoRoot: string;
  mode: "COMPLIANCE" | "BEST_EFFORT";
}): ApplyRuntimeContractContextResult {
  // Phase 2.0 Pipeline:
  // 1. Load contract bundle
  const contractBundle = loadContractBundle({
    repoRoot: args.repoRoot,
    mode: args.mode,
  });

  // If load failed, early return
  if (!contractBundle.ok) {
    const result: ApplyRuntimeContractContextResult = {
      ok: false,
      context: null,
      exitCode: args.mode === "COMPLIANCE" ? 3 : undefined,
      warnings: contractBundle.issues.filter((i) => i.severity === "WARN").map((i) => i.message),
      errors: contractBundle.issues.filter((i) => i.severity === "ERROR").map((i) => i.message),
    };

    // Note: Can't write artifact because we don't have a valid context
    // Set env var to point to where artifact would be written
    process.env.MINDTRACE_AUTOMATION_CONTRACT_CONTEXT_PATH = join(
      args.artifactsDir,
      "contract-awareness.json"
    );

    return result;
  }

  // 2. Validate contract bundle (AJV schemas)
  const validation = validateContractBundle(contractBundle);

  // 3. Verify fingerprint
  const fingerprint = verifyFingerprint(contractBundle);

  // 4. Bind cache to contract
  const cache = bindCacheToContract({
    repoRoot: args.repoRoot,
    contractHash: contractBundle.contractHash,
  });

  // 5. Build runtime strategy context
  const context = buildRuntimeStrategyContext({
    contractBundle,
    validation,
    fingerprint,
    cache,
  });

  // 6. Write contract awareness artifact
  writeContractAwarenessArtifact({
    artifactsDir: args.artifactsDir,
    context,
  });

  // 7. Set environment variables (Phase 2.2 compatibility)
  process.env.MINDTRACE_AUTOMATION_CONTRACT_CONTEXT_PATH = join(
    args.artifactsDir,
    "contract-awareness.json"
  );
  if (contractBundle.contractDir) {
    process.env.MINDTRACE_CONTRACT_DIR = contractBundle.contractDir;
  }
  if (cache.cacheDir) {
    process.env.MINDTRACE_PAGE_CACHE_DIR = cache.cacheDir;
  }

  // 8. Return result
  const warnings = context.issues.filter((i) => i.severity === "WARN").map((i) => i.message);
  const errors = context.issues.filter((i) => i.severity === "ERROR").map((i) => i.message);

  return {
    ok: context.ok,
    context,
    exitCode: !context.ok && args.mode === "COMPLIANCE" ? 3 : undefined,
    warnings,
    errors,
  };
}
