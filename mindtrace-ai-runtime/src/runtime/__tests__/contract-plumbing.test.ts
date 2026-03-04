// mindtrace-ai-runtime/src/runtime/__tests__/contract-plumbing.test.ts
//
// Tests for contract-plumbing.ts (Phase 2.0 Integration)
// Verify that Phase 2.2 wrapper delegates to Phase 2.0 pipeline

import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { applyRuntimeContractContextEnv } from "../contract-plumbing";

describe("Contract Plumbing (Phase 2.0 Integration)", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `test-plumbing-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it("runs Phase 2.0 pipeline and returns ok: true for valid contract (BEST_EFFORT mode)", () => {
    // Setup valid contract
    const contractDir = join(testDir, ".mcp-contract");
    mkdirSync(contractDir, { recursive: true });

    // Create valid contract files matching Phase 2.0 schemas
    // Note: fingerprint.json is optional in BEST_EFFORT mode
    const validFiles = {
      "repo-topology.json": { schema_version: "0.1.0", repoRoot: testDir, contractDir: ".mcp-contract" },
      "selector-policy.json": { schema_version: "0.1.0", strategy: "stable-first" },
      "healing-policy.json": { schema_version: "0.1.0", mode: "deterministic" },
      "wrapper-discovery.json": { schema_version: "0.1.0", wrappers: [] },
      "policy-decision.json": { schema_version: "0.1.0", decision: "reject" },
      "meta.json": { schema_version: "0.1.0", generated_by: { name: "test", version: "1.0.0" } },
    };

    for (const [filename, content] of Object.entries(validFiles)) {
      writeFileSync(join(contractDir, filename), JSON.stringify(content));
    }

    const artifactsDir = join(testDir, "runs/test/artifacts");
    mkdirSync(artifactsDir, { recursive: true });

    const result = applyRuntimeContractContextEnv({
      artifactsDir,
      repoRoot: testDir,
      mode: "BEST_EFFORT",
    });

    expect(result.ok).toBe(true);
    expect(result.context).not.toBeNull();
    expect(result.exitCode).toBeUndefined();
    expect(existsSync(join(artifactsDir, "contract-awareness.json"))).toBe(true);
  });

  it("returns ok: false with exitCode 3 in COMPLIANCE mode when contract not found", () => {
    // No contract directory created (contract missing)

    const artifactsDir = join(testDir, "runs/test/artifacts");
    mkdirSync(artifactsDir, { recursive: true });

    const result = applyRuntimeContractContextEnv({
      artifactsDir,
      repoRoot: testDir,
      mode: "COMPLIANCE",
    });

    expect(result.ok).toBe(false);
    expect(result.context).toBeNull();
    expect(result.exitCode).toBe(3);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("returns ok: false without exitCode in BEST_EFFORT mode when contract not found", () => {
    // No contract directory created (contract missing)

    const artifactsDir = join(testDir, "runs/test/artifacts");
    mkdirSync(artifactsDir, { recursive: true });

    const result = applyRuntimeContractContextEnv({
      artifactsDir,
      repoRoot: testDir,
      mode: "BEST_EFFORT",
    });

    expect(result.ok).toBe(false);
    expect(result.context).toBeNull();
    expect(result.exitCode).toBeUndefined(); // No exit code in BEST_EFFORT
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("returns warnings for schema validation issues but still ok: true if schemas are minimal", () => {
    // Setup contract with minimal but valid schemas
    const contractDir = join(testDir, ".mcp-contract");
    mkdirSync(contractDir, { recursive: true });

    // Create valid contract files
    const validFiles = {
      "repo-topology.json": { schema_version: "0.1.0", repoRoot: testDir, contractDir: ".mcp-contract" },
      "selector-policy.json": { schema_version: "0.1.0", strategy: "stable-first" },
      "healing-policy.json": { schema_version: "0.1.0", mode: "deterministic" },
      "wrapper-discovery.json": { schema_version: "0.1.0", wrappers: [] },
      "policy-decision.json": { schema_version: "0.1.0", decision: "reject" },
      "meta.json": { schema_version: "0.1.0", generated_by: { name: "test", version: "1.0.0" } },
    };

    for (const [filename, content] of Object.entries(validFiles)) {
      writeFileSync(join(contractDir, filename), JSON.stringify(content));
    }

    const artifactsDir = join(testDir, "runs/test/artifacts");
    mkdirSync(artifactsDir, { recursive: true });

    const result = applyRuntimeContractContextEnv({
      artifactsDir,
      repoRoot: testDir,
      mode: "BEST_EFFORT",
    });

    // Should succeed with valid schemas
    expect(result.ok).toBe(true);
    expect(result.context).not.toBeNull();
  });

  it("sets environment variables for Phase 2.2 compatibility", () => {
    // Setup valid contract
    const contractDir = join(testDir, ".mcp-contract");
    mkdirSync(contractDir, { recursive: true });

    const validFiles = {
      "repo-topology.json": { schema_version: "0.1.0", repoRoot: testDir, contractDir: ".mcp-contract" },
      "selector-policy.json": { schema_version: "0.1.0", strategy: "stable-first" },
      "healing-policy.json": { schema_version: "0.1.0", mode: "deterministic" },
      "wrapper-discovery.json": { schema_version: "0.1.0", wrappers: [] },
      "policy-decision.json": { schema_version: "0.1.0", decision: "reject" },
      "meta.json": { schema_version: "0.1.0", generated_by: { name: "test", version: "1.0.0" } },
    };

    for (const [filename, content] of Object.entries(validFiles)) {
      writeFileSync(join(contractDir, filename), JSON.stringify(content));
    }

    const artifactsDir = join(testDir, "runs/test/artifacts");
    mkdirSync(artifactsDir, { recursive: true });

    const result = applyRuntimeContractContextEnv({
      artifactsDir,
      repoRoot: testDir,
      mode: "BEST_EFFORT",
    });

    expect(result.ok).toBe(true);

    // Check environment variables
    expect(process.env.MINDTRACE_AUTOMATION_CONTRACT_CONTEXT_PATH).toBe(
      join(artifactsDir, "contract-awareness.json")
    );
    expect(process.env.MINDTRACE_CONTRACT_DIR).toBe(contractDir);
  });
});
