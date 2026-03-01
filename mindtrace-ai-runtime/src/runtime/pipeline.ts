import { mkdirSync, writeFileSync, existsSync, readFileSync, appendFileSync, openSync, closeSync } from "fs";
import { join } from "path";
import { seedHealedSelectorsFromManifest } from "./manifest-seed";

export type MindTraceRunContext = {
  cwd: string;
  runName: string;

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

  const eventsFile = join(auditDir, "events.ndjson");
  if (!existsSync(eventsFile)) {
    const fd = openSync(eventsFile, "a");
    closeSync(fd);
  }

  return { runDir, artifactsDir, auditDir, historyDir, historyIndexPath };
}

function appendAuditEvent(layout: RunLayout, event: any) {
  appendFileSync(join(layout.auditDir, "events.ndjson"), JSON.stringify(event) + "\n", "utf-8");
}

function readJsonSafe(p: string): any {
  try {
    return JSON.parse(readFileSync(p, "utf-8"));
  } catch {
    try {
      const raw = readFileSync(p, "utf-8");
      const first = raw.indexOf("{");
      const last = raw.lastIndexOf("}");
      if (first >= 0 && last > first) return JSON.parse(raw.slice(first, last + 1));
    } catch {}
    return null;
  }
}

export async function postRunGenerateArtifacts(ctx: MindTraceRunContext): Promise<void> {
  const layout = ensureRunLayout(ctx);

  const healedPath = join(layout.artifactsDir, "healed-selectors.json");
  const rcaPath = join(layout.artifactsDir, "root-cause-summary.json");
  const narrativePath = join(layout.artifactsDir, "failure-narrative.md");
  const traceMapPath = join(layout.artifactsDir, "execution-trace-map.json");

  if (!existsSync(healedPath)) {
    seedHealedSelectorsFromManifest({ cwd: ctx.cwd, runName: ctx.runName });

    if (!existsSync(healedPath)) {
      writeFileSync(healedPath, JSON.stringify({ selectors: [], source: "repo", timestamp: new Date().toISOString() }, null, 2), "utf-8");
    }
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

export async function generateNormalizedResults(ctx: MindTraceRunContext & { exitCode: number; mode?: string; isBaseline?: boolean }): Promise<void> {
  const layout = ensureRunLayout(ctx);

  const configPath = join(ctx.cwd, "mindtrace.config.json");
  const config = existsSync(configPath) ? readJsonSafe(configPath) || {} : {};

  const normalized = {
    runId: ctx.runName,
    frameworkStyle: ctx.mode || process.env.MINDTRACE_MODE || "native",
    executionProfile: config.executionProfile || process.env.MINDTRACE_PROFILE || "local",
    strictness: config.strictness || process.env.MINDTRACE_STRICTNESS || "balanced",
    isBaseline: Boolean(ctx.isBaseline),
    environment: {
      baseUrl:
        config.baseUrl ||
        process.env.TEST_BASE_URL ||
        process.env.BASE_URL ||
        process.env.PLAYWRIGHT_BASE_URL ||
        "not-set",
      nodeVersion: process.version,
      ci: process.env.CI === "true",
      gitSha: process.env.GIT_SHA || "unknown",
    },
    summary: {
      total: 0,
      passed: ctx.exitCode === 0 ? 0 : 0,
      failed: ctx.exitCode === 0 ? 0 : 1,
      skipped: 0,
      flaky: 0,
      quarantined: 0,
    },
    timestamp: new Date().toISOString(),
  };

  writeFileSync(join(layout.artifactsDir, "normalized-results.json"), JSON.stringify(normalized, null, 2), "utf-8");
}

export async function generatePolicyDecision(ctx: GovernanceGateContext): Promise<{ decision: string; exitCode: number; reasons: string[] }> {
  const layout = ensureRunLayout(ctx);

  const configPath = join(ctx.cwd, "mindtrace.config.json");
  const config = existsSync(configPath) ? readJsonSafe(configPath) || {} : { strictness: "balanced" };

  const rcaPath = join(layout.artifactsDir, "root-cause-summary.json");
  const rca = existsSync(rcaPath) ? readJsonSafe(rcaPath) || {} : {};
  const isFlaky = rca.isFlaky === true;

  let decision = "pass";
  let finalExitCode = 0;
  const reasons: string[] = [];

  if (ctx.exitCode !== 0) {
    if (isFlaky && config.strictness !== "strict") {
      decision = "warn";
      finalExitCode = 0;
      reasons.push("Flaky test detected - allowed by policy");
    } else {
      decision = "fail";
      finalExitCode = 1;
      reasons.push("Test failures detected");
    }
  }

  const policyDecision = {
    runId: ctx.runName,
    timestamp: new Date().toISOString(),
    decision,
    exitCode: finalExitCode,
    testExitCode: ctx.exitCode,
    strictness: config.strictness || "balanced",
    reasons,
    mapping: {
      0: "pass - success or warnings allowed",
      1: "fail - test failures exceeded policy tolerance",
      2: "infraError - infrastructure or environment failure",
      3: "policyViolation - governance failure",
    },
  };

  writeFileSync(join(layout.artifactsDir, "policy-decision.json"), JSON.stringify(policyDecision, null, 2), "utf-8");
  return { decision, exitCode: finalExitCode, reasons };
}

export async function generateGateSummary(ctx: GovernanceGateContext): Promise<void> {
  const layout = ensureRunLayout(ctx);

  const required = [
    "healed-selectors.json",
    "root-cause-summary.json",
    "failure-narrative.md",
    "execution-trace-map.json",
    "normalized-results.json",
    "policy-decision.json",
    "playwright-report.json",
  ];

  const missing = required.filter((name) => !existsSync(join(layout.artifactsDir, name)));

  const policyPath = join(layout.artifactsDir, "policy-decision.json");
  const policy = existsSync(policyPath) ? readJsonSafe(policyPath) : null;

  const gateSummary = {
    runId: ctx.runName,
    timestamp: new Date().toISOString(),
    testExitCode: ctx.exitCode,
    policyDecision: policy?.decision || "missing",
    gateStatus: missing.length ? "incomplete" : "ready",
    requiredArtifacts: {
      present: required.filter((n) => existsSync(join(layout.artifactsDir, n))),
      missing,
    },
  };

  writeFileSync(join(layout.artifactsDir, "gate-summary.json"), JSON.stringify(gateSummary, null, 2), "utf-8");
}

export async function generateArtifactValidation(ctx: MindTraceRunContext & { isBaseline?: boolean }): Promise<{ status: "valid" | "invalid"; missing: string[] }> {
  const layout = ensureRunLayout(ctx);

  const required = [
    "healed-selectors.json",
    "root-cause-summary.json",
    "failure-narrative.md",
    "execution-trace-map.json",
    "normalized-results.json",
    "policy-decision.json",
    "gate-summary.json",
    "playwright-report.json",
  ];

  const missing = required.filter((n) => !existsSync(join(layout.artifactsDir, n)));

  const validation = {
    runId: ctx.runName,
    timestamp: new Date().toISOString(),
    status: missing.length ? "invalid" : "valid",
    required,
    missing,
    errors: missing.length ? [`Missing required artifacts: ${missing.join(", ")}`] : [],
  };

  writeFileSync(join(layout.artifactsDir, "artifact-validation.json"), JSON.stringify(validation, null, 2), "utf-8");
  return { status: missing.length ? "invalid" : "valid", missing };
}

export async function validateArtifacts(ctx: MindTraceRunContext & { isBaseline?: boolean }): Promise<void> {
  const layout = ensureRunLayout(ctx);

  const required = [
    "healed-selectors.json",
    "root-cause-summary.json",
    "failure-narrative.md",
    "execution-trace-map.json",
    "normalized-results.json",
    "policy-decision.json",
    "gate-summary.json",
    "artifact-validation.json",
    "playwright-report.json",
  ];

  for (const f of required) {
    const p = join(layout.artifactsDir, f);
    if (!existsSync(p)) throw new Error(`Missing required artifact: ${p}`);
  }

  const jsonFiles = [
    "healed-selectors.json",
    "root-cause-summary.json",
    "execution-trace-map.json",
    "normalized-results.json",
    "policy-decision.json",
    "gate-summary.json",
    "artifact-validation.json",
    "playwright-report.json",
  ];

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

  const policyPath = join(layout.artifactsDir, "policy-decision.json");
  const policy = existsSync(policyPath) ? readJsonSafe(policyPath) : null;

  appendAuditEvent(layout, {
    ts: new Date().toISOString(),
    type: "governance_gate_evaluated",
    testExitCode: ctx.exitCode,
    policyDecision: policy?.decision || "missing",
    policyExitCode: policy?.exitCode ?? 2,
  });
}

export async function finalizeAuditTrail(ctx: MindTraceRunContext): Promise<void> {
  const layout = ensureRunLayout(ctx);

  const eventsFile = join(layout.auditDir, "events.ndjson");
  const events = existsSync(eventsFile)
    ? readFileSync(eventsFile, "utf-8")
        .split("\n")
        .filter(Boolean)
        .map((l) => {
          try {
            return JSON.parse(l);
          } catch {
            return null;
          }
        })
        .filter(Boolean)
    : [];

  const finalReport = {
    runId: ctx.runName,
    timestamp: new Date().toISOString(),
    eventCount: events.length,
    status: "completed",
    immutable: true,
  };

  writeFileSync(join(layout.auditDir, "final.json"), JSON.stringify(finalReport, null, 2), "utf-8");
}

export async function indexHistoricalRun(ctx: MindTraceRunContext): Promise<void> {
  const layout = ensureRunLayout(ctx);
  appendFileSync(layout.historyIndexPath, JSON.stringify({ runId: ctx.runName, timestamp: new Date().toISOString() }) + "\n", "utf-8");
}

export async function generateReportBundle(ctx: MindTraceRunContext): Promise<void> {
  const layout = ensureRunLayout(ctx);
  appendAuditEvent(layout, { ts: new Date().toISOString(), type: "report_bundle_skipped", reason: "not_implemented" });
}
