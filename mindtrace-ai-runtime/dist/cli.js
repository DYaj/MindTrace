#!/usr/bin/env node
"use strict";
/**
 * MindTrace CLI (Phase 2)
 * - Contract validation (exit=3 on invalid)
 * - Run Playwright from framework cwd using the repo's installed @playwright/test
 * - No npx auto-installs (prevents version split)
 */
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const child_process_1 = require("child_process");
const dotenv_1 = require("dotenv");
const fs_1 = require("fs");
const path_1 = require("path");
const contract_loader_1 = require("./runtime/contract-loader");
const runtime_1 = require("./runtime");
(0, dotenv_1.config)();
function findRepoRoot(start) {
    let cur = (0, path_1.resolve)(start);
    while (true) {
        const hasRuntime = (0, fs_1.existsSync)((0, path_1.join)(cur, "mindtrace-ai-runtime"));
        const hasFrameworks = (0, fs_1.existsSync)((0, path_1.join)(cur, "frameworks"));
        if (hasRuntime && hasFrameworks)
            return cur;
        const parent = (0, path_1.dirname)(cur);
        if (parent === cur)
            return (0, path_1.resolve)(start);
        cur = parent;
    }
}
function loadConfig(repoRoot) {
    const p = (0, path_1.join)(repoRoot, "mindtrace.config.json");
    if (!(0, fs_1.existsSync)(p))
        return {};
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const j = require(p);
        return j && typeof j === "object" ? j : {};
    }
    catch {
        return {};
    }
}
const program = new commander_1.Command();
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
    const runName = options.runName ||
        process.env.MINDTRACE_RUN_NAME ||
        `run-${options.style}-${Date.now()}`;
    const testRoot = process.env.MINDTRACE_TEST_ROOT ||
        cfg.testRoot ||
        "frameworks/style1-native";
    const effectiveCwd = (0, path_1.resolve)(repoRoot, testRoot);
    if (!(0, fs_1.existsSync)(effectiveCwd)) {
        console.error(`❌ testRoot folder does not exist: ${effectiveCwd}`);
        console.error(`👉 Fix: set "testRoot" in mindtrace.config.json or export MINDTRACE_TEST_ROOT.`);
        process.exit(2);
    }
    const layout = (0, runtime_1.ensureRunLayout)({ cwd: repoRoot, runName });
    // CONTRACT VALIDATION (Phase 2 Governance Layer)
    try {
        const manifest = (0, contract_loader_1.loadAndValidateLocatorManifest)(repoRoot);
        if (manifest) {
            console.log("📜 Locator manifest validated successfully.");
        }
        else {
            console.log("📜 No locator-manifest.json found. Skipping contract enforcement.");
        }
    }
    catch (err) {
        console.error("❌ Contract validation failed.");
        console.error(err?.message || err);
        process.exit(3);
    }
    // Build Playwright command (NO AUTO-INSTALL)
    const playwrightArgs = ["--no-install", "playwright", "test"];
    if (options.project)
        playwrightArgs.push("--project", options.project);
    if (options.grep)
        playwrightArgs.push("--grep", options.grep);
    if (options.headed)
        playwrightArgs.push("--headed");
    if (options.debug)
        playwrightArgs.push("--debug");
    if (options.ui)
        playwrightArgs.push("--ui");
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
    const pw = (0, child_process_1.spawn)("npx", playwrightArgs, {
        stdio: "inherit",
        env,
        cwd: effectiveCwd,
        shell: false,
    });
    pw.on("close", async (code) => {
        const exitCode = code ?? 0;
        try {
            await (0, runtime_1.postRunGenerateArtifacts)({ cwd: repoRoot, runName });
            await (0, runtime_1.validateArtifacts)({ cwd: repoRoot, runName });
            await (0, runtime_1.governanceGate)({ cwd: repoRoot, runName, exitCode });
            await (0, runtime_1.finalizeAuditTrail)({ cwd: repoRoot, runName });
            await (0, runtime_1.indexHistoricalRun)({ cwd: repoRoot, runName });
            await (0, runtime_1.generateReportBundle)({ cwd: repoRoot, runName });
            console.log("");
            console.log(exitCode === 0
                ? "✅ Tests completed successfully!"
                : "❌ Tests failed (artifacts + RCA generated).");
            console.log("");
            console.log("📦 Run output:");
            console.log(`   - Run folder:   ${layout.runDir}`);
            console.log(`   - Artifacts:    ${layout.artifactsDir}`);
            console.log(`   - Audit trail:  ${layout.auditDir}`);
            console.log(`   - History index:${layout.historyIndexPath}`);
            console.log("");
            process.exit(exitCode);
        }
        catch (err) {
            console.error("\n❌ MindTrace pipeline failed:", err?.message || err);
            process.exit(exitCode || 1);
        }
    });
});
program.parse();
//# sourceMappingURL=cli.js.map