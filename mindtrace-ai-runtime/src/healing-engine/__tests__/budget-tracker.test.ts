// mindtrace-ai-runtime/src/healing-engine/__tests__/budget-tracker.test.ts
import { writeFileSync, unlinkSync, existsSync } from "fs";
import { BudgetTracker } from "../budget-tracker";
import type { AttemptRecord } from "../types";

describe("BudgetTracker", () => {
  const testLedgerPath = "test-healing-attempts.jsonl";

  beforeEach(() => {
    if (existsSync(testLedgerPath)) {
      unlinkSync(testLedgerPath);
    }
  });

  afterEach(() => {
    if (existsSync(testLedgerPath)) {
      unlinkSync(testLedgerPath);
    }
  });

  it("counts attempts from ledger (pure reduction)", () => {
    // Write test ledger
    const attempt1: Partial<AttemptRecord> = {
      stepScopeId: "step_1",
      runId: "run_1",
      attemptId: "attempt_1"
    };
    const attempt2: Partial<AttemptRecord> = {
      stepScopeId: "step_1",
      runId: "run_1",
      attemptId: "attempt_2"
    };

    writeFileSync(testLedgerPath, JSON.stringify(attempt1) + "\n" + JSON.stringify(attempt2) + "\n");

    const tracker = new BudgetTracker(testLedgerPath, {
      maxAttemptsPerStep: 2,
      maxAttemptsPerRun: 10,
      perCandidateProbeTimeoutMs: 500
    });

    const stepCount = tracker.countAttempts({ stepScopeId: "step_1" });
    const runCount = tracker.countAttempts({ runId: "run_1" });

    expect(stepCount).toBe(2);
    expect(runCount).toBe(2);
  });

  it("allows healing when under budget", () => {
    writeFileSync(testLedgerPath, ""); // empty ledger

    const tracker = new BudgetTracker(testLedgerPath, {
      maxAttemptsPerStep: 2,
      maxAttemptsPerRun: 10,
      perCandidateProbeTimeoutMs: 500
    });

    const allowed = tracker.isUnderBudget("step_1", "run_1");
    expect(allowed).toBe(true);
  });

  it("blocks healing when step budget exhausted", () => {
    const attempt1: Partial<AttemptRecord> = { stepScopeId: "step_1", runId: "run_1", attemptId: "a1" };
    const attempt2: Partial<AttemptRecord> = { stepScopeId: "step_1", runId: "run_1", attemptId: "a2" };

    writeFileSync(testLedgerPath, JSON.stringify(attempt1) + "\n" + JSON.stringify(attempt2) + "\n");

    const tracker = new BudgetTracker(testLedgerPath, {
      maxAttemptsPerStep: 2,
      maxAttemptsPerRun: 10,
      perCandidateProbeTimeoutMs: 500
    });

    const allowed = tracker.isUnderBudget("step_1", "run_1");
    expect(allowed).toBe(false);
  });
});
