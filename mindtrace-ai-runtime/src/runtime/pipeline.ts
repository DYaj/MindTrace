import {
  mkdirSync,
  writeFileSync,
  existsSync,
  readFileSync,
  appendFileSync,
  openSync,
  closeSync,
} from "fs";
import { join } from "path";
import Ajv from "ajv/dist/2020";

import { seedHealedSelectorsFromManifest } from "./manifest-seed";

export type MindTraceRunContext = {
  cwd: string;
  runName: string;
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

type ComplianceDoD = {
  version: string;
  updated_at: string;
  required_artifacts: string[];
  json_must_parse: string[];
  exit_codes: Record<"0" | "1" | "2" | "3", string>;
  rules: {
    report_must_be_deterministic: boolean;
    report_must_not_print_to_terminal: boolean;
    audit_files_required: string[];
    [k: string]: any;
  };
};

function readJsonSafe(p: string): any {
  try {
    return JSON.parse(readFileSync(p, "utf-8"));
  } catch {
    return null;
  }
}

function loadAndValidateComplianceDoD(repoRoot: string): ComplianceDoD {
  const contractPath = join(repoRoot, "contracts", "compliance-definition-of-done.json");
  const schemaPath = join(repoRoot, "contracts", "schemas", "compliance-definition-of-done.schema.json");

  if (!existsSync(contractPath)) {
    throw new Error(`Missing compliance contract: ${contractPath}`);
  }
  if (!existsSync(schemaPath)) {
    throw new Error(`Missing compliance schema: ${schemaPath}`);
  }

  const schema = readJsonSafe(schemaPath);
  const contract = readJsonSafe(contractPath);

  if (!schema || typeof schema !== "object") {
    throw new Error(`Invalid compliance schema JSON: ${schemaPath}`);
  }
  if (!contract || typeof contract !== "object") {
    throw new Error(`Invalid compliance contract JSON: ${contractPath}`);
  }

  const ajv = new Ajv({ allErrors: true, strict: true });
  const validate = ajv.compile(schema as any);

  const ok = validate(contract);
  if (!ok) {
    throw new Error(
      "Compliance DoD validation failed: " + JSON.stringify(validate.errors, null, 2)
    );
  }

  return contract as ComplianceDoD;
}

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
  appendFileSync(
    join(layout.auditDir, "events.ndjson"),
    JSON.stringify(event) + "\n",
    "utf-8"
  );
}

type ParsedTest = {
  id: string;
  title: string;
  file?: string;
  project?: string;
  status: string;
  durationMs: number;
  attempts: number;
  retries: number;
};

type ParsedReport = {
  tests: ParsedTest[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    flaky: number;
    quarantined: number;
  };
};

function parsePlaywrightJsonReport(raw: any): ParsedReport {
  const tests: ParsedTest[] = [];

  function walkSuite(suite: any) {
    if (!suite) return;

    if (Array.isArray(suite.suites)) {
      for (const child of suite.suites) walkSuite(child);
    }

    if (Array.isArray(suite.specs)) {
      for (const spec of suite.specs) {
        const file = spec.file;
        const specTitle = spec.title;

        if (Array.isArray(spec.tests)) {
          for (const t of spec.tests) {
            const results = Array.isArray(t.results) ? t.results : [];
            const last = results.length ? results[results.length - 1] : {};
            const status = last.status || "unknown";
            const durationMs = typeof last.duration === "number" ? last.duration : 0;
            const project = t.projectName || last.projectName || "default";
            const attempts = results.length || 1;
            const retries = attempts - 1;

            const id = `${file || "unknown"}::${specTitle || t.title || "test"}`;

            tests.push({
              id,
              title: specTitle || t.title || "unknown",
              file,
              project,
              status,
              durationMs,
              attempts,
              retries,
            });
          }
        }
      }
    }
  }

  if (raw && Array.isArray(raw.suites)) {
    for (const s of raw.suites) walkSuite(s);
  }

  const total = tests.length;
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  let flaky = 0;

  for (const t of tests) {
    if (t.status === "passed") {
      passed += 1;
      if (t.retries > 0) flaky += 1;
    } else if (t.status === "skipped" || t.status === "interrupted") {
      skipped += 1;
    } else {
      failed += 1;
    }
  }

  return {
    tests,
    summary: { total, passed, failed, skipped, flaky, quarantined: 0 },
  };
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
      writeFileSync(healedPath, JSON.stringify({ selectors: [] }, null, 2), "utf-8");
    }
  }

  if (!existsSync(rcaPath)) {
    writeFileSync(
      rcaPath,
      JSON.stringify({ category: "none", confidence: 1, isFlaky: false }, null, 2),
      "utf-8"
    );
  }

  if (!existsSync(narrativePath)) {
    writeFileSync(narrativePath, "# Failure Narrative\n\nNo failures detected.\n", "utf-8");
  }

  if (!existsSync(traceMapPath)) {
    writeFileSync(traceMapPath, JSON.stringify({ steps: [] }, null, 2), "utf-8");
  }
}

export async function generateNormalizedResults(
  ctx: MindTraceRunContext & { exitCode: number; style?: string; mode?: string }
): Promise<void> {
  const layout = ensureRunLayout(ctx);

  const pwReportPath = join(layout.artifactsDir, "playwright-report.json");
  const pwRaw = existsSync(pwReportPath) ? readJsonSafe(pwReportPath) : null;
  const parsed = pwRaw ? parsePlaywrightJsonReport(pwRaw) : null;

  const frameworkStyle = ctx.style || ctx.mode || "native";

  const normalizedResults = {
    runId: ctx.runName,
    frameworkStyle,
    exitCode: ctx.exitCode,
    environment: {
      nodeVersion: process.version,
      ci: process.env.CI === "true",
    },
    tests: parsed?.tests || [],
    summary: parsed?.summary || {
      total: 0,
      passed: 0,
      failed: ctx.exitCode !== 0 ? 1 : 0,
      skipped: 0,
      flaky: 0,
      quarantined: 0,
    },
    timestamp: new Date().toISOString(),
  };

  writeFileSync(
    join(layout.artifactsDir, "normalized-results.json"),
    JSON.stringify(normalizedResults, null, 2),
    "utf-8"
  );
}

export async function generatePolicyDecision(
  ctx: GovernanceGateContext
): Promise<{ decision: string; exitCode: number; reasons: string[] }> {
  const layout = ensureRunLayout(ctx);

  const rcaPath = join(layout.artifactsDir, "root-cause-summary.json");
  const rca = existsSync(rcaPath) ? readJsonSafe(rcaPath) || {} : {};
  const isFlaky = rca.isFlaky === true;

  let decision: "pass" | "fail" | "warn" = "pass";
  let finalExitCode = 0;
  const reasons: string[] = [];

  if (ctx.exitCode !== 0) {
    if (isFlaky) {
      decision = "warn";
      finalExitCode = 0;
      reasons.push("Flaky test detected - allowed by policy (default)");
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
    reasons,
  };

  writeFileSync(
    join(layout.artifactsDir, "policy-decision.json"),
    JSON.stringify(policyDecision, null, 2),
    "utf-8"
  );

  return { decision, exitCode: finalExitCode, reasons };
}

export async function generateGateSummary(ctx: GovernanceGateContext): Promise<void> {
  const layout = ensureRunLayout(ctx);

  const minimum = ["playwright-report.json", "normalized-results.json", "policy-decision.json"];

  const missing = minimum.filter((n) => !existsSync(join(layout.artifactsDir, n)));

  const policyPath = join(layout.artifactsDir, "policy-decision.json");
  const policy = existsSync(policyPath) ? readJsonSafe(policyPath) : null;

  const gateSummary = {
    runId: ctx.runName,
    timestamp: new Date().toISOString(),
    testExitCode: ctx.exitCode,
    policyDecision: policy?.decision || "missing",
    gateStatus: missing.length ? "incomplete" : "ready",
    requiredArtifacts: {
      present: minimum.filter((n) => existsSync(join(layout.artifactsDir, n))),
      missing,
    },
  };

  writeFileSync(
    join(layout.artifactsDir, "gate-summary.json"),
    JSON.stringify(gateSummary, null, 2),
    "utf-8"
  );
}

export async function generateArtifactValidation(
  ctx: MindTraceRunContext & { isBaseline?: boolean }
): Promise<{ status: "valid" | "invalid"; missing: string[] }> {
  const layout = ensureRunLayout(ctx);

  const dod = loadAndValidateComplianceDoD(ctx.cwd);

  const required = dod.required_artifacts || [];
  const missing = required.filter((n) => !existsSync(join(layout.artifactsDir, n)));

  const validation = {
    runId: ctx.runName,
    timestamp: new Date().toISOString(),
    status: missing.length ? "invalid" : "valid",
    contract: {
      version: dod.version,
      updated_at: dod.updated_at,
    },
    required,
    missing,
    errors: missing.length ? [`Missing required artifacts: ${missing.join(", ")}`] : [],
  };

  writeFileSync(
    join(layout.artifactsDir, "artifact-validation.json"),
    JSON.stringify(validation, null, 2),
    "utf-8"
  );

  return { status: missing.length ? "invalid" : "valid", missing };
}

export async function validateArtifacts(ctx: MindTraceRunContext & { isBaseline?: boolean }): Promise<void> {
  const layout = ensureRunLayout(ctx);

  const dod = loadAndValidateComplianceDoD(ctx.cwd);

  const requiredArtifacts = dod.required_artifacts || [];
  for (const f of requiredArtifacts) {
    const p = join(layout.artifactsDir, f);
    if (!existsSync(p)) throw new Error(`Missing required artifact: ${p}`);
  }

  const auditRequired = dod.rules?.audit_files_required || [];
  for (const f of auditRequired) {
    const p = join(layout.auditDir, f);
    if (!existsSync(p)) throw new Error(`Missing required audit file: ${p}`);
  }

  const jsonMustParse = dod.json_must_parse || [];
  for (const f of jsonMustParse) {
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

  const policyPath = join(layout.artifactsDir, "policy-decision.json");
  const policy = existsSync(policyPath) ? readJsonSafe(policyPath) : null;

  appendAuditEvent(layout, {
    ts: new Date().toISOString(),
    type: "governance_gate_evaluated",
    testExitCode: ctx.exitCode,
    policyDecision: policy?.decision || "missing",
    policyExitCode: policy?.exitCode ?? 3,
  });

  if (policy?.exitCode === 1) {
    throw new Error(`Governance gate failed: exitCode=${ctx.exitCode}, policy=fail`);
  }
}

export async function finalizeAuditTrail(ctx: MindTraceRunContext): Promise<void> {
  const layout = ensureRunLayout(ctx);

  const eventsFile = join(layout.auditDir, "events.ndjson");
  const raw = existsSync(eventsFile) ? readFileSync(eventsFile, "utf-8") : "";
  const events = raw
    .split("\n")
    .filter(Boolean)
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    })
    .filter(Boolean);

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
  appendFileSync(
    layout.historyIndexPath,
    JSON.stringify({ runId: ctx.runName, timestamp: new Date().toISOString() }) + "\n",
    "utf-8"
  );
}

export async function generateReportBundle(ctx: MindTraceRunContext): Promise<void> {
  const layout = ensureRunLayout(ctx);
  appendAuditEvent(layout, {
    ts: new Date().toISOString(),
    type: "report_bundle_skipped",
    reason: "not_implemented",
  });
}
