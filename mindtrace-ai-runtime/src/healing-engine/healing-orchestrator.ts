// mindtrace-ai-runtime/src/healing-engine/healing-orchestrator.ts
import crypto from "crypto";
import { BudgetTracker } from "./budget-tracker";
import { LedgerWriter } from "./ledger-writer";
import { CandidateTester } from "./candidate-tester";
import { Tier1Contract } from "./tiers/tier1-contract";
import { Tier2Cache } from "./tiers/tier2-cache";
import { Tier3LKG } from "./tiers/tier3-lkg";
import { Tier4Fallback } from "./tiers/tier4-fallback";
import type { HealingContext, HealResult, TierResult, Candidate, AttemptRecord } from "./types";

/**
 * HealingOrchestrator - coordinates tier execution with budget enforcement
 *
 * Flow: Check budget → Run Tier 1 → 2 → 3 → 4 → (5 stub) → Write artifacts
 */
export class HealingOrchestrator {
  private ledgerPath: string;
  private writerVersion: string;

  constructor(ledgerPath: string, writerVersion: string) {
    this.ledgerPath = ledgerPath;
    this.writerVersion = writerVersion;
  }

  /**
   * Execute healing flow
   */
  async heal(ctx: HealingContext): Promise<HealResult> {
    // Initialize components
    const budgetTracker = new BudgetTracker(this.ledgerPath, ctx.budgets);
    const ledgerWriter = new LedgerWriter(this.ledgerPath, this.writerVersion);
    const candidateTester = new CandidateTester(ctx.pageAdapter, ctx.budgets.perCandidateProbeTimeoutMs);

    // Check budget
    if (!budgetTracker.isUnderBudget(ctx.stepScopeId, ctx.runId)) {
      return {
        outcome: "blocked_by_policy",
        outcomeReason: "HEAL_BUDGET_EXHAUSTED_STEP",
        attempts: [],
        totalAttempts: 0,
        attemptGroupId: this.generateAttemptGroupId(ctx)
      };
    }

    // Run tiers in order
    const attemptGroupId = this.generateAttemptGroupId(ctx);
    const allAttempts: AttemptRecord[] = [];

    // Tier 1: Contract
    const tier1 = new Tier1Contract();
    const result1 = await this.executeTier(tier1, ctx, candidateTester, ledgerWriter, budgetTracker, attemptGroupId);
    allAttempts.push(...result1.attempts);
    if (result1.selectedCandidate) {
      return this.buildHealResult("healed", "HEAL_SUCCESS", "contract", result1.selectedCandidate, allAttempts, attemptGroupId);
    }

    // Tier 2: Cache (stub for now)
    // Tier 3: LKG (stub for now)
    // Tier 4: Fallback (stub for now)
    // Tier 5: LLM (stub)

    // No healing succeeded
    return {
      outcome: "not_healed",
      outcomeReason: "HEAL_NO_CANDIDATES",
      attempts: allAttempts,
      totalAttempts: allAttempts.length,
      attemptGroupId
    };
  }

  /**
   * Execute single tier
   */
  private async executeTier(
    tier: any,
    ctx: HealingContext,
    tester: CandidateTester,
    writer: LedgerWriter,
    budgetTracker: BudgetTracker,
    attemptGroupId: string
  ): Promise<TierResult> {
    const result = await tier.execute(ctx);

    // Probe candidates if tier returned any
    if (result.status === "miss" && result.candidates) {
      for (const candidate of result.candidates) {
        // Check budget before each probe
        if (!budgetTracker.isUnderBudget(ctx.stepScopeId, ctx.runId)) {
          break;
        }

        const probeResult = await tester.probeCandidate(candidate, ctx.actionType);
        const budgetRemaining = budgetTracker.getRemainingBudget(ctx.stepScopeId, ctx.runId);

        const attemptRecord: AttemptRecord = {
          schema_version: "1.0.0",
          writerVersion: this.writerVersion,
          attemptId: this.generateAttemptId(ctx, candidate),
          attemptGroupId,
          stepScopeId: ctx.stepScopeId,
          runId: ctx.runId,
          stepId: ctx.stepId,
          tier: candidate.tier,
          candidateId: candidate.candidateId,
          probeMethodId: "ATTACHED_VISIBLE_ENABLED",
          probeTimeoutMs: ctx.budgets.perCandidateProbeTimeoutMs,
          result: probeResult,
          failureFingerprint: "",
          policyAllowed: true,
          budgetRemaining,
          candidate
        };

        writer.append(attemptRecord);
        result.attempts.push(attemptRecord);

        if (probeResult === "success") {
          result.status = "success";
          result.selectedCandidate = candidate;
          return result;
        }
      }
    }

    return result;
  }

  /**
   * Build heal result
   */
  private buildHealResult(
    outcome: "healed" | "not_healed" | "skipped" | "blocked_by_policy",
    reason: string,
    tier: string | undefined,
    candidate: Candidate | undefined,
    attempts: AttemptRecord[],
    attemptGroupId: string
  ): HealResult {
    return {
      outcome,
      outcomeReason: reason as any,
      usedTier: tier as any,
      selectedCandidate: candidate,
      attempts,
      totalAttempts: attempts.length,
      attemptGroupId
    };
  }

  /**
   * Generate attempt group ID (stable hash)
   */
  private generateAttemptGroupId(ctx: HealingContext): string {
    const input = `${ctx.runId}|${ctx.stepScopeId}`;
    return crypto.createHash("sha256").update(input).digest("hex").substring(0, 16);
  }

  /**
   * Generate attempt ID (stable hash)
   */
  private generateAttemptId(ctx: HealingContext, candidate: Candidate): string {
    const input = `${ctx.runId}|${ctx.stepScopeId}|${candidate.candidateId}`;
    return crypto.createHash("sha256").update(input).digest("hex").substring(0, 16);
  }
}
