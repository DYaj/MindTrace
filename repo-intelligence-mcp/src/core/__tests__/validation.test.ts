import { describe, it, expect } from "vitest";
import { validateAgainstSchema } from "../validation.js";

describe("validateAgainstSchema", () => {
  it("validates valid automation-contract.json", () => {
    const valid = {
      schema_version: "0.1.0",
      contractVersion: "0.1.0",
      framework: "playwright",
      stylesDetected: ["style1-native"],
      primaryStyle: "style1-native",
      architecture: "native",
      entrypoints: [],
      paths: {},
      refs: {
        selectorStrategyRef: "./selector-strategy.json",
        assertionStyleRef: "./assertion-style.json",
        pageKeyPolicyRef: "./page-key-policy.json"
      },
      page_identity: {
        mode: "hybrid",
        primary: "style1-native",
        ref: "./page-key-policy.json"
      },
      generated_by: {
        name: "repo-intelligence-mcp",
        version: "0.1.0"
      },
      evidence: []
    };

    const result = validateAgainstSchema("automation-contract.json", valid);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("rejects automation-contract.json with missing required field", () => {
    const invalid = {
      schema_version: "0.1.0",
      framework: "playwright"
      // missing many required fields
    };

    const result = validateAgainstSchema("automation-contract.json", invalid);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("rejects automation-contract.json with invalid primaryStyle pattern", () => {
    const invalid = {
      schema_version: "0.1.0",
      contractVersion: "0.1.0",
      framework: "playwright",
      stylesDetected: [],
      primaryStyle: "invalid-pattern", // doesn't match regex
      architecture: "native",
      entrypoints: [],
      paths: {},
      refs: {
        selectorStrategyRef: "./selector-strategy.json",
        assertionStyleRef: "./assertion-style.json",
        pageKeyPolicyRef: "./page-key-policy.json"
      },
      page_identity: {
        mode: "hybrid",
        primary: "invalid",
        ref: "./page-key-policy.json"
      },
      generated_by: {
        name: "repo-intelligence-mcp",
        version: "0.1.0"
      },
      evidence: []
    };

    const result = validateAgainstSchema("automation-contract.json", invalid);
    expect(result.valid).toBe(false);
  });
});
