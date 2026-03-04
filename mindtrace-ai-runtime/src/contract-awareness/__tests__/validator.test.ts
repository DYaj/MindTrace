// mindtrace-ai-runtime/src/contract-awareness/__tests__/validator.test.ts
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { validateContractBundle, verifyFingerprint } from "../validator";
import { loadContractBundle } from "../loader";

describe("Contract Validator", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `test-validator-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe("validateContractBundle", () => {
    it("validates all contract files with AJV schemas", () => {
      // Create valid contract files
      const contractDir = join(testDir, ".mcp-contract");
      mkdirSync(contractDir, { recursive: true });

      const validFiles = {
        "repo-topology.json": { schema_version: "0.1.0", repoRoot: "/test", contractDir: ".mcp-contract" },
        "selector-policy.json": { schema_version: "0.1.0", strategy: "stable-first" },
        "healing-policy.json": { schema_version: "0.1.0", mode: "deterministic" },
        "wrapper-discovery.json": { schema_version: "0.1.0", wrappers: [] },
        "policy-decision.json": { schema_version: "0.1.0", decision: "reject" },
        "meta.json": { schema_version: "0.1.0", generated_by: { name: "test", version: "1.0.0" } },
        "fingerprint.json": { schema_version: "0.1.0", contractHash: "abc123", mode: "strict" },
      };

      for (const [filename, content] of Object.entries(validFiles)) {
        writeFileSync(join(contractDir, filename), JSON.stringify(content));
      }

      const bundle = loadContractBundle({ repoRoot: testDir, mode: "COMPLIANCE" });
      expect(bundle.ok).toBe(true);
      if (!bundle.ok) throw new Error("Expected bundle load to succeed");

      const result = validateContractBundle(bundle);
      expect(result.ok).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it("detects schema validation errors", () => {
      const contractDir = join(testDir, ".mcp-contract");
      mkdirSync(contractDir, { recursive: true });

      // Invalid: missing required field
      writeFileSync(join(contractDir, "repo-topology.json"), JSON.stringify({ invalid: "data" }));

      const bundle = loadContractBundle({ repoRoot: testDir, mode: "BEST_EFFORT" });
      expect(bundle.ok).toBe(true);
      if (!bundle.ok) throw new Error("Expected bundle load to succeed");

      const result = validateContractBundle(bundle);
      expect(result.ok).toBe(false);
      expect(result.issues.some(i => i.code === "CA_SCHEMA_INVALID")).toBe(true);
    });

    it("succeeds with no files in BEST_EFFORT mode", () => {
      const contractDir = join(testDir, ".mcp-contract");
      mkdirSync(contractDir, { recursive: true });

      const bundle = loadContractBundle({ repoRoot: testDir, mode: "BEST_EFFORT" });
      expect(bundle.ok).toBe(true);
      if (!bundle.ok) throw new Error("Expected bundle load to succeed");

      const result = validateContractBundle(bundle);
      expect(result.ok).toBe(true);
    });
  });

  describe("verifyFingerprint", () => {
    it("verifies fingerprint hash matches stored hash", () => {
      const contractDir = join(testDir, ".mcp-contract");
      mkdirSync(contractDir, { recursive: true });

      // Create contract files
      const files = {
        "repo-topology.json": { schema_version: "0.1.0" },
        "selector-policy.json": { schema_version: "0.1.0" },
      };

      for (const [filename, content] of Object.entries(files)) {
        writeFileSync(join(contractDir, filename), JSON.stringify(content));
      }

      const bundle = loadContractBundle({ repoRoot: testDir, mode: "BEST_EFFORT" });
      expect(bundle.ok).toBe(true);
      if (!bundle.ok) throw new Error("Expected bundle load to succeed");

      // Write fingerprint with correct hash
      const fingerprintContent = {
        schema_version: "0.1.0",
        contractHash: bundle.contractHash,
        mode: "strict",
      };
      writeFileSync(join(contractDir, "fingerprint.json"), JSON.stringify(fingerprintContent));

      // Reload bundle with fingerprint
      const bundleWithFingerprint = loadContractBundle({ repoRoot: testDir, mode: "BEST_EFFORT" });
      expect(bundleWithFingerprint.ok).toBe(true);
      if (!bundleWithFingerprint.ok) throw new Error("Expected bundle load to succeed");

      const result = verifyFingerprint(bundleWithFingerprint);
      expect(result.ok).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it("detects fingerprint hash mismatch", () => {
      const contractDir = join(testDir, ".mcp-contract");
      mkdirSync(contractDir, { recursive: true });

      writeFileSync(join(contractDir, "repo-topology.json"), JSON.stringify({ schema_version: "0.1.0" }));
      writeFileSync(join(contractDir, "fingerprint.json"), JSON.stringify({
        schema_version: "0.1.0",
        contractHash: "wrong_hash",
        mode: "strict",
      }));

      const bundle = loadContractBundle({ repoRoot: testDir, mode: "BEST_EFFORT" });
      expect(bundle.ok).toBe(true);
      if (!bundle.ok) throw new Error("Expected bundle load to succeed");

      const result = verifyFingerprint(bundle);
      expect(result.ok).toBe(false);
      expect(result.issues.some(i => i.code === "CA_HASH_MISMATCH")).toBe(true);
    });

    it("succeeds when fingerprint.json is missing", () => {
      const contractDir = join(testDir, ".mcp-contract");
      mkdirSync(contractDir, { recursive: true });
      writeFileSync(join(contractDir, "repo-topology.json"), JSON.stringify({ schema_version: "0.1.0" }));

      const bundle = loadContractBundle({ repoRoot: testDir, mode: "BEST_EFFORT" });
      expect(bundle.ok).toBe(true);
      if (!bundle.ok) throw new Error("Expected bundle load to succeed");

      const result = verifyFingerprint(bundle);
      expect(result.ok).toBe(true);
      expect(result.issues).toHaveLength(0);
    });
  });
});
