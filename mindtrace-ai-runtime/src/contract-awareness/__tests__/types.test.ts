// mindtrace-ai-runtime/src/contract-awareness/__tests__/types.test.ts
import type {
  ContractAwarenessIssue,
  ContractAwarenessErrorCode,
  LoadContractBundleResult,
  ContractValidationResult
} from "../types";

describe("Types", () => {
  it("defines issue structure with required fields", () => {
    const issue: ContractAwarenessIssue = {
      code: "CA_MISSING_FILE",
      category: "contract",
      severity: "ERROR",
      message: "Test message"
    };
    expect(issue.code).toBe("CA_MISSING_FILE");
  });

  it("defines load result with ok/error union", () => {
    const success: LoadContractBundleResult = {
      ok: true,
      contractDir: "/test/.mcp-contract",
      isLegacy: false,
      contractHash: "abc123",
      files: {},
      issues: []
    };
    expect(success.ok).toBe(true);
  });

  it("defines validation result structure", () => {
    const result: ContractValidationResult = {
      ok: true,
      issues: []
    };
    expect(result.ok).toBe(true);
  });
});
