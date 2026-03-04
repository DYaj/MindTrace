// mindtrace-ai-runtime/src/healing-engine/types.ts

// =====================================
// Failure Classification
// =====================================

export type FailureCategory =
  | "selectorMissing"
  | "elementDetached"
  | "timeout"
  | "assertion"
  | "network4xx"
  | "environment"
  | "testCodeError"
  | "unknown";

export interface FailureClass {
  category: FailureCategory;
  healable: boolean;
  confidence: number;
  source: "playwright_error" | "governance" | "runtime_wrapper";
  reasonCode: string;
  errorFingerprint: string;
  matchedPatterns?: string[];
  classifierVersion: string;
}

// =====================================
// Candidates & Tiers
// =====================================

export type TierName = "contract" | "cache" | "lkg" | "fallback" | "llm";
export type LocatorType = "testid" | "role" | "label" | "text" | "css" | "xpath";

export interface Candidate {
  candidateId: string;
  tier: TierName;
  locatorType: LocatorType;
  selector: string;
  riskScore: number;
  confidenceScore?: number;
  evidence: {
    fromCachePage?: string;
    fromHistoryRun?: string;
    fromContractFile?: string;
  };
}

export type TierSkipReason =
  | "NO_PAGEKEY"
  | "CACHE_DISABLED"
  | "PAGE_NOT_ACTIONABLE"
  | "POLICY_BLOCKED"
  | "BUDGET_EXHAUSTED"
  | "LKG_UNAVAILABLE"
  | "TIER_UNAVAILABLE";

export interface TierResult {
  status: "success" | "miss" | "skipped";
  reason?: TierSkipReason;
  attempts: AttemptRecord[];
  selectedCandidate?: Candidate;
}

// =====================================
// Healing Results
// =====================================

export type HealingError =
  | "HEAL_SUCCESS"
  | "HEAL_POLICY_BLOCKED"
  | "HEAL_BUDGET_EXHAUSTED_STEP"
  | "HEAL_BUDGET_EXHAUSTED_RUN"
  | "HEAL_PAGE_NOT_ACTIONABLE"
  | "HEAL_TIER_UNAVAILABLE"
  | "HEAL_NO_CANDIDATES"
  | "HEAL_PROBE_TIMEOUT"
  | "HEAL_PROBE_ERROR";

export type HealOutcomeReason = HealingError;

export interface HealResult {
  outcome: "healed" | "not_healed" | "skipped" | "blocked_by_policy";
  outcomeReason?: HealOutcomeReason;
  usedTier?: TierName;
  selectedCandidate?: Candidate;
  attempts: AttemptRecord[];
  totalAttempts: number;
  attemptGroupId: string;
}

// =====================================
// Attempt Record
// =====================================

export type ProbeMethodId =
  | "ATTACHED_VISIBLE_ENABLED"
  | "ATTACHED_VISIBLE_EDITABLE"
  | "ATTACHED_VISIBLE_ENABLED_SELECT";

export interface AttemptRecord {
  schema_version: "1.0.0";
  writerVersion: string;
  attemptId: string;
  attemptGroupId: string;
  stepScopeId: string;
  runId: string;
  stepId: string;
  tier: TierName;
  candidateId: string;
  probeMethodId: ProbeMethodId;
  probeTimeoutMs: number;
  result: "success" | "fail" | "skipped";
  skipReason?: TierSkipReason;
  failureReasonCode?: HealingError;
  failureFingerprint: string;
  policyAllowed: boolean;
  budgetRemaining: { step: number; run: number };
  redactionsApplied?: string[];
  candidate: Candidate;
}

// =====================================
// Context & Inputs
// =====================================

export type ActionType = "click" | "fill" | "select" | "check" | "hover";

export interface SelectorRequest {
  actionType: ActionType;
  intent: string;
  preferredLocatorType?: LocatorType;
  expectedRole?: string;
  pageKey?: string;
  stepText?: string;
}

export interface HealingBudgets {
  maxAttemptsPerStep: number;
  maxAttemptsPerRun: number;
  maxTimeBudgetMs?: number;
  perCandidateProbeTimeoutMs: number;
}

export interface HealingContext {
  runId: string;
  stepId: string;
  stepScopeId: string;
  stepText?: string;
  actionType: ActionType;
  pageKey?: string;
  expectedRole?: string;
  accessibleNameHint?: string;
  strategyContext: any; // Will import from contract-awareness
  policyDecisionSnapshot: any;
  budgets: HealingBudgets;
  pageAdapter: any; // Will define PageAdapter interface next
}
