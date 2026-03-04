// mindtrace-ai-runtime/src/contract-awareness/__tests__/strategy-context.test.ts
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { buildRuntimeStrategyContext } from "../strategy-context";
import { loadContractBundle } from "../loader";
import { validateContractBundle, verifyFingerprint } from "../validator";
import { bindCacheToContract } from "../cache-binding";

describe("Strategy Context Builder", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `test-strategy-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe("buildRuntimeStrategyContext", () => {
    it("builds complete strategy context from valid contract + cache", () => {
      // Setup contract
      const contractDir = join(testDir, ".mcp-contract");
      mkdirSync(contractDir, { recursive: true });

      const selectorPolicy = { schema_version: "0.1.0", strategy: "stable-first" };
      const healingPolicy = { schema_version: "0.1.0", mode: "deterministic" };

      writeFileSync(join(contractDir, "repo-topology.json"), JSON.stringify({ schema_version: "0.1.0", repoRoot: testDir, contractDir: ".mcp-contract" }));
      writeFileSync(join(contractDir, "selector-policy.json"), JSON.stringify(selectorPolicy));
      writeFileSync(join(contractDir, "healing-policy.json"), JSON.stringify(healingPolicy));
      writeFileSync(join(contractDir, "wrapper-discovery.json"), JSON.stringify({ schema_version: "0.1.0", wrappers: [] }));
      writeFileSync(join(contractDir, "policy-decision.json"), JSON.stringify({ schema_version: "0.1.0", decision: "reject" }));
      writeFileSync(join(contractDir, "meta.json"), JSON.stringify({ schema_version: "0.1.0", generated_by: { name: "test", version: "1.0.0" } }));

      // Load bundle first to get hash
      const bundle = loadContractBundle({ repoRoot: testDir, mode: "BEST_EFFORT" });
      expect(bundle.ok).toBe(true);
      if (!bundle.ok) throw new Error("Expected bundle load to succeed");

      // Add fingerprint with correct hash
      writeFileSync(join(contractDir, "fingerprint.json"), JSON.stringify({
        schema_version: "0.1.0",
        contractHash: bundle.contractHash,
        mode: "strict",
      }));

      // Reload with all 7 files in COMPLIANCE mode
      const bundleWithFingerprint = loadContractBundle({ repoRoot: testDir, mode: "COMPLIANCE" });
      expect(bundleWithFingerprint.ok).toBe(true);
      if (!bundleWithFingerprint.ok) throw new Error("Expected bundle load to succeed");

      const validation = validateContractBundle(bundleWithFingerprint);
      const fingerprint = verifyFingerprint(bundleWithFingerprint);
      const cache = bindCacheToContract({ repoRoot: testDir, contractHash: bundleWithFingerprint.contractHash });

      const result = buildRuntimeStrategyContext({
        contractBundle: bundleWithFingerprint,
        validation,
        fingerprint,
        cache,
      });

      expect(result.ok).toBe(true);
      expect(result.contractHash).toBe(bundleWithFingerprint.contractHash);
      expect(result.selectorPolicy).toEqual(selectorPolicy);
      expect(result.healingPolicy).toEqual(healingPolicy);
      expect(result.pageCacheBySite).toEqual({}); // No cache loaded
    });

    it("returns ok: false when contract validation fails", () => {
      const contractDir = join(testDir, ".mcp-contract");
      mkdirSync(contractDir, { recursive: true });

      // Invalid schema
      writeFileSync(join(contractDir, "repo-topology.json"), JSON.stringify({ invalid: "data" }));

      const bundle = loadContractBundle({ repoRoot: testDir, mode: "BEST_EFFORT" });
      expect(bundle.ok).toBe(true);
      if (!bundle.ok) throw new Error("Expected bundle load to succeed");

      const validation = validateContractBundle(bundle);
      const fingerprint = verifyFingerprint(bundle);
      const cache = bindCacheToContract({ repoRoot: testDir, contractHash: bundle.contractHash });

      const result = buildRuntimeStrategyContext({
        contractBundle: bundle,
        validation,
        fingerprint,
        cache,
      });

      expect(result.ok).toBe(false);
      expect(result.issues.some((i: any) => i.code === "CA_SCHEMA_INVALID")).toBe(true);
    });

    it("returns ok: true with cache warnings (cache is advisory)", () => {
      const contractDir = join(testDir, ".mcp-contract");
      mkdirSync(contractDir, { recursive: true });

      writeFileSync(join(contractDir, "repo-topology.json"), JSON.stringify({ schema_version: "0.1.0", repoRoot: testDir, contractDir: ".mcp-contract" }));
      writeFileSync(join(contractDir, "selector-policy.json"), JSON.stringify({ schema_version: "0.1.0" }));
      writeFileSync(join(contractDir, "healing-policy.json"), JSON.stringify({ schema_version: "0.1.0" }));
      writeFileSync(join(contractDir, "wrapper-discovery.json"), JSON.stringify({ schema_version: "0.1.0", wrappers: [] }));
      writeFileSync(join(contractDir, "policy-decision.json"), JSON.stringify({ schema_version: "0.1.0", decision: "reject" }));
      writeFileSync(join(contractDir, "meta.json"), JSON.stringify({ schema_version: "0.1.0", generated_by: { name: "test", version: "1.0.0" } }));

      // Load bundle first to get hash
      const bundle = loadContractBundle({ repoRoot: testDir, mode: "BEST_EFFORT" });
      expect(bundle.ok).toBe(true);
      if (!bundle.ok) throw new Error("Expected bundle load to succeed");

      // Add fingerprint with correct hash
      writeFileSync(join(contractDir, "fingerprint.json"), JSON.stringify({
        schema_version: "0.1.0",
        contractHash: bundle.contractHash,
        mode: "strict",
      }));

      // Reload with all 7 files in COMPLIANCE mode
      const bundleWithFingerprint = loadContractBundle({ repoRoot: testDir, mode: "COMPLIANCE" });
      expect(bundleWithFingerprint.ok).toBe(true);
      if (!bundleWithFingerprint.ok) throw new Error("Expected bundle load to succeed");

      const validation = validateContractBundle(bundleWithFingerprint);
      const fingerprint = verifyFingerprint(bundleWithFingerprint);

      // Cache missing - should warn but ok: true
      const cache = bindCacheToContract({ repoRoot: testDir, contractHash: bundleWithFingerprint.contractHash });

      const result = buildRuntimeStrategyContext({
        contractBundle: bundleWithFingerprint,
        validation,
        fingerprint,
        cache,
      });

      expect(result.ok).toBe(true); // Cache warning doesn't fail
      expect(result.issues.some((i: any) => i.code === "CA_CACHE_DIR_MISSING")).toBe(true);
      expect(result.issues.some((i: any) => i.severity === "WARN")).toBe(true);
    });

    it("accumulates all issues from contract and cache", () => {
      const contractDir = join(testDir, ".mcp-contract");
      mkdirSync(contractDir, { recursive: true });

      writeFileSync(join(contractDir, "repo-topology.json"), JSON.stringify({ invalid: "schema" }));

      const bundle = loadContractBundle({ repoRoot: testDir, mode: "BEST_EFFORT" });
      expect(bundle.ok).toBe(true);
      if (!bundle.ok) throw new Error("Expected bundle load to succeed");

      const validation = validateContractBundle(bundle);
      const fingerprint = verifyFingerprint(bundle);
      const cache = bindCacheToContract({ repoRoot: testDir, contractHash: bundle.contractHash });

      const result = buildRuntimeStrategyContext({
        contractBundle: bundle,
        validation,
        fingerprint,
        cache,
      });

      // Should have schema validation error + cache missing warning
      expect(result.issues.length).toBeGreaterThan(1);
      expect(result.issues.some((i: any) => i.code === "CA_SCHEMA_INVALID")).toBe(true);
      expect(result.issues.some((i: any) => i.code === "CA_CACHE_DIR_MISSING")).toBe(true);
    });
  });
});
