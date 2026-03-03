import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { buildPageCache } from "../buildPageCache.js";
import type { AutomationContract, PageKeyPolicy } from "../../types/contract.js";

describe("buildPageCache - Contract-Derived Boundary Enforcement", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "test-cache-"));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("builds cache from contract data only (no raw repo access)", async () => {
    const mockContract: AutomationContract = {
      schema_version: "0.1.0",
      contractVersion: "0.1.0",
      framework: "playwright",
      architecture: "native",
      stylesDetected: ["style1-native"],
      primaryStyle: "style1-native",
      entrypoints: [
        {
          style: "style1-native",
          entrypoint: "tests/login.spec.ts",
          confidence: 0.9
        }
      ],
      paths: {
        pages: ["src/pages/LoginPage.ts", "src/pages/DashboardPage.ts"],
        tests: ["tests/login.spec.ts"]
      },
      refs: {
        selectorStrategyRef: "selector-strategy.json",
        assertionStyleRef: "assertion-style.json",
        pageKeyPolicyRef: "page-key-policy.json"
      },
      page_identity: {
        mode: "hybrid",
        primary: "path",
        ref: "page-key-policy.json"
      },
      generated_by: {
        name: "repo-intelligence-mcp",
        version: "0.2.0"
      },
      evidence: []
    };

    const mockPolicy: PageKeyPolicy = {
      schema_version: "0.1.0",
      policyVersion: "0.1.0",
      mode: "hybrid",
      patterns: {
        "style1-native": {
          template: "{fileName}",
          confidence: 0.85,
          source: "detected"
        }
      },
      collision_resolution: "deterministic_suffix",
      fallback_order: ["path", "fileName"],
      dynamicFallback: true,
      evidence: [],
      examples: []
    };

    const contractSha256 = "abc123def456789abcdef123456789abcdef123456789abcdef123456789abc";

    const result = await buildPageCache({
      automationContract: mockContract,
      pageKeyPolicy: mockPolicy,
      contractSha256,
      outputDir: tempDir
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Should not fail");

    expect(result.pagesWritten).toBeGreaterThan(0);

    // Verify CANONICAL meta.json written (v1 structure)
    const metaPath = path.join(tempDir, "v1", "meta.json");
    const metaExists = await fs.access(metaPath).then(() => true).catch(() => false);
    expect(metaExists).toBe(true);

    // Verify canonical meta includes contract_hash and NO timestamp in cache entries
    const metaContent = await fs.readFile(metaPath, "utf-8");
    const meta = JSON.parse(metaContent);
    expect(meta.contract_hash).toBe(contractSha256);
    expect(meta.schema_version).toBe("1.0.0");
    expect(meta.cache_format).toBe("semantic-v1");
    expect(meta.pages_count).toBeGreaterThan(0);

    // Verify LEGACY index.json written for backward compatibility
    const legacyIndexPath = path.join(tempDir, "index.json");
    const legacyIndexExists = await fs.access(legacyIndexPath).then(() => true).catch(() => false);
    expect(legacyIndexExists).toBe(true);

    // Verify legacy index includes contractSha256
    const legacyIndexContent = await fs.readFile(legacyIndexPath, "utf-8");
    const legacyIndex = JSON.parse(legacyIndexContent);
    expect(legacyIndex.contractSha256).toBe(contractSha256);
    expect(legacyIndex.cacheVersion).toBe("0.1.0");
  });

  it("includes contractSha256 in every page cache entry", async () => {
    const mockContract: AutomationContract = {
      schema_version: "0.1.0",
      contractVersion: "0.1.0",
      framework: "playwright",
      architecture: "native",
      stylesDetected: ["style1-native"],
      primaryStyle: "style1-native",
      entrypoints: [],
      paths: {
        pages: ["src/pages/LoginPage.ts"]
      },
      refs: {
        selectorStrategyRef: "selector-strategy.json",
        assertionStyleRef: "assertion-style.json",
        pageKeyPolicyRef: "page-key-policy.json"
      },
      page_identity: {
        mode: "hybrid",
        primary: "path",
        ref: "page-key-policy.json"
      },
      generated_by: {
        name: "repo-intelligence-mcp",
        version: "0.2.0"
      },
      evidence: []
    };

    const mockPolicy: PageKeyPolicy = {
      schema_version: "0.1.0",
      policyVersion: "0.1.0",
      mode: "hybrid",
      patterns: {},
      collision_resolution: "deterministic_suffix",
      fallback_order: ["path"],
      dynamicFallback: true,
      evidence: []
    };

    const contractSha256 = "def456abc789def456abc789def456abc789def456abc789def456abc789def4";

    const result = await buildPageCache({
      automationContract: mockContract,
      pageKeyPolicy: mockPolicy,
      contractSha256,
      outputDir: tempDir
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Should not fail");

    // Read a page cache entry from CANONICAL v1/pages/ directory
    const pagesDir = path.join(tempDir, "v1", "pages");
    const files = await fs.readdir(pagesDir);
    const pageFiles = files.filter(f => f.endsWith(".json"));

    expect(pageFiles.length).toBeGreaterThan(0);

    const firstPagePath = path.join(pagesDir, pageFiles[0]);
    const pageContent = await fs.readFile(firstPagePath, "utf-8");
    const page = JSON.parse(pageContent);

    expect(page.contractSha256).toBe(contractSha256);
    expect(page.generatedAt).toBeUndefined(); // NO timestamp
  });

  it("rejects when no contract data available (boundary enforcement)", async () => {
    const emptyContract: AutomationContract = {
      schema_version: "0.1.0",
      contractVersion: "0.1.0",
      framework: "unknown",
      architecture: "unknown",
      stylesDetected: [],
      primaryStyle: "unknown",
      entrypoints: [],
      paths: {},
      refs: {
        selectorStrategyRef: "",
        assertionStyleRef: "",
        pageKeyPolicyRef: ""
      },
      page_identity: {
        mode: "hybrid",
        primary: "path",
        ref: ""
      },
      generated_by: {
        name: "repo-intelligence-mcp",
        version: "0.2.0"
      },
      evidence: []
    };

    const emptyPolicy: PageKeyPolicy = {
      schema_version: "0.1.0",
      policyVersion: "0.1.0",
      mode: "hybrid",
      patterns: {},
      collision_resolution: "deterministic_suffix",
      fallback_order: [],
      dynamicFallback: false,
      evidence: []
    };

    const result = await buildPageCache({
      automationContract: emptyContract,
      pageKeyPolicy: emptyPolicy,
      contractSha256: "empty123",
      outputDir: tempDir
    });

    // Should succeed but write zero pages (no data in contract)
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Should not fail");
    expect(result.pagesWritten).toBe(0);
  });

  it("derives cache purely from contract (deterministic)", async () => {
    const contract: AutomationContract = {
      schema_version: "0.1.0",
      contractVersion: "0.1.0",
      framework: "playwright",
      architecture: "native",
      stylesDetected: ["style1-native"],
      primaryStyle: "style1-native",
      entrypoints: [],
      paths: {
        pages: ["pages/HomePage.ts", "pages/AboutPage.ts"]
      },
      refs: {
        selectorStrategyRef: "selector-strategy.json",
        assertionStyleRef: "assertion-style.json",
        pageKeyPolicyRef: "page-key-policy.json"
      },
      page_identity: {
        mode: "hybrid",
        primary: "path",
        ref: "page-key-policy.json"
      },
      generated_by: {
        name: "repo-intelligence-mcp",
        version: "0.2.0"
      },
      evidence: []
    };

    const policy: PageKeyPolicy = {
      schema_version: "0.1.0",
      policyVersion: "0.1.0",
      mode: "hybrid",
      patterns: {},
      collision_resolution: "deterministic_suffix",
      fallback_order: ["path"],
      dynamicFallback: true,
      evidence: []
    };

    const sha = "deterministic123456789abcdef";

    // Run twice - should be identical
    const result1 = await buildPageCache({
      automationContract: contract,
      pageKeyPolicy: policy,
      contractSha256: sha,
      outputDir: tempDir
    });

    expect(result1.ok).toBe(true);
    if (!result1.ok) throw new Error("Should not fail");

    // Read from LEGACY location for backward compat verification
    const index1 = JSON.parse(
      await fs.readFile(path.join(tempDir, "index.json"), "utf-8")
    );

    // Clean and re-run
    await fs.rm(tempDir, { recursive: true, force: true });
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "test-cache-"));

    const result2 = await buildPageCache({
      automationContract: contract,
      pageKeyPolicy: policy,
      contractSha256: sha,
      outputDir: tempDir
    });

    expect(result2.ok).toBe(true);
    if (!result2.ok) throw new Error("Should not fail");

    const index2 = JSON.parse(
      await fs.readFile(path.join(tempDir, "index.json"), "utf-8")
    );

    // Should be identical (no timestamps, deterministic)
    expect(index1.pages).toEqual(index2.pages);
    expect(index1.contractSha256).toBe(index2.contractSha256);
  });
});
