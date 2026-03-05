// mindtrace-ai-runtime/src/healing-engine/__tests__/types.test.ts
import type {
  FailureCategory,
  FailureClass,
  Candidate,
  TierResult,
  HealResult,
  AttemptRecord
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

  it("defines TierResult with success status", () => {
    const tierResult: TierResult = {
      status: "success",
      attempts: [],
      selectedCandidate: {
        candidateId: "test_id",
        tier: "contract",
        locatorType: "testid",
        selector: "[data-testid='btn']",
        riskScore: 0.05,
        evidence: {}
      }
    };
    expect(tierResult.status).toBe("success");
    expect(tierResult.selectedCandidate).toBeDefined();
  });

  it("defines TierResult with skipped status and reason", () => {
    const tierResult: TierResult = {
      status: "skipped",
      reason: "NO_PAGEKEY",
      attempts: []
    };
    expect(tierResult.status).toBe("skipped");
    expect(tierResult.reason).toBe("NO_PAGEKEY");
  });

  it("defines HealResult with healed outcome", () => {
    const healResult: HealResult = {
      outcome: "healed",
      outcomeReason: "HEAL_SUCCESS",
      usedTier: "contract",
      selectedCandidate: {
        candidateId: "test_id",
        tier: "contract",
        locatorType: "testid",
        selector: "[data-testid='btn']",
        riskScore: 0.05,
        evidence: {}
      },
      attempts: [],
      totalAttempts: 1,
      attemptGroupId: "group_123"
    };
    expect(healResult.outcome).toBe("healed");
    expect(healResult.usedTier).toBe("contract");
  });

  it("defines AttemptRecord with required fields", () => {
    const attempt: AttemptRecord = {
      schema_version: "1.0.0",
      writerVersion: "3.0.0",
      attemptId: "attempt_1",
      attemptGroupId: "group_1",
      stepScopeId: "scope_1",
      runId: "run_1",
      stepId: "step_1",
      tier: "contract",
      candidateId: "candidate_1",
      probeMethodId: "ATTACHED_VISIBLE_ENABLED",
      probeTimeoutMs: 500,
      result: "success",
      failureFingerprint: "abc123",
      policyAllowed: true,
      budgetRemaining: { step: 1, run: 9 },
      candidate: {
        candidateId: "candidate_1",
        tier: "contract",
        locatorType: "testid",
        selector: "[data-testid='btn']",
        riskScore: 0.05,
        evidence: {}
      }
    };
    expect(attempt.schema_version).toBe("1.0.0");
    expect(attempt.result).toBe("success");
  });
});
