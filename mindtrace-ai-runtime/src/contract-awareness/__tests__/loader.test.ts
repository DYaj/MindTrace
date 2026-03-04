// mindtrace-ai-runtime/src/contract-awareness/__tests__/loader.test.ts
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs";
import { join } from "path";
import { resolveContractDir, loadContractBundle } from "../loader";
import { tmpdir } from "os";

describe("Contract Loader", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `test-contract-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe("resolveContractDir", () => {
    it("finds canonical path first (.mcp-contract/)", () => {
      const canonicalDir = join(testDir, ".mcp-contract");
      mkdirSync(canonicalDir, { recursive: true });

      const result = resolveContractDir(testDir);
      expect(result.contractDir).toBe(canonicalDir);
      expect(result.isLegacy).toBe(false);
      expect(result.issues).toHaveLength(0);
    });

    it("falls back to legacy path (.mindtrace/contracts/)", () => {
      const legacyDir = join(testDir, ".mindtrace/contracts");
      mkdirSync(legacyDir, { recursive: true });

      const result = resolveContractDir(testDir);
      expect(result.contractDir).toBe(legacyDir);
      expect(result.isLegacy).toBe(true);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].code).toBe("CA_LEGACY_PATH");
    });

    it("prefers canonical over legacy when both exist", () => {
      const canonicalDir = join(testDir, ".mcp-contract");
      const legacyDir = join(testDir, ".mindtrace/contracts");
      mkdirSync(canonicalDir, { recursive: true });
      mkdirSync(legacyDir, { recursive: true });

      const result = resolveContractDir(testDir);
      expect(result.contractDir).toBe(canonicalDir);
      expect(result.isLegacy).toBe(false);
    });

    it("returns null when neither path exists", () => {
      const result = resolveContractDir(testDir);
      expect(result.contractDir).toBeNull();
      expect(result.isLegacy).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].code).toBe("CA_CONTRACT_DIR_MISSING");
    });
  });

  describe("loadContractBundle", () => {
    it("loads all contract files successfully", () => {
      const contractDir = join(testDir, ".mcp-contract");
      mkdirSync(contractDir, { recursive: true });

      // Create all 7 required files for COMPLIANCE mode
      writeFileSync(join(contractDir, "repo-topology.json"), JSON.stringify({ schema_version: "0.1.0" }));
      writeFileSync(join(contractDir, "selector-policy.json"), JSON.stringify({ strategy: "stable-first" }));
      writeFileSync(join(contractDir, "healing-policy.json"), JSON.stringify({ enabled: true }));
      writeFileSync(join(contractDir, "wrapper-discovery.json"), JSON.stringify({ wrappers: [] }));
      writeFileSync(join(contractDir, "policy-decision.json"), JSON.stringify({ decisions: [] }));
      writeFileSync(join(contractDir, "meta.json"), JSON.stringify({ version: "1.0" }));
      writeFileSync(join(contractDir, "fingerprint.json"), JSON.stringify({ hash: "abc123" }));

      const result = loadContractBundle({ repoRoot: testDir, mode: "COMPLIANCE" });
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("Expected ok result");
      expect(result.contractDir).toBe(contractDir);
      expect(result.files["repo-topology.json"]).toEqual({ schema_version: "0.1.0" });
      expect(result.contractHash).toMatch(/^[a-f0-9]{64}$/);
    });

    it("returns error when contract dir missing", () => {
      const result = loadContractBundle({ repoRoot: testDir, mode: "COMPLIANCE" });
      expect(result.ok).toBe(false);
      if (result.ok) throw new Error("Expected error result");
      expect(result.contractDir).toBeNull();
      expect(result.issues[0].code).toBe("CA_CONTRACT_DIR_MISSING");
    });

    it("detects legacy path and adds warning", () => {
      const legacyDir = join(testDir, ".mindtrace/contracts");
      mkdirSync(legacyDir, { recursive: true });

      // Create all 7 required files for COMPLIANCE mode
      writeFileSync(join(legacyDir, "repo-topology.json"), JSON.stringify({ schema_version: "0.1.0" }));
      writeFileSync(join(legacyDir, "selector-policy.json"), JSON.stringify({ strategy: "stable-first" }));
      writeFileSync(join(legacyDir, "healing-policy.json"), JSON.stringify({ enabled: true }));
      writeFileSync(join(legacyDir, "wrapper-discovery.json"), JSON.stringify({ wrappers: [] }));
      writeFileSync(join(legacyDir, "policy-decision.json"), JSON.stringify({ decisions: [] }));
      writeFileSync(join(legacyDir, "meta.json"), JSON.stringify({ version: "1.0" }));
      writeFileSync(join(legacyDir, "fingerprint.json"), JSON.stringify({ hash: "abc123" }));

      const result = loadContractBundle({ repoRoot: testDir, mode: "COMPLIANCE" });
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("Expected ok result");
      expect(result.isLegacy).toBe(true);
      expect(result.issues.some((i) => i.code === "CA_LEGACY_PATH")).toBe(true);
    });

    it("handles JSON parse errors", () => {
      const contractDir = join(testDir, ".mcp-contract");
      mkdirSync(contractDir, { recursive: true });
      writeFileSync(join(contractDir, "repo-topology.json"), "{ invalid json }");

      const result = loadContractBundle({ repoRoot: testDir, mode: "COMPLIANCE" });
      expect(result.ok).toBe(false);
      if (result.ok) throw new Error("Expected error result");
      expect(result.issues.some((i) => i.code === "CA_JSON_PARSE_ERROR")).toBe(true);
    });

    it("computes deterministic hash", () => {
      const contractDir = join(testDir, ".mcp-contract");
      mkdirSync(contractDir, { recursive: true });

      // Create all 7 required files for COMPLIANCE mode
      writeFileSync(join(contractDir, "repo-topology.json"), JSON.stringify({ schema_version: "0.1.0" }));
      writeFileSync(join(contractDir, "selector-policy.json"), JSON.stringify({ strategy: "stable-first" }));
      writeFileSync(join(contractDir, "healing-policy.json"), JSON.stringify({ enabled: true }));
      writeFileSync(join(contractDir, "wrapper-discovery.json"), JSON.stringify({ wrappers: [] }));
      writeFileSync(join(contractDir, "policy-decision.json"), JSON.stringify({ decisions: [] }));
      writeFileSync(join(contractDir, "meta.json"), JSON.stringify({ version: "1.0" }));
      writeFileSync(join(contractDir, "fingerprint.json"), JSON.stringify({ hash: "abc123" }));

      const result1 = loadContractBundle({ repoRoot: testDir, mode: "COMPLIANCE" });
      const result2 = loadContractBundle({ repoRoot: testDir, mode: "COMPLIANCE" });

      expect(result1.ok && result2.ok).toBe(true);
      if (!result1.ok || !result2.ok) throw new Error("Expected ok results");
      expect(result1.contractHash).toBe(result2.contractHash);
    });

    it("fails in COMPLIANCE mode when required files missing", () => {
      const contractDir = join(testDir, ".mcp-contract");
      mkdirSync(contractDir, { recursive: true });
      writeFileSync(join(contractDir, "repo-topology.json"), JSON.stringify({ schema_version: "0.1.0" }));

      const result = loadContractBundle({ repoRoot: testDir, mode: "COMPLIANCE" });
      expect(result.ok).toBe(false);
      if (result.ok) throw new Error("Expected error result");
      expect(result.issues.some((i) => i.code === "CA_MISSING_FILE")).toBe(true);
    });

    it("succeeds in BEST_EFFORT mode with partial files", () => {
      const contractDir = join(testDir, ".mcp-contract");
      mkdirSync(contractDir, { recursive: true });
      writeFileSync(join(contractDir, "repo-topology.json"), JSON.stringify({ schema_version: "0.1.0" }));

      const result = loadContractBundle({ repoRoot: testDir, mode: "BEST_EFFORT" });
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("Expected ok result");
      expect(result.files["repo-topology.json"]).toEqual({ schema_version: "0.1.0" });
    });
  });
});
