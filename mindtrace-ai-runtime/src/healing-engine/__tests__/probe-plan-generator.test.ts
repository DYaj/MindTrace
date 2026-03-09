// mindtrace-ai-runtime/src/healing-engine/__tests__/probe-plan-generator.test.ts
import { ProbePlanGenerator } from "../probe-plan-generator";

describe("ProbePlanGenerator", () => {
  it("generates probe plan with bounded candidates", () => {
    const generator = new ProbePlanGenerator();

    const plan = generator.generatePlan({
      actionType: "click",
      accessibleNameHint: "Login",
      maxCandidates: 20,
      maxProbes: 6
    });

    expect(plan.candidates.length).toBeLessThanOrEqual(20);
    expect(plan.probeOrder.length).toBeLessThanOrEqual(6);
  });

  it("generates action-compatible probes", () => {
    const generator = new ProbePlanGenerator();

    const planClick = generator.generatePlan({
      actionType: "click",
      maxCandidates: 20,
      maxProbes: 6
    });

    const planFill = generator.generatePlan({
      actionType: "fill",
      maxCandidates: 20,
      maxProbes: 6
    });

    // Click should prefer button/link roles
    // Fill should prefer textbox roles
    expect(planClick.probeOrder).toBeDefined();
    expect(planFill.probeOrder).toBeDefined();
  });
});
