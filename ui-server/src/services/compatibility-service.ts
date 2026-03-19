import { existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { getTargetRepoRoot } from '../utils/target-repo-root.js';

export interface CompatibilityResult {
  compatible: boolean;
  level: 'full' | 'partial' | 'unsupported';
  checks: {
    playwrightConfig: boolean;
    testFiles: boolean;
    pagePatterns: boolean;
  };
  details: {
    configFile?: string;
    testFileCount: number;
    pageCount: number;
    message: string;
  };
}

/**
 * Compatibility Check Service
 *
 * Detects if the repository is compatible with Breakline V1.
 *
 * Current scope: Playwright-based repositories only.
 * Future: Pluggable detectors, multi-framework support.
 */
export class CompatibilityService {
  /**
   * Check repository compatibility
   *
   * Detects:
   * - Playwright configuration files
   * - Test files (*.spec.ts, *.test.ts)
   * - Page patterns (typical Playwright structure)
   *
   * NOTE: Checks the target repository, not BreakLine installation
   */
  static checkCompatibility(): CompatibilityResult {
    const repoRoot = getTargetRepoRoot();

    // Check 1: Playwright configuration
    const playwrightConfig = this.detectPlaywrightConfig(repoRoot);

    // Check 2: Test files
    const testFiles = this.detectTestFiles(repoRoot);

    // Check 3: Page patterns (basic heuristic)
    const pagePatterns = this.detectPagePatterns(repoRoot);

    // Determine compatibility level
    const checks = {
      playwrightConfig: playwrightConfig.found,
      testFiles: testFiles.count > 0,
      pagePatterns: pagePatterns.count > 0
    };

    let level: 'full' | 'partial' | 'unsupported';
    let compatible: boolean;
    let message: string;

    if (checks.playwrightConfig && checks.testFiles && checks.pagePatterns) {
      level = 'full';
      compatible = true;
      message = 'Full support: Playwright configuration, test files, and page patterns detected.';
    } else if (checks.playwrightConfig && checks.testFiles) {
      level = 'partial';
      compatible = true;
      message = 'Partial support: Playwright configuration and test files found, but limited page structure detected. Cache may be incomplete.';
    } else if (!checks.playwrightConfig) {
      level = 'unsupported';
      compatible = false;
      message = 'No supported test framework detected. Breakline V1 currently supports Playwright-based repositories.';
    } else {
      level = 'unsupported';
      compatible = false;
      message = 'Insufficient test structure detected. Playwright configuration found but no test files.';
    }

    return {
      compatible,
      level,
      checks,
      details: {
        configFile: playwrightConfig.file,
        testFileCount: testFiles.count,
        pageCount: pagePatterns.count,
        message
      }
    };
  }

  /**
   * Detect Playwright configuration files
   * Checks root directory and common subdirectories
   */
  private static detectPlaywrightConfig(repoRoot: string): { found: boolean; file?: string } {
    const configFiles = [
      'playwright.config.ts',
      'playwright.config.js',
      'playwright.config.mjs'
    ];

    // Check root directory first
    for (const file of configFiles) {
      const configPath = join(repoRoot, file);
      if (existsSync(configPath)) {
        return { found: true, file };
      }
    }

    // Check common subdirectories (for monorepos)
    const commonDirs = ['frameworks', 'packages', 'apps', 'tests', 'e2e'];

    for (const dir of commonDirs) {
      const dirPath = join(repoRoot, dir);
      if (!existsSync(dirPath)) continue;

      try {
        const entries = readdirSync(dirPath, { withFileTypes: true });

        for (const entry of entries) {
          if (!entry.isDirectory()) continue;

          for (const file of configFiles) {
            const configPath = join(dirPath, entry.name, file);
            if (existsSync(configPath)) {
              return { found: true, file: `${dir}/${entry.name}/${file}` };
            }
          }
        }
      } catch (error) {
        // Ignore errors reading subdirectories
      }
    }

    return { found: false };
  }

  /**
   * Detect test files (*.spec.ts, *.test.ts)
   * Checks root directory and common subdirectories (monorepo support)
   */
  private static detectTestFiles(repoRoot: string): { count: number } {
    let count = 0;

    // Common test directories at root level
    const testDirs = ['tests', 'test', 'e2e', '__tests__', 'specs'];

    for (const dir of testDirs) {
      const testPath = join(repoRoot, dir);
      if (existsSync(testPath)) {
        count += this.countTestFiles(testPath);
      }
    }

    // Check root directory itself
    count += this.countTestFilesInDir(repoRoot, false);

    // Check monorepo subdirectories (frameworks/, packages/, apps/)
    const monorepoRoots = ['frameworks', 'packages', 'apps'];

    for (const monorepoDir of monorepoRoots) {
      const monorepoPath = join(repoRoot, monorepoDir);
      if (!existsSync(monorepoPath)) continue;

      try {
        const entries = readdirSync(monorepoPath, { withFileTypes: true });

        for (const entry of entries) {
          if (!entry.isDirectory()) continue;

          const projectPath = join(monorepoPath, entry.name);

          // Check test directories within each project
          for (const testDir of testDirs) {
            const testPath = join(projectPath, testDir);
            if (existsSync(testPath)) {
              count += this.countTestFiles(testPath);
            }
          }
        }
      } catch (error) {
        // Ignore errors reading subdirectories
      }
    }

    return { count };
  }

  /**
   * Recursively count test files in directory
   */
  private static countTestFiles(dir: string): number {
    let count = 0;

    try {
      const entries = readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        if (entry.isDirectory()) {
          // Skip node_modules and hidden directories
          if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
            continue;
          }
          count += this.countTestFiles(fullPath);
        } else if (entry.isFile()) {
          if (this.isTestFile(entry.name)) {
            count++;
          }
        }
      }
    } catch (error) {
      // Ignore errors (permission issues, etc.)
    }

    return count;
  }

  /**
   * Count test files in specific directory (non-recursive)
   */
  private static countTestFilesInDir(dir: string, recursive: boolean): number {
    let count = 0;

    try {
      const entries = readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isFile() && this.isTestFile(entry.name)) {
          count++;
        }
      }
    } catch (error) {
      // Ignore errors
    }

    return count;
  }

  /**
   * Check if filename is a test file
   */
  private static isTestFile(filename: string): boolean {
    return (
      filename.endsWith('.spec.ts') ||
      filename.endsWith('.spec.js') ||
      filename.endsWith('.test.ts') ||
      filename.endsWith('.test.js') ||
      filename.endsWith('.e2e.ts') ||
      filename.endsWith('.e2e.js')
    );
  }

  /**
   * Detect page patterns (heuristic: pages/ or page-objects/ directory)
   * Checks root directory and monorepo subdirectories
   */
  private static detectPagePatterns(repoRoot: string): { count: number } {
    const pageDirs = ['pages', 'page-objects', 'pageobjects', 'pom'];
    let count = 0;

    // Check root level
    for (const dir of pageDirs) {
      const pagePath = join(repoRoot, dir);
      if (existsSync(pagePath)) {
        try {
          const files = readdirSync(pagePath);
          count += files.filter(f => f.endsWith('.ts') || f.endsWith('.js')).length;
        } catch (error) {
          // Ignore errors
        }
      }
    }

    // Check monorepo subdirectories
    const monorepoRoots = ['frameworks', 'packages', 'apps'];

    for (const monorepoDir of monorepoRoots) {
      const monorepoPath = join(repoRoot, monorepoDir);
      if (!existsSync(monorepoPath)) continue;

      try {
        const entries = readdirSync(monorepoPath, { withFileTypes: true });

        for (const entry of entries) {
          if (!entry.isDirectory()) continue;

          const projectPath = join(monorepoPath, entry.name);

          // Check page directories within each project
          for (const pageDir of pageDirs) {
            const pagePath = join(projectPath, pageDir);
            if (existsSync(pagePath)) {
              try {
                const files = readdirSync(pagePath);
                count += files.filter(f => f.endsWith('.ts') || f.endsWith('.js')).length;
              } catch (error) {
                // Ignore errors
              }
            }
          }
        }
      } catch (error) {
        // Ignore errors
      }
    }

    return { count };
  }
}
