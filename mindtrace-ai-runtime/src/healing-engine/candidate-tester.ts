// mindtrace-ai-runtime/src/healing-engine/candidate-tester.ts
import type { Candidate, ActionType, ProbeMethodId } from "./types.js";
import type { PageAdapter } from "./page-adapter.js";

/**
 * CandidateTester - deterministic probe of selector candidates
 *
 * Probes each candidate using waitFor + state checks (visible, enabled, editable).
 * No retries, no randomness, deterministic timeout.
 *
 * Probe methods:
 * - ATTACHED_VISIBLE_ENABLED: For click/check/hover actions
 * - ATTACHED_VISIBLE_EDITABLE: For fill/select actions
 */
export class CandidateTester {
  private pageAdapter: PageAdapter;
  private probeTimeoutMs: number;

  constructor(pageAdapter: PageAdapter, probeTimeoutMs: number) {
    this.pageAdapter = pageAdapter;
    this.probeTimeoutMs = probeTimeoutMs;
  }

  /**
   * Probe candidate selector
   *
   * @param candidate - Candidate to probe
   * @param actionType - Action type (click, fill, etc.)
   * @returns "success" if element meets criteria, "fail" otherwise
   */
  async probeCandidate(candidate: Candidate, actionType: ActionType): Promise<"success" | "fail"> {
    try {
      const probeMethodId = this.getProbeMethod(actionType);
      const locator = this.pageAdapter.locator(candidate.selector).first();

      // Wait for attached + visible
      await locator.waitFor({ state: "attached", timeout: this.probeTimeoutMs });
      await locator.waitFor({ state: "visible", timeout: this.probeTimeoutMs });

      // Check state based on action type
      if (probeMethodId === "ATTACHED_VISIBLE_ENABLED") {
        const isVisible = await locator.isVisible();
        const isEnabled = await locator.isEnabled();
        return isVisible && isEnabled ? "success" : "fail";
      }

      if (probeMethodId === "ATTACHED_VISIBLE_EDITABLE") {
        const isVisible = await locator.isVisible();
        const isEditable = await locator.isEditable();
        return isVisible && isEditable ? "success" : "fail";
      }

      return "fail";
    } catch (error) {
      // Any error (timeout, detached, etc.) = fail
      return "fail";
    }
  }

  /**
   * Get probe method for action type
   *
   * @param actionType - Action type
   * @returns Probe method ID
   */
  private getProbeMethod(actionType: ActionType): ProbeMethodId {
    if (actionType === "fill" || actionType === "select") {
      return "ATTACHED_VISIBLE_EDITABLE";
    }
    return "ATTACHED_VISIBLE_ENABLED";
  }
}
