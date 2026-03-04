// mindtrace-ai-runtime/src/contract-awareness/__tests__/index.test.ts
import * as ContractAwareness from "../index";

describe("Contract Awareness Public API", () => {
  it("exports 5 main functions", () => {
    expect(typeof ContractAwareness.loadContractBundle).toBe("function");
    expect(typeof ContractAwareness.validateContractBundle).toBe("function");
    expect(typeof ContractAwareness.bindCacheToContract).toBe("function");
    expect(typeof ContractAwareness.buildRuntimeStrategyContext).toBe("function");
    expect(typeof ContractAwareness.writeContractAwarenessArtifact).toBe("function");
  });

  it("exports types", () => {
    // TypeScript will error if these types don't exist
    const _issue: ContractAwareness.ContractAwarenessIssue = {
      code: "CA_MISSING_FILE",
      category: "contract",
      severity: "ERROR",
      message: "test",
    };

    const _loadResult: ContractAwareness.LoadContractBundleResult = {
      ok: false,
      contractDir: null,
      isLegacy: false,
      contractHash: null,
      files: {},
      issues: [],
    };

    expect(_issue).toBeDefined();
    expect(_loadResult).toBeDefined();
  });
});
