import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { generateContractBundle } from "../generateContractBundle.js";
import { resolveContractDir } from "../../core/paths.js";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";

describe("generateContractBundle", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "contract-bundle-test-"));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("generates a complete contract bundle with all required files", async () => {
    const result = await generateContractBundle({ repoRoot: tempDir });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Should not fail");

    expect(result.hash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.filesWritten).toEqual([
      "automation-contract.json",
      "contract.fingerprint.sha256",
      "contract.meta.json",
      "page-key-policy.json"
    ]);

    // Verify all reported files exist
    const { dir: contractDir } = resolveContractDir(tempDir);
    for (const file of result.filesWritten) {
      const filePath = path.join(contractDir, file);
      const exists = await fs.access(filePath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    }
  });

  it("validates the generated bundle", async () => {
    const result = await generateContractBundle({ repoRoot: tempDir });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Should not fail");

    // The bundle should pass validation
    const { dir: contractDir } = resolveContractDir(tempDir);
    const { validateContractBundle } = await import("../../contracts/validateContractBundle.js");
    const validation = await validateContractBundle(contractDir);

    expect(validation.valid).toBe(true);
    expect(validation.errors).toEqual([]);
  });

  it("returns error when write fails", async () => {
    const invalidPath = "/invalid/path/that/does/not/exist";
    const result = await generateContractBundle({ repoRoot: invalidPath });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Should fail");
    expect(result.error).toBeTruthy();
  });
});
