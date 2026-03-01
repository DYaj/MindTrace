#!/usr/bin/env node
/**
 * MindTrace CLI (Phase 2)
 * - Contract validation (exit=3 on invalid)
 * - Run Playwright from framework cwd using the repo's installed @playwright/test
 * - No npx auto-installs (prevents version split)
 */

import { Command } from "commander";
import { spawn } from "child_process";
import { config as loadDotEnv } from "dotenv";
import { existsSync } from "fs";
import { join, dirname, resolve } from "path";

import { loadAndValidateLocatorManifest } from "./runtime/contract-loader";
import {
  ensureRunLayout,
  postRunGenerateArtifacts,
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

function loadConfig(repoRoot: string): MindtraceConfig {
  const p = join(repoRoot, "mindtrace.config.json");
  if (!existsSync(p)) return {};
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const j = require(p);
    return j && typeof j === "object" ? j : {};
  } catch {
    return {};
  }
}

const program = new Command();

program
  .name("mindtrace")
  .description("🧠 MindTrace for Playwright - AI-Governed Test Automation")
  .version("2.0.0");

program
  .command("run")
  .description("Run Playwright tests with MindTrace intelligence")
  .option("-s, --style <style>", "Framework style (native|bdd|pom-bdd)", "native")
  .option("-p, --project <n>", "Project name to run")
  .option("-g, --grep <pattern>", "Run tests matching pattern")
  .option("--headed", "Run tests in headed mode")
  .option("--debug", "Run tests in debug mode")
  .option("--ui", "Run tests in UI mode")
  .option("--no-healing", "Disable MindTrace Heal module")
  .option("--no-classification", "Disable MindTrace RCA module")
  .option("--run-name <name>", "Deterministic run name (recommended in CI)")
  .action(async (options) => {
    console.log("🧠 Starting MindTrace-Enhanced Playwright Tests...\n");
    console.log("Framework Style:", options.style);
    console.log("MindTrace Heal:", options.healing ? "✅ Enabled" : "❌ Disabled");
    console.log("MindTrace RCA:", options.classification ? "✅ Enabled" : "❌ Disabled");
    console.log("");

    const invokedFrom = process.cwd();
    const repoRoot = findRepoRoot(invokedFrom);
    const cfg = loadConfig(repoRoot);

    const runName =
      options.runName ||
      process.env.MINDTRACE_RUN_NAME ||
      `run-${options.style}-${Date.now()}`;

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

    const layout = ensureRunLayout({ cwd: repoRoot, runName });

    // CONTRACT VALIDATION (Phase 2 Governance Layer)
    try {
      const manifest = loadAndValidateLocatorManifest(repoRoot);
      if (manifest) {
        console.log("📜 Locator manifest validated successfully.");
      } else {
        console.log("📜 No locator-manifest.json found. Skipping contract enforcement.");
      }
    } catch (err: any) {
      console.error("❌ Contract validation failed.");
      console.error(err?.message || err);
      process.exit(3);
    }

    // Build Playwright command (NO AUTO-INSTALL)
    const playwrightArgs: string[] = ["--no-install", "playwright", "test"];

    if (options.project) playwrightArgs.push("--project", options.project);
    if (options.grep) playwrightArgs.push("--grep", options.grep);
    if (options.headed) playwrightArgs.push("--headed");
    if (options.debug) playwrightArgs.push("--debug");
    if (options.ui) playwrightArgs.push("--ui");

    // Env for MindTrace + tests
    const env = {
      ...process.env,
      MINDTRACE_ENABLED: "true",
      MINDTRACE_STYLE: options.style,
      MINDTRACE_RUN_NAME: runName,
      MINDTRACE_HEAL_ENABLED: options.healing ? "true" : "false",
      MINDTRACE_RCA_ENABLED: options.classification ? "true" : "false",
    };

    // Run Playwright from the framework cwd (critical)
    const pw = spawn("npx", playwrightArgs, {
      stdio: "inherit",
      env,
      cwd: effectiveCwd,
      shell: false,
    });

    pw.on("close", async (code) => {
      const exitCode = code ?? 0;

      try {
        await postRunGenerateArtifacts({ cwd: repoRoot, runName });
        await validateArtifacts({ cwd: repoRoot, runName });
        await governanceGate({ cwd: repoRoot, runName, exitCode });
        await finalizeAuditTrail({ cwd: repoRoot, runName });
        await indexHistoricalRun({ cwd: repoRoot, runName });
        await generateReportBundle({ cwd: repoRoot, runName });

        console.log("");
        console.log(
          exitCode === 0
            ? "✅ Tests completed successfully!"
            : "❌ Tests failed (artifacts + RCA generated)."
        );
        console.log("");
        console.log("📦 Run output:");
        console.log(`   - Run folder:   ${layout.runDir}`);
        console.log(`   - Artifacts:    ${layout.artifactsDir}`);
        console.log(`   - Audit trail:  ${layout.auditDir}`);
        console.log(`   - History index:${layout.historyIndexPath}`);
        console.log("");

        process.exit(exitCode);
      } catch (err: any) {
        console.error("\n❌ MindTrace pipeline failed:", err?.message || err);
        process.exit(exitCode || 1);
      }
    });
  });

program.parse();
