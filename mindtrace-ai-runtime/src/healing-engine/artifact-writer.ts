// mindtrace-ai-runtime/src/healing-engine/artifact-writer.ts
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { dirname } from "path";
import type { HealResult } from "./types";

/**
 * ArtifactWriter - write healing-outcome.json and healing-summary.json
 *
 * All artifacts use canonical JSON (recursively sorted keys).
 */
export class ArtifactWriter {
  private writerVersion: string;

  constructor(writerVersion: string) {
    this.writerVersion = writerVersion;
  }

  /**
   * Write healing-outcome.json
   */
  writeOutcome(path: string, result: HealResult, meta: { runId: string; stepId: string }): void {
    const outcome = {
      schema_version: "1.0.0",
      writerVersion: this.writerVersion,
      runId: meta.runId,
      stepId: meta.stepId,
      attemptGroupId: result.attemptGroupId,
      outcome: result.outcome,
      outcomeReason: result.outcomeReason,
      usedTier: result.usedTier,
      selectedCandidateId: result.selectedCandidate?.candidateId,
      totalAttempts: result.totalAttempts,
      policyAllowed: true,
      ledgerPath: "artifacts/runtime/healing-attempts.jsonl"
    };

    this.writeCanonicalJSON(path, outcome);
  }

  /**
   * Write healing-summary.json (run-level)
   */
  writeSummary(path: string, summary: {
    runId: string;
    totalHealAttempts: number;
    totalHealSuccesses: number;
    totalHealFailures: number;
    tierBreakdown: Record<string, number>;
  }): void {
    const summaryDoc = {
      schema_version: "1.0.0",
      writerVersion: this.writerVersion,
      runId: summary.runId,
      totalHealAttempts: summary.totalHealAttempts,
      totalHealSuccesses: summary.totalHealSuccesses,
      totalHealFailures: summary.totalHealFailures,
      tierBreakdown: summary.tierBreakdown,
      ledgerPath: "artifacts/runtime/healing-attempts.jsonl"
    };

    this.writeCanonicalJSON(path, summaryDoc);
  }

  /**
   * Write canonical JSON (recursively sorted keys)
   */
  private writeCanonicalJSON(path: string, obj: any): void {
    const dir = dirname(path);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    const sorted = this.canonicalSort(obj);
    const canonical = JSON.stringify(sorted, null, 2);
    writeFileSync(path, canonical, "utf-8");
  }

  /**
   * Recursively sort object keys (ensures deterministic output)
   */
  private canonicalSort(obj: unknown): unknown {
    if (obj === null || typeof obj !== "object") {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.canonicalSort(item));
    }

    const sorted: Record<string, unknown> = {};
    const keys = Object.keys(obj).sort();
    for (const key of keys) {
      sorted[key] = this.canonicalSort((obj as Record<string, unknown>)[key]);
    }
    return sorted;
  }
}
