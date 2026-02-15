#!/usr/bin/env node
"use strict";
/**
 * MindTrace CLI
 * Command-line interface for MindTrace for Playwright
 */
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const path_1 = require("path");
const dotenv_1 = require("dotenv");
const runtimePipeline_1 = require("./runtime/runtimePipeline");
(0, dotenv_1.config)();
const program = new commander_1.Command();
program
    .name('mindtrace')
    .description('🧠 MindTrace for Playwright - AI-Governed Test Automation')
    .version('1.0.0');
program
    .command('run')
    .description('Run Playwright tests with MindTrace intelligence')
    .option('-s, --style <style>', 'Framework style (native|bdd|pom-bdd)', 'native')
    .option('-p, --project <n>', 'Playwright project name to run')
    .option('-g, --grep <pattern>', 'Run tests matching pattern')
    .option('--headed', 'Run tests in headed mode')
    .option('--debug', 'Run tests in debug mode')
    .option('--ui', 'Run tests in UI mode')
    .option('--workers <n>', 'Override Playwright workers')
    .option('--run-name <name>', 'Deterministic run name (recommended for CI)')
    .option('--adapter <name>', 'Adapter name (reserved)', 'playwright')
    .option('--no-healing', 'Disable MindTrace Heal module')
    .option('--no-classification', 'Disable MindTrace RCA module')
    .option('--no-governance', 'Disable governance gate (not recommended)')
    .option('--no-audit', 'Disable audit trail (not recommended)')
    .option('--no-history', 'Disable historical indexing (not recommended)')
    .action(async (options) => {
    const cwd = process.cwd();
    const runName = options.runName ||
        process.env.MINDTRACE_RUN_NAME ||
        `local-${new Date().toISOString().replace(/[:.]/g, '-')}`;
    console.log('🧠 Starting MindTrace-Enhanced Playwright Tests...\n');
    console.log('CWD:', cwd);
    console.log('Framework Style:', options.style);
    console.log('Run Name:', runName);
    console.log('MindTrace Heal:', options.healing ? '✅ Enabled' : '❌ Disabled');
    console.log('MindTrace RCA:', options.classification ? '✅ Enabled' : '❌ Disabled');
    console.log('Governance Gate:', options.governance ? '✅ Enabled' : '❌ Disabled');
    console.log('Audit Trail:', options.audit ? '✅ Enabled' : '❌ Disabled');
    console.log('History Index:', options.history ? '✅ Enabled' : '❌ Disabled');
    console.log('');
    // Ensure run folders exist up-front (governance + audit + history depends on it)
    const layout = (0, runtimePipeline_1.ensureRunLayout)({ cwd, runName });
    // Build Playwright command
    const playwrightArgs = ['test'];
    if (options.project) {
        playwrightArgs.push('--project', options.project);
    }
    if (options.grep) {
        playwrightArgs.push('--grep', options.grep);
    }
    if (options.headed) {
        playwrightArgs.push('--headed');
    }
    if (options.debug) {
        playwrightArgs.push('--debug');
    }
    if (options.ui) {
        playwrightArgs.push('--ui');
    }
    if (options.workers) {
        playwrightArgs.push('--workers', String(options.workers));
    }
    // Set environment variables for MindTrace modules
    const env = {
        ...process.env,
        CI: process.env.CI || 'false',
        CI_PROVIDER: process.env.CI_PROVIDER || (process.env.TEAMCITY_VERSION ? 'teamcity' : 'local'),
        MINDTRACE_ENABLED: 'true',
        MINDTRACE_STYLE: options.style,
        MINDTRACE_RUN_NAME: runName,
        MINDTRACE_RUN_DIR: layout.runDir,
        MINDTRACE_ARTIFACTS_DIR: layout.artifactsDir,
        MINDTRACE_HEAL_ENABLED: options.healing ? 'true' : 'false',
        MINDTRACE_RCA_ENABLED: options.classification ? 'true' : 'false',
        MINDTRACE_GOVERNANCE_ENABLED: options.governance ? 'true' : 'false',
        MINDTRACE_AUDIT_ENABLED: options.audit ? 'true' : 'false',
        MINDTRACE_HISTORY_ENABLED: options.history ? 'true' : 'false',
    };
    const hasPlaywrightConfig = (0, fs_1.existsSync)((0, path_1.resolve)(cwd, 'playwright.config.ts')) ||
        (0, fs_1.existsSync)((0, path_1.resolve)(cwd, 'playwright.config.js')) ||
        (0, fs_1.existsSync)((0, path_1.resolve)(cwd, 'playwright.config.mjs'));
    if (!hasPlaywrightConfig) {
        console.log('⚠️  No playwright.config.* found in this directory.');
        console.log('    If your Playwright config is elsewhere, run from that folder.\n');
    }
    // Run Playwright
    const playwrightProcess = (0, child_process_1.spawn)('npx', ['playwright', ...playwrightArgs], {
        stdio: 'inherit',
        env,
    });
    playwrightProcess.on('close', async (code) => {
        const exitCode = typeof code === 'number' ? code : 1;
        // Post-run pipeline: artifacts -> validation -> governance -> audit -> history -> report
        try {
            await (0, runtimePipeline_1.postRunGenerateArtifacts)({
                cwd,
                runName,
                exitCode,
                style: options.style,
                healingEnabled: options.healing,
                rcaEnabled: options.classification,
            });
            // Always validate artifacts in CI by default (can be skipped via env toggle)
            await (0, runtimePipeline_1.validateArtifacts)({ cwd, runName });
            if (options.governance) {
                await (0, runtimePipeline_1.governanceGate)({ cwd, runName, exitCode });
            }
            if (options.audit) {
                await (0, runtimePipeline_1.finalizeAuditTrail)({ cwd, runName });
            }
            if (options.history) {
                await (0, runtimePipeline_1.indexHistoricalRun)({ cwd, runName });
            }
            await (0, runtimePipeline_1.generateReportBundle)({ cwd, runName });
        }
        catch (e) {
            console.log('\n❌ MindTrace post-run pipeline failed:');
            console.log(e?.message || e);
            // If MindTrace governance/validation fails, treat as build failure
            process.exit(2);
        }
        console.log('');
        if (exitCode === 0) {
            console.log('✅ Tests completed successfully!');
        }
        else {
            console.log('❌ Tests failed (Playwright exit code != 0).');
        }
        console.log('');
        console.log('📦 MindTrace outputs:');
        console.log(`   - Run folder: ${(0, runtimePipeline_1.ensureRunLayout)({ cwd, runName }).runDir}`);
        console.log(`   - Artifacts:   ${(0, runtimePipeline_1.ensureRunLayout)({ cwd, runName }).artifactsDir}`);
        console.log('   - Required artifacts:');
        console.log('     - healed-selectors.json');
        console.log('     - root-cause-summary.json');
        console.log('     - failure-narrative.md');
        console.log('     - execution-trace-map.json');
        console.log('   - Governance + audit + history:');
        console.log('     - audit/events.ndjson');
        console.log('     - audit/final.json');
        console.log('     - history/run-index.jsonl');
        process.exit(exitCode);
    });
});
program
    .command('validate-artifacts')
    .description('Validate required MindTrace artifacts exist and are well-formed')
    .requiredOption('--run <name>', 'Run name')
    .action(async (options) => {
    await (0, runtimePipeline_1.validateArtifacts)({ cwd: process.cwd(), runName: options.run });
    console.log('✅ Artifact validation passed');
});
program
    .command('gate')
    .description('Apply pipeline governance gate based on RCA + policy')
    .requiredOption('--run <name>', 'Run name')
    .option('--allow-flaky-only', 'Pass if only flaky failures exist', true)
    .action(async (options) => {
    await (0, runtimePipeline_1.governanceGate)({ cwd: process.cwd(), runName: options.run, exitCode: 0 });
    console.log('✅ Governance gate passed');
});
program
    .command('finalize-run')
    .description('Finalize immutable audit trail (hash-chained events) for a run')
    .requiredOption('--run <name>', 'Run name')
    .action(async (options) => {
    await (0, runtimePipeline_1.finalizeAuditTrail)({ cwd: process.cwd(), runName: options.run });
    console.log('✅ Audit trail finalized');
});
program
    .command('index-run')
    .description('Append a run summary into historical index (run-index.jsonl)')
    .requiredOption('--run <name>', 'Run name')
    .action(async (options) => {
    await (0, runtimePipeline_1.indexHistoricalRun)({ cwd: process.cwd(), runName: options.run });
    console.log('✅ Run indexed into history');
});
program
    .command('report')
    .description('Generate a simple report bundle from existing artifacts')
    .option('-r, --run <name>', 'Run name')
    .option('-o, --output <path>', 'Output directory', 'reports')
    .option('--format <type>', 'Report format (html|markdown)', 'markdown')
    .action(async (options) => {
    // This report generator is intentionally lightweight & deterministic
    await (0, runtimePipeline_1.generateReportBundle)({
        cwd: process.cwd(),
        runName: options.run || process.env.MINDTRACE_RUN_NAME || 'latest',
        outputDir: options.output,
        format: options.format,
    });
    console.log('✅ Report generated');
});
program.parse();
//# sourceMappingURL=cli.js.map