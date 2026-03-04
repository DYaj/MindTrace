// mindtrace-ai-runtime/src/healing-engine/__tests__/types.test.ts
import type {
  FailureCategory,
  FailureClass,
  Candidate,
  TierResult,
  HealResult
} from "../types";

describe("Healing Engine Types", () => {
  it("defines FailureClass with required fields", () => {
    const failure: FailureClass = {
      category: "selectorMissing",
      healable: true,
      confidence: 1.0,
      source: "playwright_error",
      reasonCode: "PW_TIMEOUT_WAITING_FOR_SELECTOR",
      errorFingerprint: "abc123",
      classifierVersion: "1.0.0"
    };
    expect(failure.healable).toBe(true);
  });

  it("defines Candidate with evidence field", () => {
    const candidate: Candidate = {
      candidateId: "contract_testid_btn_123",
      tier: "contract",
      locatorType: "testid",
      selector: "[data-testid='btn']",
      riskScore: 0.05,
      evidence: { fromContractFile: "selector-policy.json" }
    };
    expect(candidate.tier).toBe("contract");
  });
});
