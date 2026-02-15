import { mkdirSync, writeFileSync, existsSync, readFileSync, appendFileSync } from "fs";
import { join } from "path";

export type MindTraceRunContext = {
  cwd: string;
  runName: string;

  // Optional report controls (passed by CLI)
  outputDir?: string;
  format?: string;
};

export type GovernanceGateContext = MindTraceRunContext & {
  exitCode: number;
};

export type RunLayout = {
  runDir: string;
  artifactsDir: string;
  auditDir: string;
  historyDir: string;
  historyIndexPath: string;
};

export function ensureRunLayout(ctx: MindTraceRunContext): RunLayout {
  const runDir = join(ctx.cwd, "runs", ctx.runName);
  const artifactsDir = join(runDir, "artifacts");
  const auditDir = join(runDir, "audit");
  const historyDir = join(ctx.cwd, "history");
  const historyIndexPath = join(historyDir, "run-index.jsonl");

  mkdirSync(runDir, { recursive: true });
  mkdirSync(artifactsDir, { recursive: true });
  mkdirSync(auditDir, { recursive: true });
  mkdirSync(historyDir, { recursive: true });

  return { runDir, artifactsDir, auditDir, historyDir, historyIndexPath };
}

export async function postRunGenerateArtifacts(ctx: MindTraceRunContext): Promise<void> {
  const layout = ensureRunLayout(ctx);

  const healedPath = join(layout.artifactsDir, "healed-selectors.json");
  const rcaPath = join(layout.artifactsDir, "root-cause-summary.json");
  const narrativePath = join(layout.artifactsDir, "failure-narrative.md");
  const traceMapPath = join(layout.artifactsDir, "execution-trace-map.json");

  if (!existsSync(healedPath)) {
    writeFileSync(healedPath, JSON.stringify({ selectors: [] }, null, 2), "utf-8");
  }
  if (!existsSync(rcaPath)) {
    writeFileSync(rcaPath, JSON.stringify({ category: "none", confidence: 1, isFlaky: false }, null, 2), "utf-8");
  }
  if (!existsSync(narrativePath)) {
    writeFileSync(narrativePath, "# Failure Narrative\n\nNo failures detected.\n", "utf-8");
  }
  if (!existsSync(traceMapPath)) {
    writeFileSync(traceMapPath, JSON.stringify({ steps: [] }, null, 2), "utf-8");
  }
}

export async function validateArtifacts(ctx: MindTraceRunContext): Promise<void> {
  const layout = ensureRunLayout(ctx);

  const required = ["healed-selectors.json", "root-cause-summary.json", "failure-narrative.md", "execution-trace-map.json"];

  for (const f of required) {
    const p = join(layout.artifactsDir, f);
    if (!existsSync(p)) {
      throw new Error(`Missing required artifact: ${p}`);
    }
  }

  const jsonFiles = ["healed-selectors.json", "root-cause-summary.json", "execution-trace-map.json"];
  for (const f of jsonFiles) {
    const p = join(layout.artifactsDir, f);
    try {
      JSON.parse(readFileSync(p, "utf-8"));
    } catch {
      throw new Error(`Invalid JSON artifact: ${p}`);
    }
  }
}

export async function governanceGate(ctx: GovernanceGateContext): Promise<void> {
  const layout = ensureRunLayout(ctx);

  const rcaPath = join(layout.artifactsDir, "root-cause-summary.json");
  const rcaRaw = existsSync(rcaPath) ? readFileSync(rcaPath, "utf-8") : "{}";
  const rca = JSON.parse(rcaRaw || "{}");

  const isFlaky = Boolean((rca as any).isFlaky);

  if (ctx.exitCode !== 0 && !isFlaky) {
    throw new Error(`Governance gate failed: exitCode=${ctx.exitCode}, isFlaky=${isFlaky}`);
  }
}

export async function finalizeAuditTrail(ctx: MindTraceRunContext): Promise<void> {
  const layout = ensureRunLayout(ctx);

  const eventsPath = join(layout.auditDir, "events.ndjson");
  const finalPath = join(layout.auditDir, "final.json");

  const event = {
    ts: new Date().toISOString(),
    runName: ctx.runName,
    type: "finalize"
  };

  appendFileSync(eventsPath, JSON.stringify(event) + "\n", "utf-8");

  const final = {
    runName: ctx.runName,
    finalizedAt: new Date().toISOString(),
    eventsPath
  };

  writeFileSync(finalPath, JSON.stringify(final, null, 2), "utf-8");
}

export async function indexHistoricalRun(ctx: MindTraceRunContext): Promise<void> {
  const layout = ensureRunLayout(ctx);

  const rcaPath = join(layout.artifactsDir, "root-cause-summary.json");
  const rcaRaw = existsSync(rcaPath) ? readFileSync(rcaPath, "utf-8") : "{}";
  const rca = JSON.parse(rcaRaw || "{}");

  const record = {
    ts: new Date().toISOString(),
    runName: ctx.runName,
    category: (rca as any).category ?? "unknown",
    confidence: (rca as any).confidence ?? 0,
    isFlaky: Boolean((rca as any).isFlaky)
  };

  appendFileSync(layout.historyIndexPath, JSON.stringify(record) + "\n", "utf-8");
}

export async function generateReportBundle(ctx: MindTraceRunContext): Promise<void> {
  const layout = ensureRunLayout(ctx);

  const reportDir = ctx.outputDir ? join(ctx.cwd, ctx.outputDir) : join(ctx.cwd, "reports");

  mkdirSync(reportDir, { recursive: true });

  const rcaPath = join(layout.artifactsDir, "root-cause-summary.json");
  const narrativePath = join(layout.artifactsDir, "failure-narrative.md");

  const rcaRaw = existsSync(rcaPath) ? readFileSync(rcaPath, "utf-8") : "{}";
  const narrative = existsSync(narrativePath) ? readFileSync(narrativePath, "utf-8") : "No narrative.\n";

  const out = [`# MindTrace Report`, ``, `Run: **${ctx.runName}**`, ``, `## Failure Narrative`, narrative.trim(), ``, `## RCA Summary`, "```json", rcaRaw.trim(), "```", ``].join(
    "\n"
  );

  writeFileSync(join(reportDir, `mindtrace-report-${ctx.runName}.md`), out, "utf-8");
}
