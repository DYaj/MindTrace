#!/usr/bin/env node
/**
 * MindTrace CLI (Phase 4 hardening, no drift)
 * - Keep working approach: Playwright JSON reporter stdout -> playwright-report.json
 * - Never print JSON to terminal
 * - Always generate normalized + policy + gate + validation artifacts
 * - Exit codes stable for CI: 0/1/2/3
 *
 * Exit codes:
 * 0 = tests passed AND policy ok AND artifacts valid
 * 1 = tests failed AND policy says fail
 * 2 = infra/runtime error (spawn/cwd/missing testRoot/etc.)
 * 3 = policy violation (contract invalid OR missing/invalid required artifacts)
 */

import {
  Command } from "commander";
import { spawn } from "child_process";
import { config as loadDotEnv } from "dotenv";
import { existsSync, writeFileSync, mkdirSync, readFileSync } from "fs";
import { join, dirname, resolve } from "path";

import { loadAndValidateLocatorManifest } from "./runtime/contract-loader.js";
import { writeContractUtilizationArtifact } from "./runtime/contract-utilization.js";
import {
  applyRuntimeContractContextEnv,
  ensureRunLayout,
  postRunGenerateArtifacts,
  generateNormalizedResults,
  generatePolicyDecision,
  generateGateSummary,
  generateArtifactValidation,
  validateArtifacts,
  governanceGate,
  finalizeAuditTrail,
  indexHistoricalRun,
  generateReportBundle,

  resolveRuntimeContractContext,
} from "./runtime/index.js";

loadDotEnv();

type MindtraceConfig = {
  testRoot?: string;
};

function findRepoRoot(start: string): string {
  let cur = resolve(start);
  while (true) {
    const hasRuntime = existsSync(join(cur, "mindtrace-ai-runtime"));
    const hasFrameworks = existsSync(join(cur, "frameworks"));
    if (hasRuntime && hasFrameworks) return cur;
    const parent = dirname(cur);
    if (parent === cur) return resolve(start);
    cur = parent;
  }
}

function readJsonSafe(p: string): any {
  try {
    return JSON.parse(readFileSync(p, "utf-8"));
  } catch {
    return null;
  }
}

function loadConfig(repoRoot: string): MindtraceConfig {
  const p = join(repoRoot, "mindtrace.config.json");
  if (!existsSync(p)) return {};
  const j = readJsonSafe(p);
  return j && typeof j === "object" ? j : {};
}

function exitCodeFromOutcome(opts: {
  testExitCode: number;
  policyInvalid: boolean;
  infraError: boolean;
  policySaysFail: boolean;
}): number {
  if (opts.infraError) return 2;
  if (opts.policyInvalid) return 3;
  if (opts.testExitCode !== 0 && opts.policySaysFail) return 1;
  return 0;
}

function safeRunName(name: any): string {
  if (!name) return "";
  return String(name).trim();
}

const program = new Command();

program
  .name("mindtrace")
  .description("🧠 MindTrace for Playwright - Compliance-Governed Test Runtime")
  .version("3.0.3");

program
  .command("run")
  .description("Run Playwright tests with MindTrace governance + contracts (stdout JSON capture)")
  .option("--run-name <name>", "Deterministic run name (recommended in CI)")
  .option(
    "--allow-overwrite",
    "Allow overwriting an existing runs/<runName> folder (CI-safe). Default: false"
  )
  .action(async (options) => {
    const invokedFrom = process.cwd();
    const repoRoot = findRepoRoot(invokedFrom);
    const cfg = loadConfig(repoRoot);

    const runName =
      safeRunName(options.runName) ||
      safeRunName(process.env.MINDTRACE_RUN_NAME) ||
      `run-native-${Date.now()}`;

    const testRoot =
      process.env.MINDTRACE_TEST_ROOT ||
      cfg.testRoot ||
      "frameworks/style1-native";

    const effectiveCwd = resolve(repoRoot, testRoot);

    if (!existsSync(effectiveCwd)) {
      console.error(`❌ testRoot folder does not exist: ${effectiveCwd}`);
      console.error(`👉 Fix: set "testRoot" in mindtrace.config.json or export MINDTRACE_TEST_ROOT.`);
      process.exit(2);
    }

    // ---------------------------------------------------------------------
    // SAFE RUN GUARD (non-destructive by default)
    // ---------------------------------------------------------------------
    const runDir = join(repoRoot, "runs", runName);
    const allowOverwrite =
      options.allowOverwrite === true || process.env.MINDTRACE_ALLOW_OVERWRITE === "true";

    if (existsSync(runDir) && !allowOverwrite) {
      console.error(`❌ Refusing to overwrite existing run folder: ${runDir}`);
      console.error(`👉 Fix: choose a new --run-name OR re-run with --allow-overwrite`);
      console.error(
        `   Example: node mindtrace-ai-runtime/dist/cli.js run --run-name ${runName}-${Date.now()}`
      );
      console.error(
        `   OR:      node mindtrace-ai-runtime/dist/cli.js run --run-name ${runName} --allow-overwrite`
      );
      process.exit(2);
    }

    console.log("🧠 Starting MindTrace-Enhanced Playwright Tests...\n");
    console.log("Framework Style:", "native");
    console.log("MindTrace Heal:", "✅ Enabled");
    console.log("MindTrace RCA:", "✅ Enabled");
    console.log("");

    const layout = ensureRunLayout({ cwd: repoRoot, runName });
    mkdirSync(layout.artifactsDir, { recursive: true });

    const pwJsonReportPath = join(layout.artifactsDir, "playwright-report.json");

// ---------------------------------------------------------------------
// Phase 2.2.1 (additive): contract context snapshot + plumbing
// - Writes automation-contract-context.json into run artifacts (best-effort)
// - Sets MINDTRACE_AUTOMATION_CONTRACT_CONTEXT_PATH for runtime consumers
// - Does NOT enforce governance decisions
// ---------------------------------------------------------------------
try {
  const contractDir = join(repoRoot, ".mcp-contract");
  const cacheDir = join(repoRoot, ".mcp-cache", "pages");

  const files: Record<string, string> = {};
  const fileCandidates = {
    frameworkPattern: join(contractDir, "framework-pattern.json"),
    selectorStrategy: join(contractDir, "selector-strategy.json"),
    assertionStyle: join(contractDir, "assertion-style.json"),
    wrapperDiscovery: join(contractDir, "wrapper-discovery.json"),
    automationContractMd: join(contractDir, "automation-contract.md"),
    pageIndex: join(cacheDir, "index.json"),
  };

  // keep only existing paths
  for (const [k, p] of Object.entries(fileCandidates)) {
    if (existsSync(p)) files[k] = p;
  }

  const ok =
    existsSync(contractDir) &&
    existsSync(cacheDir) &&
    Boolean(files["frameworkPattern"]) &&
    Boolean(files["selectorStrategy"]) &&
    Boolean(files["assertionStyle"]) &&
    Boolean(files["wrapperDiscovery"]) &&
    Boolean(files["automationContractMd"]) &&
    Boolean(files["pageIndex"]);

  const snapshot = {
    ok,
    repoRoot,
    contractDir: existsSync(contractDir) ? contractDir : null,
    cacheDir: existsSync(cacheDir) ? cacheDir : null,
    warnings: ok ? [] : ["CONTRACT_CONTEXT_INCOMPLETE"],
    files,
    summary: {
      hasFrameworkPattern: Boolean(files["frameworkPattern"]),
      hasSelectorStrategy: Boolean(files["selectorStrategy"]),
      hasAssertionStyle: Boolean(files["assertionStyle"]),
      hasWrapperDiscovery: Boolean(files["wrapperDiscovery"]),
      hasAutomationContractMd: Boolean(files["automationContractMd"]),
      hasPageIndex: Boolean(files["pageIndex"]),
    },
  };

  const snapshotPath = join(layout.artifactsDir, "automation-contract-context.json");
  writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2), "utf-8");

    // ---------------------------------------------------------------------
    // Phase 2.2.3 (additive): export contract context into env (runtime plumbing)
    // - Observability + downstream runtime consumption
    // - NO governance/pass-fail changes
    // ---------------------------------------------------------------------
    try {
      // PHASE_2_2_3_ENV_AFTER_CONTEXT
      applyRuntimeContractContextEnv({ artifactsDir: layout.artifactsDir });
    } catch {
      // non-fatal
    }


    // ---------------------------------------------------------------------
    // Phase 2.2.2 (additive): Contract Utilization Artifact (native CLI)
    // - Best-effort write of contract-utilization.json for observability
    // - NO governance or pass/fail behavior changes
    // ---------------------------------------------------------------------
    try {
      // PHASE_2_2_2_CONTRACT_UTILIZATION
      writeContractUtilizationArtifact({
        repoRoot,
        artifactsDir: layout.artifactsDir,
      });
    } catch (e) {
      // Non-fatal (observability only)
    }


  // Standardize runtime plumbing entry point.
  process.env.MINDTRACE_AUTOMATION_CONTRACT_CONTEXT_PATH = snapshotPath;
} catch {
  // swallow (additive only)
}

    const pwJsonRawPath = join(layout.artifactsDir, "playwright-report.raw.txt");

    // ---------------------------------------------------------------------
    // Contract validation + snapshot (policy violation => exit 3)
    // ---------------------------------------------------------------------
    try {
      const manifest = loadAndValidateLocatorManifest(repoRoot);
      if (manifest) {
        console.log("📜 Locator manifest validated successfully.");

        const snapshotPath = join(layout.artifactsDir, "locator-manifest.snapshot.json");
        writeFileSync(snapshotPath, JSON.stringify(manifest, null, 2), "utf-8");

        process.env.MINDTRACE_LOCATOR_MANIFEST_PATH = snapshotPath;
      } else {
        console.log("📜 No locator-manifest.json found. Skipping contract enforcement.");
      }
    } catch (err: any) {
      console.error("❌ Contract validation failed.");
      console.error(err?.message || err);
      process.exit(3);
    }

    // ---------------------------------------------------------------------
    // RUN PLAYWRIGHT (stdout JSON capture)
    // ---------------------------------------------------------------------
    const playwrightArgs: string[] = ["--no-install", "playwright", "test", "--reporter=json"];

    const env: NodeJS.ProcessEnv = {
      ...process.env,
      MINDTRACE_ENABLED: "true",
      MINDTRACE_MODE: "native",
      MINDTRACE_RUN_NAME: runName,
    };

    const pwStdoutChunks: Buffer[] = [];
    let infraError = false;

    let pw: ReturnType<typeof spawn>;
    try {
      pw = spawn("npx", playwrightArgs, {
        env,
        cwd: effectiveCwd,
        shell: false,
        stdio: ["inherit", "pipe", "inherit"], // capture stdout, keep stderr visible
      });
    } catch (e: any) {
      console.error("❌ Failed to spawn Playwright:", e?.message || e);
      process.exit(2);
      return;
    }

    pw.on("error", (e: any) => {
      infraError = true;
      console.error("❌ Playwright process error:", e?.message || e);
    });

    pw.stdout?.on("data", (chunk: Buffer) => {
      pwStdoutChunks.push(chunk);
      // intentionally silenced (do not print JSON)
    });

    pw.on("close", async (code) => {
      const testExitCode = code ?? 0;

      // 1) Always write raw capture for debugging determinism (never blocks)
      try {
        const rawOut = Buffer.concat(pwStdoutChunks).toString("utf-8");
        if (rawOut && rawOut.trim()) writeFileSync(pwJsonRawPath, rawOut, "utf-8");
      } catch {
        // ignore
      }

      // 2) Best-effort parse stdout as JSON and write playwright-report.json
      try {
        const out = Buffer.concat(pwStdoutChunks).toString("utf-8").trim();
        if (out) {
          JSON.parse(out);
          writeFileSync(pwJsonReportPath, out, "utf-8");
        }
      } catch {
        // leave missing/invalid report to compliance validation
      }

      let policyInvalid = false;
      let policySaysFail = false;

      try {
        await postRunGenerateArtifacts({ cwd: repoRoot, runName });

        await generateNormalizedResults({
          cwd: repoRoot,
          runName,
          exitCode: testExitCode,
          mode: "native",
          isBaseline: false,
        } as any);

        await generatePolicyDecision({
          cwd: repoRoot,
          runName,
          exitCode: testExitCode,
        } as any);

        await generateGateSummary({
          cwd: repoRoot,
          runName,
          exitCode: testExitCode,
        } as any);

        // ✅ finalize audit FIRST so audit/final.json exists for compliance validation
        await finalizeAuditTrail({ cwd: repoRoot, runName } as any);

        await generateArtifactValidation({
          cwd: repoRoot,
          runName,
          isBaseline: false,
        } as any);

        const vPath = join(layout.artifactsDir, "artifact-validation.json");
        const validation = existsSync(vPath) ? readJsonSafe(vPath) : null;
        if (validation?.status === "invalid") policyInvalid = true;

        await validateArtifacts({ cwd: repoRoot, runName, isBaseline: false } as any);

        try {
          await governanceGate({ cwd: repoRoot, runName, exitCode: testExitCode } as any);
        } catch {
          policySaysFail = true;
        }

        await indexHistoricalRun({ cwd: repoRoot, runName } as any);
        await generateReportBundle({ cwd: repoRoot, runName } as any);

        console.log("");
        console.log(testExitCode === 0 ? "✅ Tests completed successfully!" : "❌ Tests failed (artifacts + RCA generated).");
        console.log("");
        console.log("📦 Run output:");
        console.log(`   - Run folder:   ${layout.runDir}`);
        console.log(`   - Artifacts:    ${layout.artifactsDir}`);
        console.log(`   - Audit trail:  ${layout.auditDir}`);
        console.log(`   - History index:${layout.historyIndexPath}`);
        console.log("");

        const finalExit = exitCodeFromOutcome({
          testExitCode,
          policyInvalid,
          infraError,
          policySaysFail,
        });

        process.exit(finalExit);
      } catch (err: any) {
        console.error("\n❌ MindTrace pipeline failed:", err?.message || err);

        const msg = String(err?.message || "");
        const looksLikeMissingArtifact =
          msg.includes("Missing required artifact") ||
          msg.includes("Invalid JSON artifact") ||
          msg.includes("Missing required audit file");

        process.exit(looksLikeMissingArtifact ? 3 : 2);
      }
    });
  });

program.parse(process.argv);
