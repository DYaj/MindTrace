// mindtrace-ai-runtime/src/healing-engine/tiers/tier2-cache.ts
import { generateCandidateId } from "../candidate-id.js";
import { synthesizeSelectors } from "../selector-synthesis.js";
import type { HealingContext, TierResult, Candidate } from "../types.js";
import type { CacheIndex } from "../cache-parser.js";

/**
 * Tier 2: Page semantic cache (high confidence)
 */
export class Tier2Cache {
  private cacheIndex: CacheIndex;

  constructor(cacheIndex: CacheIndex) {
    this.cacheIndex = cacheIndex;
  }

  async execute(ctx: HealingContext): Promise<TierResult> {
    // Check preconditions
    if (!ctx.pageKey) {
      return {
        status: "skipped",
        reason: "NO_PAGEKEY",
        attempts: []
      };
    }

    const siteKey = ctx.strategyContext?.siteKey;
    if (!siteKey || !this.cacheIndex[siteKey]) {
      return {
        status: "skipped",
        reason: "CACHE_DISABLED",
        attempts: []
      };
    }

    const cacheEntry = this.cacheIndex[siteKey][ctx.pageKey];
    if (!cacheEntry) {
      return {
        status: "miss",
        attempts: []
      };
    }

    // Synthesize selectors from cache signals
    const synthesized = synthesizeSelectors({
      stableIds: cacheEntry.stableIds,
      roles: cacheEntry.roles,
      labels: cacheEntry.labels,
      placeholders: cacheEntry.placeholders
    }, ctx.actionType);

    // Emit candidates
    const candidates: Candidate[] = synthesized.map(syn => ({
      candidateId: generateCandidateId({
        tier: "cache",
        locatorType: syn.type,
        selector: syn.selector,
        pageKey: ctx.pageKey
      }),
      tier: "cache" as const,
      locatorType: syn.type,
      selector: syn.selector,
      riskScore: this.getRiskScore(syn.type),
      confidenceScore: cacheEntry.confidence,
      evidence: {
        fromCachePage: ctx.pageKey
      }
    }));

    // Sort by confidence (desc) then risk (asc)
    candidates.sort((a, b) => {
      if (b.confidenceScore !== a.confidenceScore) {
        return (b.confidenceScore || 0) - (a.confidenceScore || 0);
      }
      return a.riskScore - b.riskScore;
    });

    // TODO: probe candidates (deferred to orchestrator)
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
