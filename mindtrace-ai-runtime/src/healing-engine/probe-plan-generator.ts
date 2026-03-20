// mindtrace-ai-runtime/src/healing-engine/probe-plan-generator.ts
import type { ActionType, Candidate } from "./types.js";

export interface ProbePlan {
  candidates: Candidate[];
  probeOrder: string[]; // candidateIds in probe order
}

/**
 * ProbePlanGenerator - deterministic fallback probe plan
 *
 * Generates bounded candidate list (max 20) + probe order (max 6).
 */
export class ProbePlanGenerator {
  /**
   * Generate probe plan
   */
  generatePlan(params: {
    actionType: ActionType;
    accessibleNameHint?: string;
    maxCandidates: number;
    maxProbes: number;
  }): ProbePlan {
    const { actionType, accessibleNameHint, maxCandidates, maxProbes } = params;

    // Generate candidates (action-compatible roles)
    const candidateRoles = this.getActionCompatibleRoles(actionType);
    const candidates: Candidate[] = candidateRoles.slice(0, maxCandidates).map((role, idx) => ({
      candidateId: `fallback_role_${role}_${idx}`,
      tier: "fallback",
      locatorType: "role",
      selector: role,
      riskScore: this.getRoleRisk(role),
      evidence: {}
    }));

    // Sort by risk (ascending = lowest risk first)
    candidates.sort((a, b) => a.riskScore - b.riskScore);

    // Probe order: top N by risk
    const probeOrder = candidates.slice(0, maxProbes).map(c => c.candidateId);

    return {
      candidates,
      probeOrder
    };
  }

  /**
   * Get action-compatible roles
   */
  private getActionCompatibleRoles(actionType: ActionType): string[] {
    if (actionType === "click") {
      return ["button", "link", "checkbox", "radio", "tab"];
    }

    if (actionType === "fill") {
      return ["textbox", "searchbox", "combobox"];
    }

    return ["button", "textbox"];
  }

  /**
   * Get role risk score
   */
  private getRoleRisk(role: string): number {
    const riskMap: Record<string, number> = {
      button: 0.10,
      textbox: 0.10,
      link: 0.20,
      checkbox: 0.15,
      radio: 0.15,
      tab: 0.20,
      searchbox: 0.12,
      combobox: 0.18
    };
    return riskMap[role] || 0.50;
  }
}
