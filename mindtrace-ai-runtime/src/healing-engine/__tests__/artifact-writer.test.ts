// mindtrace-ai-runtime/src/healing-engine/__tests__/artifact-writer.test.ts
import { unlinkSync, existsSync, readFileSync } from "fs";
import { ArtifactWriter } from "../artifact-writer";
import type { HealResult } from "../types";

describe("ArtifactWriter", () => {
  const testOutcomePath = "test-healing-outcome.json";
  const testSummaryPath = "test-healing-summary.json";

  afterEach(() => {
    if (existsSync(testOutcomePath)) unlinkSync(testOutcomePath);
    if (existsSync(testSummaryPath)) unlinkSync(testSummaryPath);
  });

  it("writes healing-outcome.json (canonical JSON)", () => {
    const healResult: HealResult = {
      outcome: "healed",
      outcomeReason: "HEAL_SUCCESS",
      usedTier: "contract",
      selectedCandidate: {
        candidateId: "contract_testid_abc",
        tier: "contract",
        locatorType: "testid",
        selector: "[data-testid='btn']",
        riskScore: 0.05,
        evidence: {}
      },
      attempts: [],
      totalAttempts: 3,
      attemptGroupId: "group_1"
    };

    const writer = new ArtifactWriter("3.0.0");
    writer.writeOutcome(testOutcomePath, healResult, {
      runId: "run_1",
      stepId: "step_1"
    });

    const content = readFileSync(testOutcomePath, "utf-8");
    const parsed = JSON.parse(content);

    expect(parsed.outcome).toBe("healed");
    expect(parsed.usedTier).toBe("contract");
  });
});
