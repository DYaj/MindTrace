// mindtrace-ai-runtime/src/healing-engine/tiers/__tests__/tier1-contract.test.ts
import { Tier1Contract } from "../tier1-contract";
import type { HealingContext } from "../../types";

describe("Tier1Contract", () => {
  it("emits contract-defined selectors", async () => {
    const mockContext: Partial<HealingContext> = {
      strategyContext: {
        selectorPolicy: {
          locators: [
            { type: "testid", selector: "[data-testid='login-btn']" }
          ]
        }
      },
      pageAdapter: {
        locator: jest.fn(),
        getByRole: jest.fn(),
        isClosed: () => false
      }
    };

    const tier = new Tier1Contract();
    const result = await tier.execute(mockContext as HealingContext);

    expect(result.status).toBe("miss"); // no probe yet, just emit
    expect(result.attempts.length).toBeGreaterThan(0);
  });

  it("returns skipped if no selectorPolicy", async () => {
    const mockContext: Partial<HealingContext> = {
      strategyContext: {},
      pageAdapter: {
        locator: jest.fn(),
        getByRole: jest.fn(),
        isClosed: () => false
      }
    };

    const tier = new Tier1Contract();
    const result = await tier.execute(mockContext as HealingContext);

    expect(result.status).toBe("skipped");
    expect(result.reason).toBe("POLICY_BLOCKED");
  });
});
