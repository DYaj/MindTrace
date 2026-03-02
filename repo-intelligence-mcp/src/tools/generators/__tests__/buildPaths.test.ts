import { describe, it, expect } from "vitest";
import { buildPaths } from "../buildPaths.js";
import type { RepoTopologyJSON } from "../../../types/topology.js";

describe("buildPaths", () => {
  const mockTopology: RepoTopologyJSON = {
    toolVersion: "0.1.0",
    scannedAt: "2026-03-03T00:00:00.000Z",
    repoRoot: "/test/repo",
    files: {
      count: 10,
      paths: [
        "features/login.feature",
        "features/checkout.feature",
        "playwright.config.ts",
        "playwright.config.js",
        "cypress.config.ts",
        "tests/example.spec.ts"
      ]
    },
    directories: ["features", "tests"],
    packageManagers: {
      node: { packageJson: null, lockfiles: [] },
      python: { pyprojectToml: null, poetryLock: null, requirementsTxt: [] }
    },
    languageStats: { typescript: 100 },
    configFiles: [],
    testSurface: {
      candidateTestDirs: ["tests", "e2e"],
      candidateSupportDirs: ["support", "helpers"]
    },
    signals: [],
    warnings: []
  };

  it("creates deterministic paths structure", () => {
    const result = buildPaths({
      topology: mockTopology,
      stylesDetected: ["style1-native"]
    });

    expect(result).toHaveProperty("root", ".");
    expect(result).toHaveProperty("contractDir", ".mcp-contract");
    expect(result).toHaveProperty("cacheDir", ".mcp-cache");
    expect(result).toHaveProperty("runsDir", "runs");
    expect(result).toHaveProperty("entrypoints");
    expect(result).toHaveProperty("pages");
    expect(result).toHaveProperty("steps");
    expect(result).toHaveProperty("wrappers");
    expect(result).toHaveProperty("configs");
  });

  it("builds style1-native entrypoints from detected test dirs", () => {
    const result = buildPaths({
      topology: mockTopology,
      stylesDetected: ["style1-native"]
    });

    const entrypoints = result.entrypoints as Record<string, string[]>;
    expect(entrypoints["style1-native"]).toEqual(["e2e", "tests"]);
  });

  it("builds style2-bdd entrypoints from detected feature dirs", () => {
    const result = buildPaths({
      topology: mockTopology,
      stylesDetected: ["style2-bdd"]
    });

    const entrypoints = result.entrypoints as Record<string, string[]>;
    expect(entrypoints["style2-bdd"]).toEqual(["features"]);
  });

  it("uses default paths when no features detected", () => {
    const minimalTopology: RepoTopologyJSON = {
      ...mockTopology,
      files: { count: 0, paths: [] },
      testSurface: {
        candidateTestDirs: [],
        candidateSupportDirs: []
      }
    };

    const result = buildPaths({
      topology: minimalTopology,
      framework: "playwright",
      stylesDetected: ["style2-bdd"]
    });

    const entrypoints = result.entrypoints as Record<string, string[]>;
    expect(entrypoints["style2-bdd"]).toEqual(["features"]);
  });

  it("detects playwright config files", () => {
    const result = buildPaths({
      topology: mockTopology,
      stylesDetected: ["style1-native"]
    });

    const configs = result.configs as Record<string, string[]>;
    expect(configs.playwright).toEqual([
      "playwright.config.js",
      "playwright.config.ts"
    ]);
  });

  it("detects cypress config files", () => {
    const result = buildPaths({
      topology: mockTopology,
      framework: "cypress",
      stylesDetected: ["style1-native"]
    });

    const configs = result.configs as Record<string, string[]>;
    expect(configs.cypress).toEqual(["cypress.config.ts"]);
  });

  it("normalizes paths to POSIX format", () => {
    const windowsTopology: RepoTopologyJSON = {
      ...mockTopology,
      files: {
        count: 2,
        paths: ["features\\login.feature", "tests\\example.spec.ts"]
      }
    };

    const result = buildPaths({
      topology: windowsTopology,
      framework: "playwright",
      stylesDetected: ["style2-bdd"]
    });

    const entrypoints = result.entrypoints as Record<string, string[]>;
    expect(entrypoints["style2-bdd"]).toEqual(["features"]);
  });

  it("deduplicates and sorts paths", () => {
    const duplicateTopology: RepoTopologyJSON = {
      ...mockTopology,
      testSurface: {
        candidateTestDirs: ["tests", "e2e", "tests", "e2e"],
        candidateSupportDirs: []
      }
    };

    const result = buildPaths({
      topology: duplicateTopology,
      framework: "playwright",
      stylesDetected: ["style1-native"]
    });

    const entrypoints = result.entrypoints as Record<string, string[]>;
    expect(entrypoints["style1-native"]).toEqual(["e2e", "tests"]);
  });

  it("handles multiple styles", () => {
    const result = buildPaths({
      topology: mockTopology,
      stylesDetected: ["style1-native", "style2-bdd"]
    });

    const entrypoints = result.entrypoints as Record<string, string[]>;
    expect(entrypoints["style1-native"]).toEqual(["e2e", "tests"]);
    expect(entrypoints["style2-bdd"]).toEqual(["features"]);
  });

  it("uses detected support dirs for wrappers", () => {
    const result = buildPaths({
      topology: mockTopology,
      stylesDetected: ["style1-native"]
    });

    const wrappers = result.wrappers as string[];
    expect(wrappers).toEqual(["helpers", "support"]);
  });

  it("uses default paths when no support dirs detected", () => {
    const minimalTopology: RepoTopologyJSON = {
      ...mockTopology,
      testSurface: {
        candidateTestDirs: [],
        candidateSupportDirs: []
      }
    };

    const result = buildPaths({
      topology: minimalTopology,
      framework: "playwright",
      stylesDetected: ["style1-native"]
    });

    const wrappers = result.wrappers as string[];
    expect(wrappers).toEqual(["src/support", "src/utils", "support", "utils"]);
  });
});
