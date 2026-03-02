import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { computeContractFingerprint, writeFingerprintAtomic, FINGERPRINT_FILES } from "../fingerprintContract.js";
import { mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from "fs";
import path from "path";
import { tmpdir } from "os";
import crypto from "crypto";

describe("computeContractFingerprint", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = path.join(tmpdir(), `test-contract-${crypto.randomUUID()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("computes fingerprint in strict mode when all files exist", () => {
    // Write all required files
    for (const file of FINGERPRINT_FILES) {
      writeFileSync(path.join(testDir, file), JSON.stringify({ test: "data" }), "utf-8");
    }

    const result = computeContractFingerprint(testDir, "strict");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.fingerprint).toMatch(/^[a-f0-9]{64}$/);
      expect(result.files).toEqual([...FINGERPRINT_FILES].sort());
    }
  });

  it("fails in strict mode when files missing", () => {
    // Write only some files
    writeFileSync(path.join(testDir, "repo-topology.json"), "{}", "utf-8");

    const result = computeContractFingerprint(testDir, "strict");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Missing required files");
    }
  });

  it("succeeds in best_effort mode with partial files", () => {
    writeFileSync(path.join(testDir, "repo-topology.json"), "{}", "utf-8");

    const result = computeContractFingerprint(testDir, "best_effort");
    expect(result.ok).toBe(true);
  });

  it("produces same hash for same content regardless of key order", () => {
    const data1 = { b: 2, a: 1 };
    const data2 = { a: 1, b: 2 };

    writeFileSync(path.join(testDir, "repo-topology.json"), JSON.stringify(data1), "utf-8");
    const result1 = computeContractFingerprint(testDir, "best_effort");

    writeFileSync(path.join(testDir, "repo-topology.json"), JSON.stringify(data2), "utf-8");
    const result2 = computeContractFingerprint(testDir, "best_effort");

    expect(result1.ok && result2.ok).toBe(true);
    if (result1.ok && result2.ok) {
      expect(result1.fingerprint).toBe(result2.fingerprint);
    }
  });

  it("produces different hash when content swaps between files", () => {
    writeFileSync(path.join(testDir, "repo-topology.json"), JSON.stringify({ a: 1 }), "utf-8");
    writeFileSync(path.join(testDir, "framework-pattern.json"), JSON.stringify({ b: 2 }), "utf-8");
    const result1 = computeContractFingerprint(testDir, "best_effort");

    // Swap content
    writeFileSync(path.join(testDir, "repo-topology.json"), JSON.stringify({ b: 2 }), "utf-8");
    writeFileSync(path.join(testDir, "framework-pattern.json"), JSON.stringify({ a: 1 }), "utf-8");
    const result2 = computeContractFingerprint(testDir, "best_effort");

    expect(result1.ok && result2.ok).toBe(true);
    if (result1.ok && result2.ok) {
      expect(result1.fingerprint).not.toBe(result2.fingerprint);
    }
  });
});

describe("writeFingerprintAtomic", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = path.join(tmpdir(), `test-hash-${crypto.randomUUID()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("writes fingerprint with newline terminator", () => {
    writeFingerprintAtomic(testDir, "abc123");
    const written = readFileSync(path.join(testDir, "automation-contract.hash"), "utf-8");
    expect(written).toBe("abc123\n");
  });

  it("replaces existing hash file", () => {
    // Write initial hash
    writeFileSync(path.join(testDir, "automation-contract.hash"), "old-hash\n", "utf-8");

    // Replace with new hash
    writeFingerprintAtomic(testDir, "new-hash");

    const written = readFileSync(path.join(testDir, "automation-contract.hash"), "utf-8");
    expect(written).toBe("new-hash\n");
  });

  it("creates hash file in correct location", () => {
    writeFingerprintAtomic(testDir, "test-fingerprint");
    expect(existsSync(path.join(testDir, "automation-contract.hash"))).toBe(true);
  });
});
