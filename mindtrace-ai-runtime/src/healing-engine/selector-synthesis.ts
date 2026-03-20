// mindtrace-ai-runtime/src/healing-engine/selector-synthesis.ts
import type { ActionType, LocatorType } from "./types.js";

export interface SelectorCandidate {
  type: LocatorType;
  selector: string;
}

/**
 * Synthesize selectors from page cache signals
 *
 * Policy-gated: only emit selectors compatible with action type.
 * Used by Tier 2 (cache) and Tier 4 (fallback).
 */
export function synthesizeSelectors(
  signals: {
    stableIds?: string[];
    roles?: string[];
    labels?: string[];
    placeholders?: string[];
  },
  actionType: ActionType
): SelectorCandidate[] {
  const candidates: SelectorCandidate[] = [];

  // Synthesize testid selectors
  if (signals.stableIds) {
    for (const id of signals.stableIds) {
      candidates.push({
        type: "testid",
        selector: `[data-testid='${id}']`
      });
    }
  }

  // Synthesize role selectors
  if (signals.roles) {
    for (const role of signals.roles) {
      // Filter incompatible roles
      if (isRoleCompatible(role, actionType)) {
        candidates.push({
          type: "role",
          selector: role
        });
      }
    }
  }

  // Synthesize label selectors
  if (signals.labels) {
    for (const label of signals.labels) {
      candidates.push({
        type: "label",
        selector: label
      });
    }
  }

  return candidates;
}

/**
 * Check if role is compatible with action type
 */
function isRoleCompatible(role: string, actionType: ActionType): boolean {
  const fillCompatible = ["textbox", "searchbox", "combobox"];
  const clickCompatible = ["button", "link", "checkbox", "radio", "tab"];

  if (actionType === "fill") {
    return fillCompatible.includes(role);
  }

  if (actionType === "click") {
    return clickCompatible.includes(role);
  }

  return true;
}
