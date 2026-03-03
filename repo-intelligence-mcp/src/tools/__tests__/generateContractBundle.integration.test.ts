import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { generateContractBundle } from "../generateContractBundle.js";
import { validateContractBundle } from "../../contracts/validateContractBundle.js";
import { computeContractFingerprint } from "../fingerprintContract.js";
import { resolveContractDir } from "../../core/paths.js";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import * as crypto from "node:crypto";

describe("generateContractBundle (integration)", () => {
  let testRepoRoot: string;

  beforeEach(async () => {
    testRepoRoot = path.join(os.tmpdir(), `test-repo-${crypto.randomUUID()}`);
    await fs.mkdir(testRepoRoot, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testRepoRoot, { recursive: true, force: true });
  });

  it("generates complete contract bundle on fresh repo", async () => {
    const result = await generateContractBundle({
      repoRoot: testRepoRoot,
      mode: "strict"
    });

    if (!result.ok) {
      console.error("Generation failed:", result.error);
    }
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Should not fail");

    expect(result.contractSha256).toBeDefined();
    expect(result.contractSha256).toMatch(/^[a-f0-9]{64}$/); // SHA256 hex format
    expect(result.filesWritten).toHaveLength(4);
    expect(result.filesWritten).toEqual([
      "automation-contract.json",
      "contract.fingerprint.sha256",
      "contract.meta.json",
      "page-key-policy.json"
    ]);

    // Verify all files exist
    const { dir: contractDir } = resolveContractDir(testRepoRoot);
    for (const file of result.filesWritten) {
      const filePath = path.join(contractDir, file);
      const exists = await fs.access(filePath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    }
  });

  it("validates generated bundle passes schema validation", async () => {
    await generateContractBundle({
      repoRoot: testRepoRoot,
      mode: "best_effort"
    });

    const { dir: contractDir } = resolveContractDir(testRepoRoot);
    const validation = await validateContractBundle(contractDir);

    expect(validation.valid).toBe(true);
    expect(validation.errors).toEqual([]);
  });

  it("produces deterministic fingerprint across runs", async () => {
    const result1 = await generateContractBundle({
      repoRoot: testRepoRoot,
      mode: "strict"
    });

    const result2 = await generateContractBundle({
      repoRoot: testRepoRoot,
      mode: "strict"
    });

    expect(result1.ok).toBe(true);
    expect(result2.ok).toBe(true);

    if (!result1.ok || !result2.ok) throw new Error("Should not fail");

    expect(result1.contractSha256).toBe(result2.contractSha256);
    expect(result1.contractSha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("hash file is written last (commit marker)", async () => {
    const result = await generateContractBundle({
      repoRoot: testRepoRoot,
      mode: "strict"
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Should not fail");

    const { dir: contractDir } = resolveContractDir(testRepoRoot);
    const hashPath = path.join(contractDir, "contract.fingerprint.sha256");
    const hashContent = (await fs.readFile(hashPath, "utf-8")).trim();

    // Recompute hash and verify it matches
    const fpResult = computeContractFingerprint(contractDir, "strict");
    expect(fpResult.ok).toBe(true);
    if (fpResult.ok) {
      expect(hashContent).toBe(fpResult.fingerprint);
      expect(result.contractSha256).toBe(fpResult.fingerprint);
    }
  });

  it("uses real scanRepo instead of placeholder topology", async () => {
    // Create a test file to ensure scanning works
    await fs.writeFile(path.join(testRepoRoot, "test.spec.ts"), `
import { test, expect } from '@playwright/test';

test('example', async ({ page }) => {
  await page.goto('https://example.com');
  expect(await page.title()).toBe('Example');
});
  `);

    const result = await generateContractBundle({
      repoRoot: testRepoRoot,
      mode: "strict"
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Should not fail");

    // Read repo-topology.json (which contains the scanned topology)
    const { dir: contractDir } = resolveContractDir(testRepoRoot);
    const topologyPath = path.join(contractDir, "repo-topology.json");
    const topology = JSON.parse(await fs.readFile(topologyPath, "utf-8"));

    // Verify topology includes scanned files (not empty placeholder)
    expect(topology.files).toBeDefined();
    expect(topology.files.count).toBeGreaterThan(0);
    expect(topology.files.paths).toContain("test.spec.ts");
  });

  it("detects framework from actual repository", async () => {
    // Create playwright.config.ts to ensure detection
    await fs.writeFile(path.join(testRepoRoot, "playwright.config.ts"), `
import { defineConfig } from '@playwright/test';
export default defineConfig({});
  `);

    // Create package.json with playwright dependency
    await fs.writeFile(path.join(testRepoRoot, "package.json"), JSON.stringify({
      name: "test-repo",
      dependencies: {
        "@playwright/test": "^1.40.0"
      }
    }));

    const result = await generateContractBundle({
      repoRoot: testRepoRoot,
      mode: "strict"
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Should not fail");

    const { dir: contractDir } = resolveContractDir(testRepoRoot);

    // Check automation-contract.json for framework
    const contractPath = path.join(contractDir, "automation-contract.json");
    const contract = JSON.parse(await fs.readFile(contractPath, "utf-8"));
    expect(contract.framework).toBe("playwright");

    // Check framework-pattern.json for confidence (where it's actually stored)
    const frameworkPatternPath = path.join(contractDir, "framework-pattern.json");
    const frameworkPattern = JSON.parse(await fs.readFile(frameworkPatternPath, "utf-8"));
    expect(frameworkPattern.framework).toBe("playwright");
    expect(frameworkPattern.confidence).toBeGreaterThan(0.5);

    // Verify real detection by checking evidence array is populated
    // (hardcoded placeholder has empty signalsUsed array)
    expect(frameworkPattern.evidence).toBeDefined();
    expect(frameworkPattern.evidence.length).toBeGreaterThan(0);
    expect(frameworkPattern.evidence).toContain("playwright.config.ts");
  });

  it("infers structure from actual repository patterns", async () => {
    // Create BDD-style structure
    await fs.mkdir(path.join(testRepoRoot, "features"), { recursive: true });
    await fs.writeFile(path.join(testRepoRoot, "features/login.feature"), `
Feature: Login
  Scenario: Successful login
    Given I am on the login page
    When I enter credentials
    Then I should be logged in
  `);

    await fs.mkdir(path.join(testRepoRoot, "step_definitions"), { recursive: true });
    await fs.writeFile(path.join(testRepoRoot, "step_definitions/login.ts"), `
import { Given, When, Then } from '@cucumber/cucumber';
  `);

    const result = await generateContractBundle({
      repoRoot: testRepoRoot,
      mode: "strict"
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Should not fail");

    const { dir: contractDir } = resolveContractDir(testRepoRoot);
    const contractPath = path.join(contractDir, "automation-contract.json");
    const contract = JSON.parse(await fs.readFile(contractPath, "utf-8"));

    // Verify BDD structure detected (architecture field stores the style)
    expect(contract.architecture).toBe("bdd");
  });

  it("detects locator style from actual test files", async () => {
    // Create test file with data-testid usage (scanner looks for string "data-testid")
    await fs.writeFile(path.join(testRepoRoot, "login.spec.ts"), `
import { test, expect } from '@playwright/test';

test('login', async ({ page }) => {
  await page.locator('[data-testid="username"]').fill('user');
  await page.locator('[data-testid="password"]').fill('pass');
  await page.getByRole('button', { name: 'Login' }).click();
});
  `);

    const result = await generateContractBundle({
      repoRoot: testRepoRoot,
      mode: "strict"
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Should not fail");

    const { dir: contractDir } = resolveContractDir(testRepoRoot);
    const selectorStrategyPath = path.join(contractDir, "selector-strategy.json");
    const selectorStrategy = JSON.parse(await fs.readFile(selectorStrategyPath, "utf-8"));

    // Verify locator preferences detected from test patterns
    expect(selectorStrategy.preferred).toContain("data-testid");
    expect(selectorStrategy.preferred).toContain("role");
  });

  it("detects assertion style from actual test files", async () => {
    // Create test file with .should() assertions (Cypress-style)
    // This will fail with the hardcoded placeholder which always returns "expect"
    await fs.writeFile(path.join(testRepoRoot, "cypress-assertions.cy.ts"), `
describe('Login', () => {
  it('validates login form', () => {
    cy.visit('/login');
    cy.get('#username').should('be.visible');
    cy.get('#password').should('be.visible');
    cy.get('form').should('have.class', 'login-form');
  });
});
  `);

    const result = await generateContractBundle({
      repoRoot: testRepoRoot,
      mode: "strict"
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Should not fail");

    const { dir: contractDir } = resolveContractDir(testRepoRoot);
    const assertionStylePath = path.join(contractDir, "assertion-style.json");
    const assertionStyle = JSON.parse(await fs.readFile(assertionStylePath, "utf-8"));

    // Verify should-style assertions detected (not hardcoded "expect")
    expect(assertionStyle.primaryStyle).toBe("should");
  });

  it("builds contract-derived cache when buildCache: true", async () => {
    const result = await generateContractBundle({
      repoRoot: testRepoRoot,
      buildCache: true
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Should not fail");

    // Verify cache directory exists
    const cachePath = path.join(testRepoRoot, ".mcp-cache/pages");
    const cacheExists = await fs.access(cachePath).then(() => true).catch(() => false);
    expect(cacheExists).toBe(true);

    // Verify cache files include contractSha256
    const cacheFiles = await fs.readdir(cachePath);
    expect(cacheFiles.length).toBeGreaterThan(0);

    // Verify index.json exists
    const indexExists = cacheFiles.includes("index.json");
    expect(indexExists).toBe(true);

    // Read index.json and verify contractSha256 linkage
    const indexContent = JSON.parse(
      await fs.readFile(path.join(cachePath, "index.json"), "utf-8")
    );
    expect(indexContent.contractSha256).toBe(result.contractSha256);
    expect(indexContent.cacheVersion).toBe("0.1.0");

    // Check individual page cache files (if any)
    for (const file of cacheFiles) {
      if (file === "index.json") continue; // Skip index file

      const cacheEntry = JSON.parse(
        await fs.readFile(path.join(cachePath, file), "utf-8")
      );
      expect(cacheEntry.contractSha256).toBe(result.contractSha256);
      expect(cacheEntry.generatedAt).toBeUndefined(); // NO timestamp
    }
  });

  it("skips cache building when buildCache: false (default)", async () => {
    const result = await generateContractBundle({
      repoRoot: testRepoRoot,
      buildCache: false  // Explicit false
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Should not fail");

    // Verify cache directory does NOT exist
    const cachePath = path.join(testRepoRoot, ".mcp-cache");
    const cacheExists = await fs.access(cachePath).then(() => true).catch(() => false);
    expect(cacheExists).toBe(false);
  });
});
