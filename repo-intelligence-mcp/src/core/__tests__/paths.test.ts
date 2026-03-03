import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import * as crypto from "node:crypto";
import { resolveContractDir } from "../paths.js";

describe("resolveContractDir", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `test-paths-${crypto.randomUUID()}`);
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("returns canonical .mcp-contract path when it exists", async () => {
    const canonical = path.join(tempDir, ".mcp-contract");
    await fs.mkdir(canonical, { recursive: true });

    const result = resolveContractDir(tempDir);
    expect(result.dir).toBe(canonical);
    expect(result.isLegacy).toBe(false);
  });

  it("falls back to legacy .mindtrace/contracts when canonical doesn't exist", async () => {
    const legacy = path.join(tempDir, ".mindtrace/contracts");
    await fs.mkdir(legacy, { recursive: true });

    const result = resolveContractDir(tempDir);
    expect(result.dir).toBe(legacy);
    expect(result.isLegacy).toBe(true);
  });

  it("prefers canonical over legacy when both exist", async () => {
    const canonical = path.join(tempDir, ".mcp-contract");
    const legacy = path.join(tempDir, ".mindtrace/contracts");
    await fs.mkdir(canonical, { recursive: true });
    await fs.mkdir(legacy, { recursive: true });

    const result = resolveContractDir(tempDir);
    expect(result.dir).toBe(canonical);
    expect(result.isLegacy).toBe(false);
  });

  it("returns canonical path when neither exists", async () => {
    const result = resolveContractDir(tempDir);
    expect(result.dir).toBe(path.join(tempDir, ".mcp-contract"));
    expect(result.isLegacy).toBe(false);
  });
});
