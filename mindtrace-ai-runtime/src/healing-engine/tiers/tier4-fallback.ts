// mindtrace-ai-runtime/src/healing-engine/tiers/tier4-fallback.ts
import type { HealingContext, TierResult } from "../types";
import type { ProbePlanGenerator } from "../probe-plan-generator";

/**
 * Tier 4: Deterministic fallback (algorithmic, action-aware, strict caps)
 */
export class Tier4Fallback {
  private probePlanGenerator: ProbePlanGenerator;

  constructor(probePlanGenerator: ProbePlanGenerator) {
    this.probePlanGenerator = probePlanGenerator;
  }

  async execute(ctx: HealingContext): Promise<TierResult> {
    // Generate probe plan (bounded)
    const plan = this.probePlanGenerator.generatePlan({
      actionType: ctx.actionType,
      accessibleNameHint: ctx.accessibleNameHint,
      maxCandidates: 20,
      maxProbes: 6
    });

    if (plan.candidates.length === 0) {
      return {
        status: "skipped",
        reason: "TIER_UNAVAILABLE",
        attempts: []
      };
    }

    // TODO: probe candidates (deferred to orchestrator)
    return {
      status: "miss",
      attempts: plan.candidates as any,
      selectedCandidate: undefined
    };
  }
}
