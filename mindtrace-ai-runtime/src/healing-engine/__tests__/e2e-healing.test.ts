// mindtrace-ai-runtime/src/healing-engine/__tests__/e2e-healing.test.ts
import { unlinkSync, existsSync, readFileSync, mkdirSync } from "fs";
import { HealingOrchestrator } from "../healing-orchestrator";
import type { HealingContext } from "../types";
import type { PageAdapter } from "../page-adapter";

describe("E2E Healing Flow", () => {
  const testRunDir = "test-runs/run_1/artifacts/runtime";
  const testLedgerPath = `${testRunDir}/healing-attempts.jsonl`;

  beforeEach(() => {
    if (!existsSync(testRunDir)) {
      mkdirSync(testRunDir, { recursive: true });
    }
    if (existsSync(testLedgerPath)) {
      unlinkSync(testLedgerPath);
    }
  });

  afterEach(() => {
    if (existsSync(testLedgerPath)) {
      unlinkSync(testLedgerPath);
    }
  });

  it("runs full healing flow with contract tier success", async () => {
    // Mock page adapter that succeeds on contract selector
    const mockPageAdapter: PageAdapter = {
      locator: (selector: string) => ({
        first: () => ({
          waitFor: async () => {},
          isVisible: async () => true,
          isEnabled: async () => true,
          isEditable: async () => false
        }),
        all: async () => []
      }),
      getByRole: () => ({
        first: () => ({
          waitFor: async () => {},
          isVisible: async () => true,
          isEnabled: async () => true,
          isEditable: async () => false
        }),
        all: async () => []
      }),
      isClosed: () => false
    };

    const mockContext: HealingContext = {
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
      strategyContext: {
        selectorPolicy: {
          locators: [
            { type: "testid", selector: "[data-testid='login-btn']" }
          ]
        }
      },
      policyDecisionSnapshot: {},
      accessibleNameHint: undefined
    };

    const orchestrator = new HealingOrchestrator(testLedgerPath, "3.0.0");
    const result = await orchestrator.heal(mockContext);

    expect(result.outcome).toBe("healed");
    expect(result.usedTier).toBe("contract");
    expect(result.selectedCandidate).toBeDefined();

    // Verify ledger written
    expect(existsSync(testLedgerPath)).toBe(true);
    const ledger = readFileSync(testLedgerPath, "utf-8");
    expect(ledger.trim().split("\n").length).toBeGreaterThan(0);
  });
});
