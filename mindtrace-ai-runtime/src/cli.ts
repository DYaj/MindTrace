#!/usr/bin/env node
/**
 * MindTrace CLI (Phase 3)
 * - Contract validation (exit=3 on invalid)
 * - Run Playwright from framework cwd using the repo's installed @playwright/test
 * - Seeds healed-selectors.json from locator-manifest.snapshot.json (repo truth)
 * - Captures Playwright JSON reporter stdout -> runs/<runName>/artifacts/playwright-report.json
 */

import { Command } from "commander";
import { spawn } from "child_process";
import { config as loadDotEnv } from "dotenv";
import { existsSync, writeFileSync, mkdirSync } from "fs";
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
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require("fs");
    return JSON.parse(fs.readFileSync(p, "utf-8"));
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

const program = new Command();

program
  .name("mindtrace")
  .description("🧠 MindTrace for Playwright - AI-Governed Test Automation")
  .version("3.0.2");

program
  .command("run")
  .description("Run Playwright tests with MindTrace governance + contracts")
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
      console.error(
        `👉 Fix: set "testRoot" in mindtrace.config.json or export MINDTRACE_TEST_ROOT.`
      );
      process.exit(2);
    }

    console.log("🧠 Starting MindTrace-Enhanced Playwright Tests...\n");
    console.log("Framework Style:", "native");
    console.log("MindTrace Heal:", "✅ Enabled");
    console.log("MindTrace RCA:", "✅ Enabled");
    console.log("");

    const layout = ensureRunLayout({ cwd: repoRoot, runName });

    // We will write the Playwright JSON reporter output here:
    const pwJsonReportPath = join(layout.artifactsDir, "playwright-report.json");
    mkdirSync(layout.artifactsDir, { recursive: true });

    // ---------------------------------------------------------------------
    // Phase 3: Contract validation + snapshot
    // ---------------------------------------------------------------------
    try {
      const manifest = loadAndValidateLocatorManifest(repoRoot);
      if (manifest) {
        console.log("📜 Locator manifest validated successfully.");

        const snapshotPath = join(
          layout.artifactsDir,
          "locator-manifest.snapshot.json"
        );

        writeFileSync(snapshotPath, JSON.stringify(manifest, null, 2), "utf-8");

        // Manifest-seed reads this snapshot path
        process.env.MINDTRACE_LOCATOR_MANIFEST_PATH = snapshotPath;
      } else {
        console.log(
          "📜 No locator-manifest.json found. Skipping contract enforcement."
        );
      }
    } catch (err: any) {
      console.error("❌ Contract validation failed.");
      console.error(err?.message || err);
      process.exit(3);
    }

    // ---------------------------------------------------------------------
    // RUN PLAYWRIGHT
    // - Use JSON reporter (stdout)
    // - Capture stdout -> playwright-report.json
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

    const pw = spawn("npx", playwrightArgs, {
      env,
      cwd: effectiveCwd,
      shell: false,
      stdio: ["inherit", "pipe", "inherit"], // capture stdout, keep stderr visible
    });

    pw.stdout?.on("data", (chunk: Buffer) => {
      pwStdoutChunks.push(chunk);
      // (silenced) json reporter output is captured to artifacts only
    });

    pw.on("close", async (code) => {
      const exitCode = code ?? 0;

      // Write Playwright JSON report from captured stdout (best-effort)
      try {
        const out = Buffer.concat(pwStdoutChunks).toString("utf-8").trim();
        if (out) {
          // reporter=json outputs a single JSON object
          JSON.parse(out); // validate JSON before writing
          writeFileSync(pwJsonReportPath, out, "utf-8");
        }
      } catch (e) {
        // If JSON parse fails, we still fail later via validateArtifacts()
        // but we do not crash here.
      }

      try {
        await postRunGenerateArtifacts({ cwd: repoRoot, runName });

        await generateNormalizedResults({
          cwd: repoRoot,
          runName,
          exitCode,
          mode: "native",
          isBaseline: false,
        } as any);

        await generatePolicyDecision({ cwd: repoRoot, runName, exitCode } as any);
        await generateGateSummary({ cwd: repoRoot, runName, exitCode } as any);
        await generateArtifactValidation({
          cwd: repoRoot,
          runName,
          isBaseline: false,
        } as any);

        await validateArtifacts({ cwd: repoRoot, runName, isBaseline: false } as any);
        await governanceGate({ cwd: repoRoot, runName, exitCode } as any);

        await finalizeAuditTrail({ cwd: repoRoot, runName } as any);
        await indexHistoricalRun({ cwd: repoRoot, runName } as any);
        await generateReportBundle({ cwd: repoRoot, runName } as any);

        console.log("");
        console.log(exitCode === 0 ? "✅ Tests completed successfully!" : "❌ Tests failed (artifacts + RCA generated).");
        console.log("");
        console.log("📦 Run output:");
        console.log(`   - Run folder:   ${layout.runDir}`);
        console.log(`   - Artifacts:    ${layout.artifactsDir}`);
        console.log(`   - Audit trail:  ${layout.auditDir}`);
        console.log(`   - History index:${layout.historyIndexPath}`);
        console.log("");

        const vPath = join(layout.artifactsDir, "artifact-validation.json");
        const validation = existsSync(vPath) ? readJsonSafe(vPath) : null;
        if (validation?.status === "invalid") process.exit(3);

        process.exit(exitCode);
      } catch (err: any) {
        console.error("\n❌ MindTrace pipeline failed:", err?.message || err);
        process.exit(exitCode || 1);
      }
    });
  });

program.parse();
