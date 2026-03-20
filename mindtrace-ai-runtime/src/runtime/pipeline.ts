// mindtrace-ai-runtime/src/runtime/pipeline.ts
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

// Safe interop for NodeNext ESM/CJS variance
import Ajv2020Import from "ajv/dist/2020.js";
const Ajv2020: any = (Ajv2020Import as any)?.default ?? (Ajv2020Import as any);

import { seedHealedSelectorsFromManifest } from "./manifest-seed.js";

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
  // Compliance DoD comes from BreakLine installation, not target repo
  // This ensures all repos use the same governance rules
  const breaklineRoot = process.env.BREAKLINE_ROOT || repoRoot;
  const contractPath = join(breaklineRoot, "contracts", "compliance-definition-of-done.json");
  const schemaPath = join(breaklineRoot, "contracts", "schemas", "compliance-definition-of-done.schema.json");

  if (!existsSync(contractPath)) throw new Error(`Missing compliance contract: ${contractPath}`);
  if (!existsSync(schemaPath)) throw new Error(`Missing compliance schema: ${schemaPath}`);

  const schema = readJsonSafe(schemaPath);
  const contract = readJsonSafe(contractPath);

  if (!schema || typeof schema !== "object") throw new Error(`Invalid compliance schema JSON: ${schemaPath}`);
  if (!contract || typeof contract !== "object") throw new Error(`Invalid compliance contract JSON: ${contractPath}`);

  const ajv = new Ajv2020({ allErrors: true, strict: true });
  const validate = ajv.compile(schema as any);

  const ok = validate(contract);
  if (!ok) {
    throw new Error("Compliance DoD validation failed: " + JSON.stringify(validate.errors, null, 2));
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
  appendFileSync(join(layout.auditDir, "events.ndjson"), JSON.stringify(event) + "\n", "utf-8");
}

type ParsedTest = {
  id: string;
  title: string;
  file?: string;
  status: "passed" | "failed" | "skipped";
  duration_ms?: number;
  error?: string;
};

/**
 * Backward-compatible:
 * - New style: generateNormalizedResults(layout, rawPlaywrightReport)
 * - Old CLI style: generateNormalizedResults(ctx)
 */
export async function generateNormalizedResults(
  layoutOrCtx: RunLayout | MindTraceRunContext,
  rawPlaywrightReport?: any
) {
  const layout: RunLayout =
    "runDir" in layoutOrCtx ? layoutOrCtx : ensureRunLayout(layoutOrCtx);

  const report =
    rawPlaywrightReport ??
    readJsonSafe(join(layout.artifactsDir, "playwright-report.json")) ??
    { suites: [] };

  const tests: ParsedTest[] = [];

  const suites = report?.suites || [];
  for (const suite of suites) {
    for (const spec of suite.specs || []) {
      for (const test of spec.tests || []) {
        const result = (test.results && test.results[0]) || {};
        const status = (result.status || "skipped") as ParsedTest["status"];
        const err = result.error?.message || result.error?.stack || null;

        tests.push({
          id: test.testId || spec.title,
          title: spec.title,
          file: spec.file,
          status,
          duration_ms: result.duration,
          error: err || undefined,
        });
      }
    }
  }

  const out = {
    generated_at: new Date().toISOString(),
    tests,
    summary: {
      total: tests.length,
      passed: tests.filter((t) => t.status === "passed").length,
      failed: tests.filter((t) => t.status === "failed").length,
      skipped: tests.filter((t) => t.status === "skipped").length,
    },
  };

  writeFileSync(join(layout.artifactsDir, "normalized-results.json"), JSON.stringify(out, null, 2));
  return out;
}

/**
 * Backward-compatible:
 * - New style: generatePolicyDecision(layout, normalized)
 * - Old CLI style: generatePolicyDecision(ctx)
 */
export async function generatePolicyDecision(layoutOrCtx: RunLayout | MindTraceRunContext, normalized?: any) {
  const layout: RunLayout =
    "runDir" in layoutOrCtx ? layoutOrCtx : ensureRunLayout(layoutOrCtx);

  const norm =
    normalized ??
    readJsonSafe(join(layout.artifactsDir, "normalized-results.json")) ??
    { summary: { failed: 0 } };

  const failed = norm?.summary?.failed || 0;
  const decision = failed > 0 ? "fail" : "pass";

  const out = {
    generated_at: new Date().toISOString(),
    decision,
    reasons: failed > 0 ? ["tests_failed"] : [],
  };

  writeFileSync(join(layout.artifactsDir, "policy-decision.json"), JSON.stringify(out, null, 2));
  return out;
}

/**
 * Backward-compatible:
 * - New style: generateGateSummary(layout, ctx, policy)
 * - Old CLI style: generateGateSummary({ cwd, runName, exitCode })
 */
export async function generateGateSummary(
  layoutOrCtx: RunLayout | GovernanceGateContext,
  ctxMaybe?: GovernanceGateContext,
  policyMaybe?: any
) {
  let layout: RunLayout;
  let ctx: GovernanceGateContext;

  if ("runDir" in layoutOrCtx) {
    layout = layoutOrCtx;
    if (!ctxMaybe) throw new Error("generateGateSummary(layout, ctx, policy) requires ctx");
    ctx = ctxMaybe;
  } else {
    ctx = layoutOrCtx;
    layout = ensureRunLayout(ctx);
  }

  const policy =
    policyMaybe ??
    readJsonSafe(join(layout.artifactsDir, "policy-decision.json")) ??
    { decision: "unknown" };

  const out = {
    generated_at: new Date().toISOString(),
    runName: ctx.runName,
    exitCode: ctx.exitCode,
    policy: policy?.decision || "unknown",
  };

  writeFileSync(join(layout.artifactsDir, "gate-summary.json"), JSON.stringify(out, null, 2));
  return out;
}

/**
 * Backward-compatible:
 * - New: generateArtifactValidation(layout, contract)
 * - Old: generateArtifactValidation(ctx)
 */
export async function generateArtifactValidation(layoutOrCtx: RunLayout | MindTraceRunContext, contract?: ComplianceDoD) {
  const layout: RunLayout =
    "runDir" in layoutOrCtx ? layoutOrCtx : ensureRunLayout(layoutOrCtx);

  const dod = contract ?? loadAndValidateComplianceDoD("runDir" in layoutOrCtx ? layoutOrCtx.runDir.split("/runs/")[0] : layoutOrCtx.cwd);

  const required = dod.required_artifacts || [];
  const jsonMustParse = dod.json_must_parse || [];

  const missing: string[] = [];
  const invalidJson: string[] = [];

  for (const rel of required) {
    const p = join(layout.runDir, rel);
    if (!existsSync(p)) missing.push(rel);
  }

  for (const rel of jsonMustParse) {
    const p = join(layout.runDir, rel);
    if (!existsSync(p)) {
      missing.push(rel);
      continue;
    }
    const parsed = readJsonSafe(p);
    if (parsed === null) invalidJson.push(rel);
  }

  const out = {
    generated_at: new Date().toISOString(),
    status: missing.length === 0 && invalidJson.length === 0 ? "pass" : "fail",
    missing,
    invalid_json: invalidJson,
  };

  writeFileSync(join(layout.artifactsDir, "artifact-validation.json"), JSON.stringify(out, null, 2));
  return out;
}

/**
 * Backward-compatible:
 * - New: validateArtifacts(layout, contract)
 * - Old: validateArtifacts(ctx)
 */
export async function validateArtifacts(layoutOrCtx: RunLayout | MindTraceRunContext, contract?: ComplianceDoD) {
  const layout: RunLayout =
    "runDir" in layoutOrCtx ? layoutOrCtx : ensureRunLayout(layoutOrCtx);

  const dod = contract ?? loadAndValidateComplianceDoD("runDir" in layoutOrCtx ? layoutOrCtx.runDir.split("/runs/")[0] : layoutOrCtx.cwd);

  const v = readJsonSafe(join(layout.artifactsDir, "artifact-validation.json"));
  if (!v) return { ok: false, reason: "missing_artifact_validation" };

  if (v.status !== "pass") return { ok: false, reason: "artifact_validation_failed", details: v };

  const requiredAudit = dod.rules?.audit_files_required || [];
  for (const rel of requiredAudit) {
    const p = join(layout.runDir, rel);
    if (!existsSync(p)) return { ok: false, reason: "missing_audit_file", file: rel };
  }

  return { ok: true };
}

/**
 * Backward-compatible:
 * - New: finalizeAuditTrail(layout, ctx)
 * - Old: finalizeAuditTrail({ cwd, runName, exitCode? })
 */
export async function finalizeAuditTrail(layoutOrCtx: RunLayout | (MindTraceRunContext & Partial<Pick<GovernanceGateContext, "exitCode">>), ctxMaybe?: GovernanceGateContext) {
  let layout: RunLayout;
  let ctx: GovernanceGateContext;

  if ("runDir" in layoutOrCtx) {
    layout = layoutOrCtx;
    if (!ctxMaybe) throw new Error("finalizeAuditTrail(layout, ctx) requires ctx");
    ctx = ctxMaybe;
  } else {
    const exitCode = typeof layoutOrCtx.exitCode === "number" ? layoutOrCtx.exitCode : 0;
    ctx = { cwd: layoutOrCtx.cwd, runName: layoutOrCtx.runName, exitCode };
    layout = ensureRunLayout(ctx);
  }

  const out = {
    finalized_at: new Date().toISOString(),
    runName: ctx.runName,
    exitCode: ctx.exitCode,
  };

  writeFileSync(join(layout.auditDir, "final.json"), JSON.stringify(out, null, 2), "utf-8");
  return out;
}

/**
 * Backward-compatible:
 * - New: governanceGate(layout, ctx, contract)
 * - Old: governanceGate({ cwd, runName, exitCode })
 */
export async function governanceGate(
  layoutOrCtx: RunLayout | GovernanceGateContext,
  ctxMaybe?: GovernanceGateContext,
  contractMaybe?: ComplianceDoD
) {
  let layout: RunLayout;
  let ctx: GovernanceGateContext;

  if ("runDir" in layoutOrCtx) {
    layout = layoutOrCtx;
    if (!ctxMaybe) throw new Error("governanceGate(layout, ctx, contract) requires ctx");
    ctx = ctxMaybe;
  } else {
    ctx = layoutOrCtx;
    layout = ensureRunLayout(ctx);
  }

  const contract = contractMaybe ?? loadAndValidateComplianceDoD(ctx.cwd);

  appendAuditEvent(layout, { at: new Date().toISOString(), type: "gate_start", runName: ctx.runName });

  const policy = readJsonSafe(join(layout.artifactsDir, "policy-decision.json"));
  const validation = readJsonSafe(join(layout.artifactsDir, "artifact-validation.json"));

  const policySaysFail = policy?.decision === "fail";
  const artifactValidationFail = validation?.status !== "pass";

  const out = {
    generated_at: new Date().toISOString(),
    runName: ctx.runName,
    testExitCode: ctx.exitCode,
    policy: policy?.decision || "unknown",
    artifact_validation: validation?.status || "missing",
    violations: [] as string[],
  };

  if (artifactValidationFail) out.violations.push("artifact_validation_failed");

  writeFileSync(join(layout.artifactsDir, "governance-gate.json"), JSON.stringify(out, null, 2));

  appendAuditEvent(layout, {
    at: new Date().toISOString(),
    type: "gate_end",
    runName: ctx.runName,
    policySaysFail,
    artifactValidationFail,
  });

  const invalid = artifactValidationFail;
  return { invalid, policySaysFail, contractVersion: contract.version };
}

/**
 * Backward-compatible:
 * - New: indexHistoricalRun(layout, row)
 * - Old: indexHistoricalRun(ctx) -> derives row from artifacts
 */
export async function indexHistoricalRun(layoutOrCtx: RunLayout | MindTraceRunContext, row?: any) {
  const layout: RunLayout =
    "runDir" in layoutOrCtx ? layoutOrCtx : ensureRunLayout(layoutOrCtx);

  const derivedRow =
    row ??
    {
      indexed_at: new Date().toISOString(),
      runName: layout.runDir.split("/runs/").pop(),
      policy: readJsonSafe(join(layout.artifactsDir, "policy-decision.json"))?.decision ?? "unknown",
      gate: readJsonSafe(join(layout.artifactsDir, "governance-gate.json"))?.violations?.length ? "invalid" : "valid",
    };

  appendFileSync(layout.historyIndexPath, JSON.stringify(derivedRow) + "\n", "utf-8");
}

/**
 * Deterministic “bundle list” artifact
 */
export async function generateReportBundle(layoutOrCtx: RunLayout | MindTraceRunContext) {
  const layout: RunLayout =
    "runDir" in layoutOrCtx ? layoutOrCtx : ensureRunLayout(layoutOrCtx);

  const out = {
    generated_at: new Date().toISOString(),
    bundle: [
      "playwright-report.json",
      "normalized-results.json",
      "policy-decision.json",
      "gate-summary.json",
      "artifact-validation.json",
    ],
  };

  writeFileSync(join(layout.artifactsDir, "report-bundle.json"), JSON.stringify(out, null, 2));
  return out;
}

/**
 * Existing helper the CLI expects (Phase A/B): called after playwright run
 */
export async function postRunGenerateArtifacts(ctx: MindTraceRunContext): Promise<void> {
  const layout = ensureRunLayout(ctx);

  // Seed baseline artifacts expected by governance flow
  seedHealedSelectorsFromManifest({ cwd: ctx.cwd, runName: ctx.runName });

  const normalized = await generateNormalizedResults(layout);
  const policy = await generatePolicyDecision(layout, normalized);

  const exitCode = normalized?.summary?.failed ? 1 : 0;
  const gateCtx: GovernanceGateContext = { ...ctx, exitCode };

  await generateGateSummary(layout, gateCtx, policy);

  const dod = loadAndValidateComplianceDoD(ctx.cwd);
  await generateArtifactValidation(layout, dod);

  await generateReportBundle(layout);
}
