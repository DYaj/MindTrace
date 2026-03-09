// mindtrace-ai-runtime/src/healing-engine/__tests__/lkg-extractor.test.ts
import { LKGExtractor } from "../lkg-extractor";

describe("LKGExtractor", () => {
  it("extracts LKG selectors from run artifacts", () => {
    const mockRunData = {
      runId: "run_1",
      healingOutcome: {
        selectedCandidateId: "cache_testid_login_abc",
        usedTier: "cache"
      },
      healingAttempts: [
        {
          candidateId: "cache_testid_login_abc",
          candidate: {
            tier: "cache",
            locatorType: "testid",
            selector: "[data-testid='login-btn']",
            riskScore: 0.05
          },
          result: "success"
        }
      ]
    };

    const extractor = new LKGExtractor();
    const lkg = extractor.extractLKG(mockRunData);

    expect(lkg.length).toBe(1);
    expect(lkg[0].selector).toBe("[data-testid='login-btn']");
    expect(lkg[0].fromRun).toBe("run_1");
  });

  it("filters failed attempts", () => {
    const mockRunData = {
      runId: "run_1",
      healingOutcome: {},
      healingAttempts: [
        {
          candidateId: "cache_testid_login_abc",
          candidate: {
            tier: "cache",
            locatorType: "testid",
            selector: "[data-testid='login-btn']",
            riskScore: 0.05
          },
          result: "fail"
        }
      ]
    };

    const extractor = new LKGExtractor();
    const lkg = extractor.extractLKG(mockRunData);

    expect(lkg.length).toBe(0);
  });
});
