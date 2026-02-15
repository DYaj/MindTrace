import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join, resolve } from "path";

export type MindTraceRunContext = {
  runName: string;
  baseDir: string;
  runsDir: string;
  runDir: string;
  artifactsDir: string;
  auditDir: string;
  historyDir: string;
};

function ensureDir(p: string) {
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
}

export function ensureRunLayout(runName: string, baseDir?: string): MindTraceRunContext {
  const resolvedBase = baseDir ? resolve(baseDir) : resolve(process.cwd());
  const runsDir = join(resolvedBase, "runs");
  const runDir = join(runsDir, runName);
  const artifactsDir = join(runDir, "artifacts");
  const auditDir = join(runDir, "audit");
  const historyDir = join(resolvedBase, "history");

  ensureDir(runsDir);
  ensureDir(runDir);
  ensureDir(artifactsDir);
  ensureDir(auditDir);
  ensureDir(historyDir);

  // minimal metadata for traceability (safe/no breaking)
  const metaPath = join(runDir, "run.json");
  if (!existsSync(metaPath)) {
    writeFileSync(
      metaPath,
      JSON.stringify(
        {
          runName,
          createdAt: new Date().toISOString(),
          baseDir: resolvedBase
        },
        null,
        2
      )
    );
  }

  return {
    runName,
    baseDir: resolvedBase,
    runsDir,
    runDir,
    artifactsDir,
    auditDir,
    historyDir
  };
}

/**
 * Post-run artifact generation hook.
 * Minimal placeholder: ensures directories exist. Real generation can be wired later.
 */
export async function postRunGenerateArtifacts(ctx: MindTraceRunContext): Promise<void> {
  ensureDir(ctx.artifactsDir);
}

/**
 * Artifact validation hook (placeholder).
 * In a stricter implementation, you’d check required artifact files/JSON schemas.
 */
export async function validateArtifacts(ctx: MindTraceRunContext): Promise<void> {
  ensureDir(ctx.artifactsDir);
}

/**
 * Governance gate hook (placeholder).
 * In a strict implementation, you’d read RCA results and decide pass/fail.
 */
export async function governanceGate(ctx: MindTraceRunContext): Promise<void> {
  // noop (do not break existing pipeline)
}

/**
 * Audit trail finalization hook (placeholder).
 * Creates empty ndjson/final.json if missing to avoid downstream failures.
 */
export async function finalizeAuditTrail(ctx: MindTraceRunContext): Promise<void> {
  ensureDir(ctx.auditDir);

  const eventsPath = join(ctx.auditDir, "events.ndjson");
  if (!existsSync(eventsPath)) {
    writeFileSync(eventsPath, "");
  }

  const finalPath = join(ctx.auditDir, "final.json");
  if (!existsSync(finalPath)) {
    writeFileSync(
      finalPath,
      JSON.stringify(
        {
          runName: ctx.runName,
          finalizedAt: new Date().toISOString()
        },
        null,
        2
      )
    );
  }
}

/**
 * Historical run indexing hook (placeholder).
 * Appends a single JSON line into history/run-index.jsonl
 */
export async function indexHistoricalRun(ctx: MindTraceRunContext): Promise<void> {
  ensureDir(ctx.historyDir);
  const indexPath = join(ctx.historyDir, "run-index.jsonl");

  const line =
    JSON.stringify(
      {
        runName: ctx.runName,
        runDir: ctx.runDir,
        indexedAt: new Date().toISOString()
      },
      null,
      0
    ) + "\n";

  // append without importing fs/promises to keep this minimal + compatible
  const fs = await import("fs");
  fs.appendFileSync(indexPath, line);
}

/**
 * Report bundling hook (placeholder).
 */
export async function generateReportBundle(ctx: MindTraceRunContext): Promise<void> {
  // noop (report generation handled elsewhere)
}
