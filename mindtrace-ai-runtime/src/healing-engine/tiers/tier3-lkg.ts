// mindtrace-ai-runtime/src/healing-engine/tiers/tier3-lkg.ts
import type { HealingContext, TierResult, Candidate } from "../types";
import type { HistoryReader } from "../history-reader";
import type { LKGExtractor } from "../lkg-extractor";

/**
 * Tier 3: Last-Known-Good (historical fallback)
 */
export class Tier3LKG {
  private historyReader: HistoryReader;
  private lkgExtractor: LKGExtractor;

  constructor(historyReader: HistoryReader, lkgExtractor: LKGExtractor) {
    this.historyReader = historyReader;
    this.lkgExtractor = lkgExtractor;
  }

  async execute(ctx: HealingContext): Promise<TierResult> {
    // Scan recent runs (framework + primaryStyle guard)
    const recentRuns = this.historyReader.scanRecentRuns({
      framework: ctx.strategyContext?.framework || "",
      primaryStyle: ctx.strategyContext?.primaryStyle || ""
    });

    if (recentRuns.length === 0) {
      return {
        status: "skipped",
        reason: "LKG_UNAVAILABLE",
        attempts: []
      };
    }

    // Extract LKG candidates from recent runs
    const lkgCandidates: Candidate[] = [];

    for (const run of recentRuns.slice(0, 10)) { // max 10 recent runs
      const runLKG = this.lkgExtractor.extractLKG(run);
      lkgCandidates.push(...runLKG.map(lkg => ({
        ...lkg,
        tier: "lkg" as const,
        evidence: {
          fromHistoryRun: lkg.fromRun
        }
      })));
    }

    if (lkgCandidates.length === 0) {
      return {
        status: "skipped",
        reason: "LKG_UNAVAILABLE",
        attempts: []
      };
    }

    // Rank by tier trust → confidence → candidateId (deterministic tie-breaker)
    lkgCandidates.sort((a, b) => {
      if (b.confidenceScore !== a.confidenceScore) {
        return (b.confidenceScore || 0) - (a.confidenceScore || 0);
      }
      return a.candidateId.localeCompare(b.candidateId);
    });

    // TODO: probe candidates (deferred to orchestrator)
    return {
      status: "miss",
      attempts: lkgCandidates as any,
      selectedCandidate: undefined
    };
  }
}
