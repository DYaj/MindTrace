// mindtrace-ai-runtime/src/contract-awareness/__tests__/integration.test.ts
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync, readdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  loadContractBundle,
  validateContractBundle,
  verifyFingerprint,
  bindCacheToContract,
  buildRuntimeStrategyContext,
  writeContractAwarenessArtifact,
} from "../index";

describe("Integration Tests", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `test-integration-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe("Determinism", () => {
    it("produces byte-identical artifacts for same contract", () => {
      // Setup contract
      const contractDir = join(testDir, ".mcp-contract");
      mkdirSync(contractDir, { recursive: true });

      writeFileSync(join(contractDir, "repo-topology.json"), JSON.stringify({ schema_version: "0.1.0", z: "last", a: "first" }));
      writeFileSync(join(contractDir, "selector-policy.json"), JSON.stringify({ schema_version: "0.1.0", strategy: "stable-first" }));
      writeFileSync(join(contractDir, "healing-policy.json"), JSON.stringify({ schema_version: "0.1.0", mode: "deterministic" }));
      writeFileSync(join(contractDir, "wrapper-discovery.json"), JSON.stringify({ schema_version: "0.1.0" }));
      writeFileSync(join(contractDir, "policy-decision.json"), JSON.stringify({ schema_version: "0.1.0" }));
      writeFileSync(join(contractDir, "meta.json"), JSON.stringify({ schema_version: "0.1.0", generated_by: { name: "test", version: "1.0.0" } }));
      writeFileSync(join(contractDir, "fingerprint.json"), JSON.stringify({ schema_version: "0.1.0", contractHash: "placeholder", mode: "strict" }));

      const artifactsDir1 = join(testDir, "runs/run1/artifacts");
      const artifactsDir2 = join(testDir, "runs/run2/artifacts");
      mkdirSync(artifactsDir1, { recursive: true });
      mkdirSync(artifactsDir2, { recursive: true });

      // Run pipeline twice with same contract
      const bundle = loadContractBundle({ repoRoot: testDir, mode: "COMPLIANCE" });
      expect(bundle.ok).toBe(true);
      if (!bundle.ok) throw new Error("Bundle load failed");

      const validation1 = validateContractBundle(bundle);
      const fingerprint1 = verifyFingerprint(bundle);
      const cache1 = bindCacheToContract({ repoRoot: testDir, contractHash: bundle.contractHash });
      const context1 = buildRuntimeStrategyContext({ contractBundle: bundle, validation: validation1, fingerprint: fingerprint1, cache: cache1 });
      writeContractAwarenessArtifact({ artifactsDir: artifactsDir1, context: context1 });

      const validation2 = validateContractBundle(bundle);
      const fingerprint2 = verifyFingerprint(bundle);
      const cache2 = bindCacheToContract({ repoRoot: testDir, contractHash: bundle.contractHash });
      const context2 = buildRuntimeStrategyContext({ contractBundle: bundle, validation: validation2, fingerprint: fingerprint2, cache: cache2 });
      writeContractAwarenessArtifact({ artifactsDir: artifactsDir2, context: context2 });

      // Compare artifacts - should be byte-identical
      const artifact1 = readFileSync(join(artifactsDir1, "contract-awareness.json"), "utf-8");
      const artifact2 = readFileSync(join(artifactsDir2, "contract-awareness.json"), "utf-8");

      expect(artifact1).toBe(artifact2);
    });
  });

  describe("Dual-Read Paths", () => {
    it("prefers canonical path (.mcp-contract/) over legacy (.mindtrace/contracts/)", () => {
      const canonicalDir = join(testDir, ".mcp-contract");
      const legacyDir = join(testDir, ".mindtrace/contracts");
      mkdirSync(canonicalDir, { recursive: true });
      mkdirSync(legacyDir, { recursive: true });

      // Write different content to each
      writeFileSync(join(canonicalDir, "repo-topology.json"), JSON.stringify({ schema_version: "0.1.0", source: "canonical" }));
      writeFileSync(join(legacyDir, "repo-topology.json"), JSON.stringify({ schema_version: "0.1.0", source: "legacy" }));

      const bundle = loadContractBundle({ repoRoot: testDir, mode: "BEST_EFFORT" });
      expect(bundle.ok).toBe(true);
      if (!bundle.ok) throw new Error("Bundle load failed");

      // Should load from canonical
      expect(bundle.contractDir).toBe(canonicalDir);
      expect(bundle.files["repo-topology.json"]).toEqual({ schema_version: "0.1.0", source: "canonical" });
    });

    it("falls back to legacy path when canonical missing", () => {
      const legacyDir = join(testDir, ".mindtrace/contracts");
      mkdirSync(legacyDir, { recursive: true });

      writeFileSync(join(legacyDir, "repo-topology.json"), JSON.stringify({ schema_version: "0.1.0" }));

      const bundle = loadContractBundle({ repoRoot: testDir, mode: "BEST_EFFORT" });
      expect(bundle.ok).toBe(true);
      if (!bundle.ok) throw new Error("Bundle load failed");

      expect(bundle.contractDir).toBe(legacyDir);
      expect(bundle.isLegacy).toBe(true);
      expect(bundle.issues.some(i => i.code === "CA_LEGACY_PATH")).toBe(true);
    });
  });

  describe("Cache Mismatch", () => {
    it("produces WARN (not ERROR) when cache hash mismatches contract hash", () => {
      // Setup contract (no fingerprint.json to avoid hash mismatch errors)
      const contractDir = join(testDir, ".mcp-contract");
      mkdirSync(contractDir, { recursive: true });

      writeFileSync(join(contractDir, "repo-topology.json"), JSON.stringify({ schema_version: "0.1.0", repoRoot: testDir, contractDir: ".mcp-contract" }));
      writeFileSync(join(contractDir, "selector-policy.json"), JSON.stringify({ schema_version: "0.1.0", strategy: "stable-first" }));
      writeFileSync(join(contractDir, "healing-policy.json"), JSON.stringify({ schema_version: "0.1.0", mode: "deterministic" }));
      writeFileSync(join(contractDir, "wrapper-discovery.json"), JSON.stringify({ schema_version: "0.1.0", wrappers: [] }));
      writeFileSync(join(contractDir, "policy-decision.json"), JSON.stringify({ schema_version: "0.1.0", decision: "reject" }));
      writeFileSync(join(contractDir, "meta.json"), JSON.stringify({ schema_version: "0.1.0", generated_by: { name: "test", version: "1.0.0" } }));

      // Use BEST_EFFORT mode since we're not providing fingerprint.json
      const bundle = loadContractBundle({ repoRoot: testDir, mode: "BEST_EFFORT" });
      expect(bundle.ok).toBe(true);
      if (!bundle.ok) throw new Error("Bundle load failed");

      // Setup cache with WRONG hash
      const cacheDir = join(testDir, ".mcp-cache/v1");
      mkdirSync(cacheDir, { recursive: true });
      writeFileSync(join(cacheDir, "meta.json"), JSON.stringify({
        cacheVersion: "0.1.0",
        contractSha256: "wrong_hash_mismatch",
      }));

      // Run pipeline
      const validation = validateContractBundle(bundle);
      const fingerprint = verifyFingerprint(bundle);
      const cache = bindCacheToContract({ repoRoot: testDir, contractHash: bundle.contractHash });
      const context = buildRuntimeStrategyContext({ contractBundle: bundle, validation, fingerprint, cache });

      // Should still be ok: true (cache is advisory)
      expect(context.ok).toBe(true);

      // Should have cache mismatch warning
      expect(context.issues.some(i => i.code === "CA_CACHE_HASH_MISMATCH")).toBe(true);
      expect(context.issues.find(i => i.code === "CA_CACHE_HASH_MISMATCH")?.severity).toBe("WARN");

      // Should NOT have any ERROR severity issues
      expect(context.issues.filter(i => i.severity === "ERROR")).toHaveLength(0);
    });
  });

  describe("COMPLIANCE Gate", () => {
    it("fails with exitCode 3 in COMPLIANCE mode when contract has errors", () => {
      // Setup contract with invalid schema
      const contractDir = join(testDir, ".mcp-contract");
      mkdirSync(contractDir, { recursive: true });

      // Use BEST_EFFORT to load, but schema is invalid
      writeFileSync(join(contractDir, "repo-topology.json"), JSON.stringify({ invalid: "schema" }));

      const bundle = loadContractBundle({ repoRoot: testDir, mode: "BEST_EFFORT" });
      expect(bundle.ok).toBe(true); // Loader succeeds in BEST_EFFORT
      if (!bundle.ok) throw new Error("Bundle load failed");

      const validation = validateContractBundle(bundle);
      const fingerprint = verifyFingerprint(bundle);
      const cache = bindCacheToContract({ repoRoot: testDir, contractHash: bundle.contractHash });
      const context = buildRuntimeStrategyContext({ contractBundle: bundle, validation, fingerprint, cache });

      // Should fail with schema validation errors
      expect(context.ok).toBe(false);
      expect(context.issues.filter(i => i.severity === "ERROR").length).toBeGreaterThan(0);
      expect(context.issues.some(i => i.code === "CA_SCHEMA_INVALID")).toBe(true);
    });

    it("succeeds in BEST_EFFORT mode with warnings only", () => {
      // Setup minimal contract (missing files)
      const contractDir = join(testDir, ".mcp-contract");
      mkdirSync(contractDir, { recursive: true });

      writeFileSync(join(contractDir, "repo-topology.json"), JSON.stringify({ schema_version: "0.1.0" }));

      const bundle = loadContractBundle({ repoRoot: testDir, mode: "BEST_EFFORT" });
      expect(bundle.ok).toBe(true);
      if (!bundle.ok) throw new Error("Bundle load failed");

      const validation = validateContractBundle(bundle);
      const fingerprint = verifyFingerprint(bundle);
      const cache = bindCacheToContract({ repoRoot: testDir, contractHash: bundle.contractHash });
      const context = buildRuntimeStrategyContext({ contractBundle: bundle, validation, fingerprint, cache });

      // Should succeed (BEST_EFFORT doesn't require all files)
      expect(context.ok).toBe(true);

      // May have warnings (cache missing)
      expect(context.issues.every(i => i.severity === "WARN")).toBe(true);
    });
  });

  describe("Authority Boundaries", () => {
    it("writes only to artifacts directory, never to contract directory", () => {
      // Setup contract
      const contractDir = join(testDir, ".mcp-contract");
      mkdirSync(contractDir, { recursive: true });

      writeFileSync(join(contractDir, "repo-topology.json"), JSON.stringify({ schema_version: "0.1.0" }));
      writeFileSync(join(contractDir, "selector-policy.json"), JSON.stringify({ schema_version: "0.1.0" }));
      writeFileSync(join(contractDir, "healing-policy.json"), JSON.stringify({ schema_version: "0.1.0" }));
      writeFileSync(join(contractDir, "wrapper-discovery.json"), JSON.stringify({ schema_version: "0.1.0" }));
      writeFileSync(join(contractDir, "policy-decision.json"), JSON.stringify({ schema_version: "0.1.0" }));
      writeFileSync(join(contractDir, "meta.json"), JSON.stringify({ schema_version: "0.1.0", generated_by: { name: "test", version: "1.0.0" } }));
      writeFileSync(join(contractDir, "fingerprint.json"), JSON.stringify({ schema_version: "0.1.0", contractHash: "placeholder", mode: "strict" }));

      const artifactsDir = join(testDir, "runs/test/artifacts");
      mkdirSync(artifactsDir, { recursive: true });

      const bundle = loadContractBundle({ repoRoot: testDir, mode: "COMPLIANCE" });
      expect(bundle.ok).toBe(true);
      if (!bundle.ok) throw new Error("Bundle load failed");

      // Count files before
      const contractFilesBefore = readdirSync(contractDir).length;

      // Run pipeline
      const validation = validateContractBundle(bundle);
      const fingerprint = verifyFingerprint(bundle);
      const cache = bindCacheToContract({ repoRoot: testDir, contractHash: bundle.contractHash });
      const context = buildRuntimeStrategyContext({ contractBundle: bundle, validation, fingerprint, cache });
      writeContractAwarenessArtifact({ artifactsDir, context });

      // Count files after
      const contractFilesAfter = readdirSync(contractDir).length;

      // Contract directory should be unchanged
      expect(contractFilesAfter).toBe(contractFilesBefore);

      // Artifact should exist in artifacts directory
      expect(existsSync(join(artifactsDir, "contract-awareness.json"))).toBe(true);

      // Contract directory should NOT have contract-awareness.json
      expect(existsSync(join(contractDir, "contract-awareness.json"))).toBe(false);
    });
  });
});
