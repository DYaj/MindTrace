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

import { Command } from "commander";
import { spawn } from "child_process";
import { config as loadDotEnv } from "dotenv";
import { existsSync, writeFileSync, mkdirSync, readFileSync } from "fs";
import { join, dirname, resolve } from "path";

import { loadAndValidateLocatorManifest } from "./runtime/contract-loader";
import {
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
} from "./runtime";

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

const program = new Command();

program
  .name("mindtrace")
  .description("🧠 MindTrace for Playwright - Compliance-Governed Test Runtime")
  .version("3.0.3");

program
  .command("run")
  .description("Run Playwright tests with MindTrace governance + contracts (stdout JSON capture)")
  .option("--run-name <name>", "Deterministic run name (recommended in CI)")
  .action(async (options) => {
    const invokedFrom = process.cwd();
    const repoRoot = findRepoRoot(invokedFrom);
    const cfg = loadConfig(repoRoot);

    const runName =
      options.runName ||
      process.env.MINDTRACE_RUN_NAME ||
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

    console.log("🧠 Starting MindTrace-Enhanced Playwright Tests...\n");
    console.log("Framework Style:", "native");
    console.log("MindTrace Heal:", "✅ Enabled");
    console.log("MindTrace RCA:", "✅ Enabled");
    console.log("");

    const layout = ensureRunLayout({ cwd: repoRoot, runName });
    mkdirSync(layout.artifactsDir, { recursive: true });

    const pwJsonReportPath = join(layout.artifactsDir, "playwright-report.json");
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
    const playwrightArgs: string[] = [
      "--no-install",
      "playwright",
      "test",
      "--reporter=json",
    ];

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
        if (rawOut && rawOut.trim()) {
          writeFileSync(pwJsonRawPath, rawOut, "utf-8");
        }
      } catch {
        // ignore
      }

      // 2) Best-effort parse stdout as JSON and write playwright-report.json
      //    If parse fails, policy should mark artifacts invalid => exit 3 later.
      try {
        const out = Buffer.concat(pwStdoutChunks).toString("utf-8").trim();
        if (out) {
          JSON.parse(out);
          writeFileSync(pwJsonReportPath, out, "utf-8");
        }
      } catch {
        // leave missing/invalid report to compliance validation
      }

      // 3) Now run the MindTrace pipeline, but enforce stable exit behavior.
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

        await generateArtifactValidation({
          cwd: repoRoot,
          runName,
          isBaseline: false,
        } as any);

        // If artifact-validation says invalid => policy violation (exit 3)
        const vPath = join(layout.artifactsDir, "artifact-validation.json");
        const validation = existsSync(vPath) ? readJsonSafe(vPath) : null;
        if (validation?.status === "invalid") policyInvalid = true;

        // validateArtifacts throws if required artifacts missing/invalid JSON
        await validateArtifacts({ cwd: repoRoot, runName, isBaseline: false } as any);

        // governanceGate throws if policy says block (non-flaky failures, etc.)
        try {
          await governanceGate({ cwd: repoRoot, runName, exitCode: testExitCode } as any);
        } catch {
          policySaysFail = true;
        }

        await finalizeAuditTrail({ cwd: repoRoot, runName } as any);
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

        // If the pipeline failed because artifacts are missing => treat as policy violation (3),
        // otherwise infra/runtime (2). We keep it conservative:
        const msg = String(err?.message || "");
        const looksLikeMissingArtifact = msg.includes("Missing required artifact") || msg.includes("Invalid JSON artifact");
        process.exit(looksLikeMissingArtifact ? 3 : 2);
      }
    });
  });

program.parse();
