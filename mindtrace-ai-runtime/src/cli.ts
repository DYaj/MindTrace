#!/usr/bin/env node
/**
 * MindTrace CLI
 * Command-line interface for MindTrace for Playwright
 */

import { Command } from 'commander';
import { spawn } from 'child_process';
import { config } from 'dotenv';

import {
  ensureRunLayout,
  postRunGenerateArtifacts,
  validateArtifacts,
  governanceGate,
  finalizeAuditTrail,
  indexHistoricalRun,
  generateReportBundle,
} from './runtime';

config();

const program = new Command();

program
  .name('mindtrace')
  .description('🧠 MindTrace for Playwright - AI-Governed Test Automation')
  .version('1.0.0');

program
  .command('run')
  .description('Run Playwright tests with MindTrace intelligence')
  .option('-s, --style <style>', 'Framework style (native|bdd|pom-bdd)', 'native')
  .option('-p, --project <n>', 'Project name to run')
  .option('-g, --grep <pattern>', 'Run tests matching pattern')
  .option('--headed', 'Run tests in headed mode')
  .option('--debug', 'Run tests in debug mode')
  .option('--ui', 'Run tests in UI mode')
  .option('--no-healing', 'Disable MindTrace Heal module')
  .option('--no-classification', 'Disable MindTrace RCA module')
  .option('--run-name <name>', 'Deterministic run name (recommended in CI)')
  .action(async (options) => {
    console.log('🧠 Starting MindTrace-Enhanced Playwright Tests...\n');
    console.log('Framework Style:', options.style);
    console.log('MindTrace Heal:', options.healing ? '✅ Enabled' : '❌ Disabled');
    console.log('MindTrace RCA:', options.classification ? '✅ Enabled' : '❌ Disabled');
    console.log('');

    const cwd = process.cwd();
    const runName =
      options.runName ||
      process.env.MINDTRACE_RUN_NAME ||
      `run-${options.style}-${Date.now()}`;

    // Ensure run folder layout exists early so CI always has a deterministic place to publish artifacts
    const layout = ensureRunLayout({ cwd, runName });

    // Build Playwright command
    const playwrightArgs: string[] = ['test'];

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

    // Set environment variables for MindTrace
    const env = {
      ...process.env,
      MINDTRACE_ENABLED: 'true',
      MINDTRACE_STYLE: options.style,
      MINDTRACE_RUN_NAME: runName,
      MINDTRACE_HEAL_ENABLED: options.healing ? 'true' : 'false',
      MINDTRACE_RCA_ENABLED: options.classification ? 'true' : 'false',
    };

    // Run Playwright
    const playwrightProcess = spawn('npx', ['playwright', ...playwrightArgs], {
      stdio: 'inherit',
      env,
    });

    playwrightProcess.on('close', async (code) => {
      const exitCode = code ?? 0;

      try {
        // Always generate placeholder artifacts if missing so validation can run deterministically
        await postRunGenerateArtifacts({ cwd, runName });

        // Validate artifacts exist + JSON is parseable
        await validateArtifacts({ cwd, runName });

        // Governance gate: fail CI on real failures, allow flaky pass (based on RCA isFlaky)
        await governanceGate({ cwd, runName, exitCode });

        // Immutable-ish audit trail (append-only)
        await finalizeAuditTrail({ cwd, runName });

        // Historical indexing
        await indexHistoricalRun({ cwd, runName });

        // Report bundle
        await generateReportBundle({ cwd, runName });

        console.log('');
        if (exitCode === 0) {
          console.log('✅ Tests completed successfully!');
        } else {
          console.log('❌ Tests failed (but MindTrace artifacts + RCA generated).');
        }

        console.log('');
        console.log('📦 Run output:');
        console.log(`   - Run folder:   ${layout.runDir}`);
        console.log(`   - Artifacts:    ${layout.artifactsDir}`);
        console.log(`   - Audit trail:  ${layout.auditDir}`);
        console.log(`   - History index:${layout.historyIndexPath}`);
        console.log('');

        process.exit(exitCode);
      } catch (err) {
        console.error('\n❌ MindTrace pipeline failed:', err instanceof Error ? err.message : err);
        process.exit(exitCode || 1);
      }
    });
  });

program
  .command('validate-artifacts')
  .description('Validate required MindTrace artifacts for a run')
  .requiredOption('-r, --run <name>', 'Run name')
  .action(async (options) => {
    await validateArtifacts({ cwd: process.cwd(), runName: options.run });
    console.log('✅ Artifact validation passed');
  });

program
  .command('gate')
  .description('Apply pipeline governance gate for a run')
  .requiredOption('-r, --run <name>', 'Run name')
  .option('--exit-code <n>', 'Test runner exit code', '0')
  .action(async (options) => {
    const exitCode = Number(options.exitCode);
    await governanceGate({ cwd: process.cwd(), runName: options.run, exitCode });
    console.log('✅ Governance gate passed');
  });

program
  .command('finalize-run')
  .description('Finalize audit trail for a run')
  .requiredOption('-r, --run <name>', 'Run name')
  .action(async (options) => {
    await finalizeAuditTrail({ cwd: process.cwd(), runName: options.run });
    console.log('✅ Audit finalized');
  });

program
  .command('index-run')
  .description('Index a run into historical execution store')
  .requiredOption('-r, --run <name>', 'Run name')
  .action(async (options) => {
    await indexHistoricalRun({ cwd: process.cwd(), runName: options.run });
    console.log('✅ Run indexed');
  });

program
  .command('report')
  .description('Generate report bundle for a run')
  .requiredOption('-r, --run <name>', 'Run name')
  .option('-o, --output <path>', 'Output directory (relative to repo root)', 'reports')
  .action(async (options) => {
    await generateReportBundle({
      cwd: process.cwd(),
      runName: options.run,
      outputDir: options.output,
    });
    console.log('✅ Report generated');
  });

program.parse();
