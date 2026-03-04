// mindtrace-ai-runtime/src/contract-awareness/__tests__/writer.test.ts
import { mkdirSync, rmSync, existsSync, readFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { writeContractAwarenessArtifact } from "../writer";
import type { RuntimeStrategyContext } from "../types";

describe("Contract Awareness Writer", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `test-writer-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe("writeContractAwarenessArtifact", () => {
    it("writes contract awareness artifact to artifacts directory", () => {
      const artifactsDir = join(testDir, "runs/test-run/artifacts");
      mkdirSync(artifactsDir, { recursive: true });

      const context: RuntimeStrategyContext = {
        ok: true,
        contractHash: "abc123",
        cacheHash: "def456",
        selectorPolicy: { strategy: "stable-first" },
        healingPolicy: { mode: "deterministic" },
        pageCacheBySite: {},
        issues: [],
      };

      writeContractAwarenessArtifact({ artifactsDir, context });

      const artifactPath = join(artifactsDir, "contract-awareness.json");
      expect(existsSync(artifactPath)).toBe(true);

      const content = JSON.parse(readFileSync(artifactPath, "utf-8"));
      expect(content.schema_version).toBe("0.1.0");
      expect(content.context).toEqual(context);
      expect(content.generatedAt).toBeUndefined(); // No timestamp for determinism
    });

    it("uses canonical JSON (sorted keys) for determinism", () => {
      const artifactsDir = join(testDir, "runs/test-run/artifacts");
      mkdirSync(artifactsDir, { recursive: true });

      const context: RuntimeStrategyContext = {
        ok: true,
        contractHash: "hash1",
        cacheHash: "hash2",
        selectorPolicy: { z: "last", a: "first", m: "middle" },
        healingPolicy: { b: "second", a: "first" },
        pageCacheBySite: {},
        issues: [],
      };

      writeContractAwarenessArtifact({ artifactsDir, context });

      const artifactPath = join(artifactsDir, "contract-awareness.json");
      const content = readFileSync(artifactPath, "utf-8");

      // Keys should be sorted alphabetically
      const firstSchemaVersion = content.indexOf('"schema_version"');
      const firstContext = content.indexOf('"context"');
      expect(firstContext).toBeLessThan(firstSchemaVersion); // 'c' < 's'

      // Nested keys should also be sorted
      const obj = JSON.parse(content);
      expect(Object.keys(obj.context.selectorPolicy)).toEqual(["a", "m", "z"]);
      expect(Object.keys(obj.context.healingPolicy)).toEqual(["a", "b"]);
    });

    it("is deterministic (same input → same output)", () => {
      const artifactsDir = join(testDir, "runs/test-run/artifacts");
      mkdirSync(artifactsDir, { recursive: true });

      const context: RuntimeStrategyContext = {
        ok: true,
        contractHash: "hash",
        cacheHash: null,
        selectorPolicy: { strategy: "stable-first" },
        healingPolicy: { mode: "deterministic" },
        pageCacheBySite: {},
        issues: [],
      };

      writeContractAwarenessArtifact({ artifactsDir, context });
      const content1 = readFileSync(join(artifactsDir, "contract-awareness.json"), "utf-8");

      // Write again
      writeContractAwarenessArtifact({ artifactsDir, context });
      const content2 = readFileSync(join(artifactsDir, "contract-awareness.json"), "utf-8");

      expect(content1).toBe(content2); // Byte-identical
    });

    it("creates artifacts directory if it doesn't exist", () => {
      const artifactsDir = join(testDir, "runs/new-run/artifacts");

      const context: RuntimeStrategyContext = {
        ok: true,
        contractHash: "hash",
        cacheHash: null,
        selectorPolicy: {},
        healingPolicy: {},
        pageCacheBySite: {},
        issues: [],
      };

      writeContractAwarenessArtifact({ artifactsDir, context });

      expect(existsSync(join(artifactsDir, "contract-awareness.json"))).toBe(true);
    });
  });
});
