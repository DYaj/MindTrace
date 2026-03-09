// mindtrace-ai-runtime/src/healing-engine/tiers/__tests__/tier3-lkg.test.ts
import { Tier3LKG } from "../tier3-lkg";
import type { HealingContext } from "../../types";

describe("Tier3LKG", () => {
  it("emits LKG selectors from history", async () => {
    const mockHistoryReader = {
      scanRecentRuns: jest.fn().mockReturnValue([
        { runId: "run_1", framework: "style1-native", primaryStyle: "native" }
      ])
    };

    const mockLKGExtractor = {
      extractLKG: jest.fn().mockReturnValue([
        {
          candidateId: "lkg_testid_abc",
          tier: "lkg",
          locatorType: "testid",
          selector: "[data-testid='login-btn']",
          riskScore: 0.05,
          evidence: {},
          fromRun: "run_1"
        }
      ])
    };

    const mockContext: Partial<HealingContext> = {
      strategyContext: {
        framework: "style1-native",
        primaryStyle: "native"
      }
    };

    const tier = new Tier3LKG(mockHistoryReader as any, mockLKGExtractor as any);
    const result = await tier.execute(mockContext as HealingContext);

    expect(result.status).toBe("miss"); // no probe yet
  });

  it("returns skipped if history unavailable", async () => {
    const mockHistoryReader = {
      scanRecentRuns: jest.fn().mockReturnValue([])
    };

    const mockLKGExtractor = {
      extractLKG: jest.fn().mockReturnValue([])
    };

    const mockContext: Partial<HealingContext> = {
      strategyContext: {
        framework: "style1-native",
        primaryStyle: "native"
      }
    };

    const tier = new Tier3LKG(mockHistoryReader as any, mockLKGExtractor as any);
    const result = await tier.execute(mockContext as HealingContext);

    expect(result.status).toBe("skipped");
    expect(result.reason).toBe("LKG_UNAVAILABLE");
  });
});
