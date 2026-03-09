// mindtrace-ai-runtime/src/healing-engine/tiers/__tests__/tier4-fallback.test.ts
import { Tier4Fallback } from "../tier4-fallback";
import type { HealingContext } from "../../types";

describe("Tier4Fallback", () => {
  it("generates fallback candidates with bounded probes", async () => {
    const mockProbePlanGenerator = {
      generatePlan: jest.fn().mockReturnValue({
        candidates: [
          {
            candidateId: "fallback_role_button_0",
            tier: "fallback",
            locatorType: "role",
            selector: "button",
            riskScore: 0.10,
            evidence: {}
          }
        ],
        probeOrder: ["fallback_role_button_0"]
      })
    };

    const mockContext: Partial<HealingContext> = {
      actionType: "click",
      accessibleNameHint: "Login"
    };

    const tier = new Tier4Fallback(mockProbePlanGenerator as any);
    const result = await tier.execute(mockContext as HealingContext);

    expect(result.status).toBe("miss"); // no probe yet
  });
});
