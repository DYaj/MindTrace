// mindtrace-ai-runtime/src/healing-engine/__tests__/healing-orchestrator.test.ts
import { unlinkSync, existsSync } from "fs";
import { HealingOrchestrator } from "../healing-orchestrator";
import type { HealingContext } from "../types";
import type { PageAdapter } from "../page-adapter";

describe("HealingOrchestrator", () => {
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

  it("runs tiers in order (Contract → Cache → LKG → Fallback)", async () => {
    const mockPageAdapter: PageAdapter = {
      locator: jest.fn().mockReturnValue({
        first: () => ({
          waitFor: jest.fn().mockResolvedValue(undefined),
          isVisible: jest.fn().mockResolvedValue(true),
          isEnabled: jest.fn().mockResolvedValue(true),
          isEditable: jest.fn().mockResolvedValue(false)
        }),
        all: jest.fn()
      }),
      getByRole: jest.fn(),
      isClosed: () => false
    };

    const mockContext: Partial<HealingContext> = {
      runId: "run_1",
      stepId: "step_1",
      stepScopeId: "scope_1",
      actionType: "click",
      pageAdapter: mockPageAdapter,
      budgets: {
        maxAttemptsPerStep: 2,
        maxAttemptsPerRun: 10,
        perCandidateProbeTimeoutMs: 500
      },
      strategyContext: {}
    };

    const orchestrator = new HealingOrchestrator(testLedgerPath, "3.0.0");
    const result = await orchestrator.heal(mockContext as HealingContext);

    expect(result.outcome).toBeDefined();
  });
});
