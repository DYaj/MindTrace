// mindtrace-ai-runtime/src/healing-engine/budget-tracker.ts
import { readFileSync, existsSync } from "fs";
import type { AttemptRecord, HealingBudgets } from "./types.js";

/**
 * BudgetTracker - pure reduction from healing-attempts.jsonl
 *
 * Counts attempts per step and per run to enforce budget limits.
 * Pure function: no state, always reads from ledger for current count.
 *
 * Budget enforcement prevents runaway healing loops:
 * - maxAttemptsPerStep (typically 2): Per-step limit
 * - maxAttemptsPerRun (typically 10): Per-run limit
 */
export class BudgetTracker {
  private ledgerPath: string;
  private budgets: HealingBudgets;

  constructor(ledgerPath: string, budgets: HealingBudgets) {
    this.ledgerPath = ledgerPath;
    this.budgets = budgets;
  }

  /**
   * Count attempts matching filter (pure reduction)
   *
   * @param filter - Filter by stepScopeId or runId
   * @returns Number of matching attempts in ledger
   */
  countAttempts(filter: { stepScopeId?: string; runId?: string }): number {
    if (!existsSync(this.ledgerPath)) {
      return 0;
    }

    const lines = readFileSync(this.ledgerPath, "utf-8").trim().split("\n").filter(l => l);
    let count = 0;

    for (const line of lines) {
      const record = JSON.parse(line) as AttemptRecord;

      if (filter.stepScopeId && record.stepScopeId === filter.stepScopeId) {
        count++;
      } else if (filter.runId && record.runId === filter.runId) {
        count++;
      }
    }

    return count;
  }

  /**
   * Check if under budget (step AND run)
   *
   * @param stepScopeId - Step scope ID to check
   * @param runId - Run ID to check
   * @returns true if both step and run are under budget
   */
  isUnderBudget(stepScopeId: string, runId: string): boolean {
    const stepCount = this.countAttempts({ stepScopeId });
    const runCount = this.countAttempts({ runId });

    return stepCount < this.budgets.maxAttemptsPerStep &&
           runCount < this.budgets.maxAttemptsPerRun;
  }

  /**
   * Get remaining budget for step and run
   *
   * @param stepScopeId - Step scope ID
   * @param runId - Run ID
   * @returns Remaining budget for step and run
   */
  getRemainingBudget(stepScopeId: string, runId: string): { step: number; run: number } {
    const stepCount = this.countAttempts({ stepScopeId });
    const runCount = this.countAttempts({ runId });

    return {
      step: this.budgets.maxAttemptsPerStep - stepCount,
      run: this.budgets.maxAttemptsPerRun - runCount
    };
  }
}
