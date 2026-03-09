// mindtrace-ai-runtime/src/healing-engine/tiers/tier1-contract.ts
import { generateCandidateId } from "../candidate-id";
import type { HealingContext, TierResult, Candidate, LocatorType } from "../types";

interface ContractLocator {
  type: LocatorType;
  selector: string;
}

/**
 * Tier 1: Contract-defined selectors (highest authority)
 */
export class Tier1Contract {
  async execute(ctx: HealingContext): Promise<TierResult> {
    // Check preconditions
    if (!ctx.strategyContext?.selectorPolicy?.locators) {
      return {
        status: "skipped",
        reason: "POLICY_BLOCKED",
        attempts: []
      };
    }

    // Emit contract-defined selectors
    const locators: ContractLocator[] = ctx.strategyContext.selectorPolicy.locators;
    const candidates: Candidate[] = locators.map((loc) => ({
      candidateId: generateCandidateId({
        tier: "contract",
        locatorType: loc.type,
        selector: loc.selector,
        pageKey: ctx.pageKey
      }),
      tier: "contract" as const,
      locatorType: loc.type,
      selector: loc.selector,
      riskScore: this.getRiskScore(loc.type),
      evidence: {
        fromContractFile: "selector-policy.json"
      }
    }));

    // Sort by risk score (ascending = lowest risk first)
    candidates.sort((a, b) => a.riskScore - b.riskScore);

    // Emit candidates as attempts (probing deferred to orchestrator)
    // Note: Casting candidates as attempts for now - full AttemptRecord creation
    // happens in orchestrator layer
    return {
      status: "miss",
      attempts: candidates as any,
      selectedCandidate: undefined
    };
  }

  private getRiskScore(locatorType: string): number {
    const riskMap: Record<string, number> = {
      testid: 0.05,
      role: 0.10,
      label: 0.15,
      text: 0.30,
      css: 0.60,
      xpath: 0.90
    };
    return riskMap[locatorType] || 0.50;
  }
}
