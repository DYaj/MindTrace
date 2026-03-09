// mindtrace-ai-runtime/src/healing-engine/__tests__/candidate-tester.test.ts
import { CandidateTester } from "../candidate-tester";
import type { Candidate } from "../types";
import type { PageAdapter } from "../page-adapter";

describe("CandidateTester", () => {
  it("probes candidate and returns success if visible + enabled", async () => {
    const mockPageAdapter: PageAdapter = {
      locator: (selector: string) => ({
        first: () => ({
          waitFor: jest.fn().mockResolvedValue(undefined),
          isVisible: jest.fn().mockResolvedValue(true),
          isEnabled: jest.fn().mockResolvedValue(true),
          isEditable: jest.fn().mockResolvedValue(false)
        }),
        all: jest.fn().mockResolvedValue([])
      }),
      getByRole: jest.fn(),
      isClosed: () => false
    };

    const candidate: Candidate = {
      candidateId: "test_id",
      tier: "contract",
      locatorType: "testid",
      selector: "[data-testid='btn']",
      riskScore: 0.05,
      evidence: {}
    };

    const tester = new CandidateTester(mockPageAdapter, 500);
    const result = await tester.probeCandidate(candidate, "click");

    expect(result).toBe("success");
  });

  it("returns fail if element not visible", async () => {
    const mockPageAdapter: PageAdapter = {
      locator: () => ({
        first: () => ({
          waitFor: jest.fn().mockResolvedValue(undefined),
          isVisible: jest.fn().mockResolvedValue(false),
          isEnabled: jest.fn().mockResolvedValue(true),
          isEditable: jest.fn().mockResolvedValue(false)
        }),
        all: jest.fn()
      }),
      getByRole: jest.fn(),
      isClosed: () => false
    };

    const candidate: Candidate = {
      candidateId: "test_id",
      tier: "contract",
      locatorType: "testid",
      selector: "[data-testid='btn']",
      riskScore: 0.05,
      evidence: {}
    };

    const tester = new CandidateTester(mockPageAdapter, 500);
    const result = await tester.probeCandidate(candidate, "click");

    expect(result).toBe("fail");
  });

  it("returns fail on error", async () => {
    const mockPageAdapter: PageAdapter = {
      locator: () => ({
        first: () => ({
          waitFor: jest.fn().mockRejectedValue(new Error("Timeout")),
          isVisible: jest.fn(),
          isEnabled: jest.fn(),
          isEditable: jest.fn()
        }),
        all: jest.fn()
      }),
      getByRole: jest.fn(),
      isClosed: () => false
    };

    const candidate: Candidate = {
      candidateId: "test_id",
      tier: "contract",
      locatorType: "testid",
      selector: "[data-testid='btn']",
      riskScore: 0.05,
      evidence: {}
    };

    const tester = new CandidateTester(mockPageAdapter, 500);
    const result = await tester.probeCandidate(candidate, "click");

    expect(result).toBe("fail");
  });
});
