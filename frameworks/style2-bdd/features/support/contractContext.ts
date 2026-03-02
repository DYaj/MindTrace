import { existsSync, readFileSync } from "fs";

export type MindTraceRuntimeContractContext = {
  ok: boolean;
  source?: string;
  repoRoot?: string | null;
  contractDir?: string | null;
  cacheDir?: string | null;
  warnings?: string[];
  files?: Record<string, string>;
  summary?: Record<string, unknown>;
  notes?: string[];
};

function safeJsonParse<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * Contract Context reader (non-fatal).
 * Mirrors style1-native behavior: never throws, returns ok:false + warnings instead.
 */
export function getMindTraceContractContext(): MindTraceRuntimeContractContext {
  const p = process.env.MINDTRACE_AUTOMATION_CONTRACT_CONTEXT_PATH;
  if (!p) {
    return { ok: false, warnings: ["MINDTRACE_AUTOMATION_CONTRACT_CONTEXT_PATH_UNSET"] };
  }
  if (!existsSync(p)) {
    return { ok: false, warnings: ["CONTRACT_CONTEXT_PATH_MISSING"], notes: [p] };
  }

  const raw = readFileSync(p, "utf-8");
  const obj = safeJsonParse<any>(raw, null);

  if (!obj || typeof obj !== "object") {
    return { ok: false, warnings: ["CONTRACT_CONTEXT_PARSE_FAILED"], notes: [p] };
  }

  return {
    ok: Boolean(obj.ok),
    source: obj.source,
    repoRoot: obj.repoRoot ?? null,
    contractDir: obj.contractDir ?? null,
    cacheDir: obj.cacheDir ?? null,
    warnings: Array.isArray(obj.warnings) ? obj.warnings.map(String) : [],
    files: obj.files && typeof obj.files === "object" ? (obj.files as Record<string, string>) : {},
    summary: obj.summary && typeof obj.summary === "object" ? (obj.summary as Record<string, unknown>) : {},
    notes: Array.isArray(obj.notes) ? obj.notes.map(String) : [],
  };
}
