// mindtrace-ai-runtime/src/contract-awareness/__tests__/cache-binding.test.ts
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { loadPageCache, bindCacheToContract } from "../cache-binding";
import { loadContractBundle } from "../loader";
import type { ContractAwarenessIssue } from "../types";

describe("Cache Binding", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `test-cache-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe("loadPageCache", () => {
    it("loads canonical cache from .mcp-cache/v1/meta.json", () => {
      const cacheDir = join(testDir, ".mcp-cache/v1");
      mkdirSync(cacheDir, { recursive: true });

      const meta = {
        cacheVersion: "0.1.0",
        contractSha256: "abc123",
        generated_by: { name: "test", version: "1.0.0" },
      };
      writeFileSync(join(cacheDir, "meta.json"), JSON.stringify(meta));

      const result = loadPageCache({ repoRoot: testDir });
      expect(result.ok).toBe(true);
      expect(result.cacheDir).toBe(cacheDir);
      expect(result.cacheHash).toBe("abc123");
      expect(result.issues).toHaveLength(0);
    });

    it("falls back to legacy cache .mcp-cache/index.json", () => {
      const legacyDir = join(testDir, ".mcp-cache");
      mkdirSync(legacyDir, { recursive: true });

      const index = {
        cacheVersion: "0.1.0",
        contractSha256: "def456",
        pages: [],
      };
      writeFileSync(join(legacyDir, "index.json"), JSON.stringify(index));

      const result = loadPageCache({ repoRoot: testDir });
      expect(result.ok).toBe(true);
      expect(result.cacheDir).toBe(legacyDir);
      expect(result.cacheHash).toBe("def456");
      expect(result.issues.some((i: ContractAwarenessIssue) => i.code === "CA_LEGACY_PATH")).toBe(true);
    });

    it("prefers canonical over legacy when both exist", () => {
      const canonicalDir = join(testDir, ".mcp-cache/v1");
      const legacyDir = join(testDir, ".mcp-cache");
      mkdirSync(canonicalDir, { recursive: true });
      mkdirSync(legacyDir, { recursive: true });

      writeFileSync(join(canonicalDir, "meta.json"), JSON.stringify({
        cacheVersion: "0.1.0",
        contractSha256: "canonical_hash",
      }));
      writeFileSync(join(legacyDir, "index.json"), JSON.stringify({
        cacheVersion: "0.1.0",
        contractSha256: "legacy_hash",
      }));

      const result = loadPageCache({ repoRoot: testDir });
      expect(result.cacheHash).toBe("canonical_hash");
    });

    it("returns warning when cache dir missing", () => {
      const result = loadPageCache({ repoRoot: testDir });
      expect(result.ok).toBe(true); // Cache is optional, so still ok
      expect(result.cacheDir).toBeNull();
      expect(result.cacheHash).toBeNull();
      expect(result.issues.some((i: ContractAwarenessIssue) => i.code === "CA_CACHE_DIR_MISSING")).toBe(true);
      expect(result.issues[0].severity).toBe("WARN"); // Cache issues are WARN
    });
  });

  describe("bindCacheToContract", () => {
    it("succeeds when cache hash matches contract hash", () => {
      // Setup contract
      const contractDir = join(testDir, ".mcp-contract");
      mkdirSync(contractDir, { recursive: true });
      writeFileSync(join(contractDir, "repo-topology.json"), JSON.stringify({ schema_version: "0.1.0" }));

      const bundle = loadContractBundle({ repoRoot: testDir, mode: "BEST_EFFORT" });
      expect(bundle.ok).toBe(true);
      if (!bundle.ok) throw new Error("Expected bundle load to succeed");

      // Setup cache with matching hash
      const cacheDir = join(testDir, ".mcp-cache/v1");
      mkdirSync(cacheDir, { recursive: true });
      writeFileSync(join(cacheDir, "meta.json"), JSON.stringify({
        cacheVersion: "0.1.0",
        contractSha256: bundle.contractHash,
      }));

      const result = bindCacheToContract({ repoRoot: testDir, contractHash: bundle.contractHash });
      expect(result.ok).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it("warns when cache hash mismatches contract hash", () => {
      const result = bindCacheToContract({ repoRoot: testDir, contractHash: "expected_hash" });

      // Since cache is missing, we get CA_CACHE_DIR_MISSING warning
      // If cache existed with wrong hash, we'd get CA_CACHE_HASH_MISMATCH
      expect(result.ok).toBe(true); // Cache mismatch is WARN, not error
      expect(result.issues.some((i: ContractAwarenessIssue) => i.severity === "WARN")).toBe(true);
    });

    it("warns with CA_CACHE_HASH_MISMATCH when hashes don't match", () => {
      const cacheDir = join(testDir, ".mcp-cache/v1");
      mkdirSync(cacheDir, { recursive: true });
      writeFileSync(join(cacheDir, "meta.json"), JSON.stringify({
        cacheVersion: "0.1.0",
        contractSha256: "wrong_hash",
      }));

      const result = bindCacheToContract({ repoRoot: testDir, contractHash: "expected_hash" });
      expect(result.ok).toBe(true); // Still ok because cache is advisory
      expect(result.issues.some((i: ContractAwarenessIssue) => i.code === "CA_CACHE_HASH_MISMATCH")).toBe(true);
      expect(result.issues.find((i: ContractAwarenessIssue) => i.code === "CA_CACHE_HASH_MISMATCH")?.severity).toBe("WARN");
    });

    it("succeeds with warning when cache is missing", () => {
      const result = bindCacheToContract({ repoRoot: testDir, contractHash: "any_hash" });
      expect(result.ok).toBe(true);
      expect(result.cacheDir).toBeNull();
      expect(result.issues.some((i: ContractAwarenessIssue) => i.code === "CA_CACHE_DIR_MISSING")).toBe(true);
    });
  });
});
