// mindtrace-ai-runtime/src/healing-engine/lkg-extractor.ts
import type { Candidate } from "./types";

export interface LKGCandidate extends Candidate {
  fromRun: string;
  lastSuccessTimestamp?: string;
}

/**
 * LKGExtractor - extract Last-Known-Good selectors from run artifacts
 */
export class LKGExtractor {
  /**
   * Extract LKG candidates from run data
   */
  extractLKG(runData: {
    runId: string;
    healingOutcome?: any;
    healingAttempts?: any[];
  }): LKGCandidate[] {
    if (!runData.healingAttempts) {
      return [];
    }

    const lkgCandidates: LKGCandidate[] = [];

    for (const attempt of runData.healingAttempts) {
      // Only include successful attempts
      if (attempt.result === "success" && attempt.candidate) {
        lkgCandidates.push({
          ...attempt.candidate,
          fromRun: runData.runId
        });
      }
    }

    return lkgCandidates;
  }
}
