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

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Should not fail");

    expect(result.hash).toBeDefined();
    expect(result.hash).toMatch(/^[a-f0-9]{64}$/); // SHA256 hex format
    expect(result.filesWritten).toHaveLength(4);
    expect(result.filesWritten).toEqual([
      "automation-contract.json",
      "contract.fingerprint.sha256",
      "contract.meta.json",
      "page-key-policy.json"
    ]);

    // Verify all files exist
    const contractDir = path.join(testRepoRoot, ".mindtrace", "contracts");
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

    const contractDir = path.join(testRepoRoot, ".mindtrace", "contracts");
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

    expect(result1.hash).toBe(result2.hash);
    expect(result1.hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("hash file is written last (commit marker)", async () => {
    const result = await generateContractBundle({
      repoRoot: testRepoRoot,
      mode: "strict"
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Should not fail");

    const contractDir = path.join(testRepoRoot, ".mindtrace", "contracts");
    const hashPath = path.join(contractDir, "contract.fingerprint.sha256");
    const hashContent = (await fs.readFile(hashPath, "utf-8")).trim();

    // Recompute hash and verify it matches
    const fpResult = computeContractFingerprint(contractDir, "strict");
    expect(fpResult.ok).toBe(true);
    if (fpResult.ok) {
      expect(hashContent).toBe(fpResult.fingerprint);
      expect(result.hash).toBe(fpResult.fingerprint);
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
});
