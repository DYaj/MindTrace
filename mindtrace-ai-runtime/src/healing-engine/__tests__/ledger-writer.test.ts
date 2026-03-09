// mindtrace-ai-runtime/src/healing-engine/__tests__/ledger-writer.test.ts
import { readFileSync, unlinkSync, existsSync } from "fs";
import { LedgerWriter } from "../ledger-writer";
import type { AttemptRecord } from "../types";

describe("LedgerWriter", () => {
  const testPath = "test-ledger.jsonl";

  beforeEach(() => {
    if (existsSync(testPath)) {
      unlinkSync(testPath);
    }
  });

  afterEach(() => {
    if (existsSync(testPath)) {
      unlinkSync(testPath);
    }
  });

  it("writes attempt record as canonical JSON", () => {
    const writer = new LedgerWriter(testPath, "3.0.0");

    const record: AttemptRecord = {
      schema_version: "1.0.0",
      writerVersion: "3.0.0",
      attemptId: "attempt_1",
      attemptGroupId: "group_1",
      stepScopeId: "step_1",
      runId: "run_1",
      stepId: "step_1",
      tier: "contract",
      candidateId: "candidate_1",
      probeMethodId: "ATTACHED_VISIBLE_ENABLED",
      probeTimeoutMs: 500,
      result: "success",
      failureFingerprint: "",
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

    writer.append(record);

    const content = readFileSync(testPath, "utf-8");
    const parsed = JSON.parse(content.trim());

    expect(parsed.attemptId).toBe("attempt_1");
    expect(parsed.tier).toBe("contract");
  });

  it("appends multiple records (append-only)", () => {
    const writer = new LedgerWriter(testPath, "3.0.0");

    const record1: AttemptRecord = {
      schema_version: "1.0.0",
      writerVersion: "3.0.0",
      attemptId: "attempt_1",
      attemptGroupId: "group_1",
      stepScopeId: "step_1",
      runId: "run_1",
      stepId: "step_1",
      tier: "contract",
      candidateId: "candidate_1",
      probeMethodId: "ATTACHED_VISIBLE_ENABLED",
      probeTimeoutMs: 500,
      result: "success",
      failureFingerprint: "",
      policyAllowed: true,
      budgetRemaining: { step: 1, run: 9 },
      candidate: {} as any
    };

    const record2 = { ...record1, attemptId: "attempt_2" };

    writer.append(record1);
    writer.append(record2);

    const lines = readFileSync(testPath, "utf-8").trim().split("\n");
    expect(lines.length).toBe(2);
  });
});
