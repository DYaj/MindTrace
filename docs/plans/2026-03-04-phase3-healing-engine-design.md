# Phase 3: Healing Engine Upgrade — Design Document

**Date:** 2026-03-04
**Version:** 1.0.0
**Status:** Approved for Implementation

---

## Executive Summary

**Goal:** Implement contract-aware selector healing with governance-first, 5-tier ranking system that respects PLATINUM architecture principles.

**Core Architecture:** Inline activation (Option B') with modular boundaries — healing integrated into runtime selector acquisition layer, not separate service.

**Key Principles:**
1. **Deterministic-only**: No network, no AI (until Phase 5), byte-identical outputs
2. **Governance-first**: Policy-decision.json must exist before healing attempts
3. **Authority boundaries**: Read-only for contracts/cache/history, write-only for run-local artifacts
4. **Auditable**: Every decision, attempt, and outcome logged with stable identifiers
5. **Additive-only**: No breaking changes to Phase 2.0 or existing runtime behavior

---

## Table of Contents

1. [High-Level Architecture](#1-high-level-architecture)
2. [Core Components & Types](#2-core-components--types)
3. [Tier Implementation Details](#3-tier-implementation-details)
4. [Artifacts Specification](#4-artifacts-specification)
5. [Testing Strategy](#5-testing-strategy)
6. [Implementation Phases](#6-implementation-phases)
7. [Non-Negotiable Rules](#7-non-negotiable-rules)
8. [Success Criteria](#8-success-criteria)

---

## 1. High-Level Architecture

### 1.1 Integration Point

**Where:** Runtime's **selector acquisition layer** (wherever `page.locator()` / `getByRole()` are wrapped)

**Trigger Conditions:**
1. Selector fails (Playwright error)
2. `FailureClassifier` marks failure as `healable: true`
3. `policyDecisionWritten === true` (enforced by code guard)
4. Contract-awareness not in exit 3 state (compliance invalid)
5. Page still actionable (not closed/crashed)

**Single Choke Point API:**
```typescript
// All locator acquisition flows through this wrapper
async function acquireSelector(request: SelectorRequest): Promise<Locator> {
  try {
    return await rawLocator(request);
  } catch (error) {
    const failureClass = classifyFailure(error, request);
    if (!failureClass.healable) {
      throw error; // Fast fail
    }

    // Enforce preconditions
    if (!isPolicyDecisionWritten(runId)) {
      throw new Error("HEAL_POLICY_PRECONDITION_VIOLATED");
    }

    if (!policyAllowsHealing(context)) {
      throw error; // Blocked by governance
    }

    // Attempt healing
    const healResult = await healSelector(request, error, page);
    if (healResult.outcome === "healed") {
      return healResult.selectedCandidate.locator;
    }

    throw error; // Healing failed
  }
}
```

### 1.2 Module Structure

```
mindtrace-ai-runtime/src/
├── healing-engine/
│   ├── index.ts                    # Public API: healSelector(...)
│   ├── types.ts                    # HealResult, Candidate, FailureClass, TierStatus
│   ├── failure-classifier.ts       # classifyFailure(err, ctx) -> FailureClass
│   ├── healing-orchestrator.ts     # Tier coordination + budget enforcement
│   ├── tiers/
│   │   ├── tier-interface.ts       # runTier(ctx, priorAttempts) -> TierResult
│   │   ├── tier1-contract.ts       # Contract locator tier
│   │   ├── tier2-cache.ts          # Semantic page cache tier
│   │   ├── tier3-lkg.ts            # Last-known-good tier
│   │   ├── tier4-fallback.ts       # Deterministic fallback tier
│   │   └── tier5-llm.ts            # LLM stub (Phase 5)
│   ├── candidate-tester.ts         # Deterministic probe: waitFor + isVisible/Enabled
│   ├── candidate-synthesizer.ts    # Shared selector synthesis utility (policy-gated)
│   ├── budget-tracker.ts           # Pure reduction from healing-attempts.jsonl
│   ├── normalizer.ts               # Selector normalization + redaction
│   ├── page-adapter.ts             # PageAdapter interface for unit testing
│   └── artifacts/
│       ├── healing-attempts-writer.ts
│       ├── healing-summary-writer.ts
│       ├── healing-outcome-writer.ts
│       ├── lkg-selection-writer.ts
│       ├── tier4-probe-plan-writer.ts
│       └── tier4-result-writer.ts
└── contract-awareness/
    └── strategy-context.ts         # Update: parse .mcp-cache/pages/*.json → pageCacheBySite
```

### 1.3 Data Flow

```
1. Runtime selector fails
   ↓
2. FailureClassifier → {healable: true/false, category, reasonCode}
   ↓
3. If healable + policy allows + budget OK → healingOrchestrator.heal(...)
   ↓
4. Orchestrator runs Tier 1 → 2 → 3 → 4 → (5 Phase 5) with stop conditions
   ↓
5. Each tier returns TierResult {status, attempts, selectedCandidate?}
   ↓
6. If success → return HealResult with selected candidate
   ↓
7. Write artifacts: attempts.jsonl, outcome.json, summary.json
```

---

## 2. Core Components & Types

### 2.1 Core Type Definitions

```typescript
// =====================================
// Request & Context Types
// =====================================

// SelectorRequest - input to runtime choke point
interface SelectorRequest {
  actionType: ActionType;            // click | fill | select | check | hover
  intent: string;                    // human label: "click Login button"
  preferredLocatorType?: LocatorType;
  expectedRole?: string;
  pageKey?: string;
  stepText?: string;                 // deterministic source of hints
}

// HealingContext - deterministic inputs to healing engine
interface HealingContext {
  runId: string;
  stepId: string;
  stepScopeId: string;               // hash({runId, stepId, stepTextNormalized?, actionType})
  stepText?: string;
  actionType: ActionType;
  pageKey?: string;
  expectedRole?: string;
  accessibleNameHint?: string;       // derived from stepText deterministically
  strategyContext: RuntimeStrategyContext;  // from Phase 2.0
  policyDecisionSnapshot: PolicyDecision;   // read-only, already written
  budgets: HealingBudgets;
  pageAdapter: PageAdapter;          // abstraction over Playwright Page
}

// HealingBudgets - policy-driven limits
interface HealingBudgets {
  maxAttemptsPerStep: number;        // e.g., 2
  maxAttemptsPerRun: number;         // e.g., 10
  maxTimeBudgetMs?: number;          // optional
  perCandidateProbeTimeoutMs: number;
}

// =====================================
// Failure Classification
// =====================================

// FailureCategory - deterministic taxonomy
type FailureCategory =
  | "selectorMissing"         // Healable
  | "elementDetached"         // Healable
  | "timeout"                 // Healable only if "waiting for selector/element state"
  | "assertion"               // Never healable
  | "network4xx"              // Never healable
  | "environment"             // Never healable
  | "testCodeError"           // Never healable
  | "unknown";                // Not healable by default

// FailureClass - output of FailureClassifier
interface FailureClass {
  category: FailureCategory;
  healable: boolean;                 // true only for selector-class failures
  confidence: number;                // 0-1: 1.0 (definitive) | 0.7 (message-only) | 0.4 (similar) | 0.0 (unknown)
  source: "playwright_error" | "governance" | "runtime_wrapper";
  reasonCode: string;                // PW_TIMEOUT_WAITING_FOR_SELECTOR
  errorFingerprint: string;          // stable hash of {errName + normalizedMessage + reasonCode}
  matchedPatterns?: string[];        // from healingPolicy patterns
  classifierVersion: string;         // "1.0.0"
}

// =====================================
// Candidates & Probing
// =====================================

// LocatorType - supported locator types
type LocatorType = "testid" | "role" | "label" | "text" | "css" | "xpath";

// Candidate - selector candidate to probe
interface Candidate {
  candidateId: string;               // stable hash of {tier, locatorType, normalizedSelector, pageKey?}
  tier: TierName;
  locatorType: LocatorType;
  selector: string;                  // normalized + redacted
  riskScore: number;                 // 0-1, higher = riskier (XPath ~0.9, testid ~0.05)
  confidenceScore?: number;          // 0-1, higher = more likely correct
  evidence: {
    fromCachePage?: string;
    fromHistoryRun?: string;
    fromContractFile?: string;
  };
}

// ProbeMethodId - deterministic probe methods
type ProbeMethodId =
  | "ATTACHED_VISIBLE_ENABLED"       // for click/hover
  | "ATTACHED_VISIBLE_EDITABLE"      // for fill
  | "ATTACHED_VISIBLE_ENABLED_SELECT"; // for select

// =====================================
// Tier Results
// =====================================

// TierName - 5-tier ranking system
type TierName = "contract" | "cache" | "lkg" | "fallback" | "llm";

// TierSkipReason - why tier was skipped
type TierSkipReason =
  | "NO_PAGEKEY"
  | "CACHE_DISABLED"
  | "PAGE_NOT_ACTIONABLE"
  | "POLICY_BLOCKED"
  | "BUDGET_EXHAUSTED"
  | "LKG_UNAVAILABLE"
  | "TIER_UNAVAILABLE";

// TierResult - output of runTier(...)
interface TierResult {
  status: "success" | "miss" | "skipped";
  reason?: TierSkipReason;
  attempts: AttemptRecord[];
  selectedCandidate?: Candidate;
}

// =====================================
// Healing Results
// =====================================

// HealingError - machine-readable error codes
type HealingError =
  | "HEAL_SUCCESS"
  | "HEAL_POLICY_BLOCKED"
  | "HEAL_BUDGET_EXHAUSTED_STEP"
  | "HEAL_BUDGET_EXHAUSTED_RUN"
  | "HEAL_PAGE_NOT_ACTIONABLE"
  | "HEAL_TIER_UNAVAILABLE"
  | "HEAL_NO_CANDIDATES"
  | "HEAL_PROBE_TIMEOUT"
  | "HEAL_PROBE_ERROR";

// HealOutcomeReason - why healing ended
type HealOutcomeReason = HealingError;

// HealResult - final output of healing engine
interface HealResult {
  outcome: "healed" | "not_healed" | "skipped" | "blocked_by_policy";
  outcomeReason?: HealOutcomeReason;
  usedTier?: TierName;
  selectedCandidate?: Candidate;
  attempts: AttemptRecord[];
  totalAttempts: number;
  attemptGroupId: string;            // hash({stepId, failureFingerprint}) for loop protection
}

// =====================================
// Attempt Record (Single Source of Truth)
// =====================================

// AttemptRecord - logged to healing-attempts.jsonl
interface AttemptRecord {
  schema_version: "1.0.0";
  writerVersion: string;             // e.g., "3.0.0"
  attemptId: string;                 // stable hash
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
  redactionsApplied?: string[];      // ["ERROR_MESSAGE", "SELECTOR_VALUE"]
  candidate: Candidate;
}
```

### 2.2 Tier Interface Contract

All tiers implement:
```typescript
type runTier = (
  ctx: HealingContext,
  priorAttempts: Set<string>        // candidateIds already tried (no-repeat rule)
) => Promise<TierResult>
```

**Responsibilities:**
1. Check tier availability (inputs present, policy allows)
2. Generate bounded list of Candidates
3. Probe candidates using `candidate-tester.ts` (deterministic)
4. Never re-attempt candidates in `priorAttempts` set
5. Return `TierResult` with explicit skip reason if unavailable
6. Emit "skipped" attempt record if tier unavailable (for audit trail)

### 2.3 Failure Classifier

**Function Signature:**
```typescript
function classifyFailure(error: Error, ctx: SelectorRequest): FailureClass
```

**Deterministic Rules (baseline, always on):**
1. Error type + Playwright error names → category
2. Normalized message patterns (substring matches, not complex regex)
3. HTTP status mapping (≥400 → network4xx)
4. Confidence scoring: 1.0 (definitive) | 0.7 (message-only) | 0.4 (similar) | 0.0 (unknown)

**Optional Configurable Patterns (from healingPolicy):**
- Simple substring patterns only (max 50, max 120 chars each)
- Sorted lexicographically before use (deterministic)
- Used only to refine timeout vs selectorMissing vs elementDetached
- **Never** reclassify assertion/network/environment as healable

**Hard-Stop Rule:**
```typescript
if (category === "assertion" ||
    category === "network4xx" ||
    category === "environment" ||
    category === "testCodeError") {
  return { ...result, healable: false };
}
```

**Timeout Healable Rule:**
```typescript
// Timeout is healable ONLY when "waiting for selector/element state"
if (category === "timeout") {
  const isElementTimeout = error.message.includes("waiting for selector") ||
                           error.message.includes("waiting for element");
  return { ...result, healable: isElementTimeout };
}
```

**Unknown Handling:**
- `healable: false` by default
- Emit WARN with confidence=0.0
- Do not attempt healing unless policy explicitly allows (OFF by default)

**Context Extractor (deterministic):**
Before classification, normalize inputs:
- `errName`, `errMessage` (trimmed, collapsed whitespace)
- `callsite` (runtime wrapper name / step id if available)
- `actionType` (click/fill/navigate/wait)
- `selectorHint` (locator type used, not raw selector)

**Output Processing:**
- `errorFingerprint` uses normalized + redacted message (secrets removed)
- Store `classifierVersion: "1.0.0"` for audit trail

### 2.4 Healing Orchestrator

**Function Signature:**
```typescript
async function healSelector(
  request: SelectorRequest,
  error: Error,
  page: Page
): Promise<HealResult>
```

**Logic Flow:**

**1. Precondition Checks:**
```typescript
// Guard 1: Policy decision must exist
const policyDecisionPath = `runs/${runId}/artifacts/policy-decision.json`;
if (!existsSync(policyDecisionPath) || !canParse(policyDecisionPath)) {
  return { outcome: "skipped", reason: "HEAL_POLICY_PRECONDITION_VIOLATED" };
}

// Guard 2: Contract-awareness not in exit 3 state
if (strategyContext.complianceState === "exit_3") {
  return { outcome: "skipped", reason: "HEAL_COMPLIANCE_INVALID" };
}

// Guard 3: Page still actionable
if (page.isClosed() || contextCrashed()) {
  return { outcome: "skipped", reason: "HEAL_PAGE_NOT_ACTIONABLE" };
}
```

**2. Classification:**
```typescript
const failureClass = classifyFailure(error, request);
if (!failureClass.healable) {
  return { outcome: "skipped", reason: "HEAL_NOT_HEALABLE" };
}
```

**3. Policy Gate:**
```typescript
const policyAllows = checkPolicyAllowsHealing(
  strategyContext.healingPolicy,
  policyDecisionSnapshot
);
if (!policyAllows) {
  return { outcome: "blocked_by_policy", reason: "HEAL_POLICY_BLOCKED" };
}
```

**4. Budget Check:**
```typescript
const currentBudget = budgetTracker.computeRemaining(runId, stepScopeId);
if (currentBudget.step <= 0) {
  return { outcome: "skipped", reason: "HEAL_BUDGET_EXHAUSTED_STEP" };
}
if (currentBudget.run <= 0) {
  return { outcome: "skipped", reason: "HEAL_BUDGET_EXHAUSTED_RUN" };
}
```

**5. Tier Execution (Tier 1 → 2 → 3 → 4 → 5):**
```typescript
const priorAttempts = new Set<string>(); // candidateId dedupe
const allAttempts: AttemptRecord[] = [];

for (const tierName of ["contract", "cache", "lkg", "fallback", "llm"]) {
  const tierResult = await runTier(tierName, healingContext, priorAttempts);

  allAttempts.push(...tierResult.attempts);
  tierResult.attempts.forEach(a => priorAttempts.add(a.candidateId));

  if (tierResult.status === "success") {
    // Stop: found working candidate
    return {
      outcome: "healed",
      outcomeReason: "HEAL_SUCCESS",
      usedTier: tierName,
      selectedCandidate: tierResult.selectedCandidate,
      attempts: allAttempts,
      totalAttempts: allAttempts.length,
      attemptGroupId: computeAttemptGroupId(stepId, failureClass.errorFingerprint)
    };
  }

  // status: "miss" or "skipped" → continue to next tier
}

// All tiers completed without success
return {
  outcome: "not_healed",
  outcomeReason: "HEAL_NO_CANDIDATES",
  attempts: allAttempts,
  totalAttempts: allAttempts.length,
  attemptGroupId: computeAttemptGroupId(stepId, failureClass.errorFingerprint)
};
```

**6. Artifact Writing:**
```typescript
// Write attempt ledger (primary source of truth)
await writeHealingAttemptsLedger(runId, allAttempts);

// Write outcome (derived from attempts)
await writeHealingOutcome(runId, healResult);

// Tier-specific artifacts
if (usedTiers.includes("lkg")) {
  await writeLKGSelection(runId, lkgSelectionData);
}
if (usedTiers.includes("fallback")) {
  await writeTier4ProbePlan(runId, tier4PlanData);
  await writeTier4Result(runId, tier4ResultData);
}
```

**Stop Conditions (deterministic):**
- Tier succeeds (found working candidate) → **stop immediately**
- Budget exhausted (step or run limit) → **skip remaining tiers**
- All tiers completed without success → **return not_healed**
- Page not actionable → **skip all tiers**

---

## 3. Tier Implementation Details

### 3.1 Tier 1: Contract Locator Strategy

**Source:** `strategyContext.selectorPolicy.preferenceOrder` + contract files

**Availability Check:**
```typescript
if (!strategyContext.selectorPolicy) {
  return { status: "skipped", reason: "TIER_UNAVAILABLE", attempts: [skipAttempt] };
}
```

**Candidate Generation:**
1. Read `selectorPolicy.preferenceOrder`: e.g., `["testid", "role", "label", "text", "css"]`
2. Filter by `actionType` compatibility
3. Apply policy allowlist/denylist (e.g., XPath disallowed)
4. Construct candidates with **low risk score** (testid ~0.05, role ~0.15)
5. Cap at maxCandidatesTier1 (e.g., 10)

**Concrete Selector Mapping:**
- Tier 1 should **only** emit candidates that the contract actually defines
- If contract only gives "preferenceOrder" but no concrete selectors → return miss
- Generic CSS like `button` belongs to Tier 4, not Tier 1

**Probing:**
- Use `candidate-tester.ts` with action-aware probe:
  - `click/hover`: ATTACHED_VISIBLE_ENABLED
  - `fill`: ATTACHED_VISIBLE_EDITABLE
  - `select`: ATTACHED_VISIBLE_ENABLED_SELECT

**Artifacts:** Attempts logged to healing-attempts.jsonl

---

### 3.2 Tier 2: Semantic Page Cache

**Source:** `strategyContext.pageCacheBySite` (parsed from `.mcp-cache/pages/*.json`)

**Page Cache Parsing (in `strategy-context.ts`):**
```typescript
// Read all .mcp-cache/pages/*.json files
const cacheFiles = globSync(".mcp-cache/pages/*.json");

// Organize by deterministic siteKey + pageKey
const pageCacheBySite: Record<siteKey, Record<pageKey, PageCacheEntry>> = {};

for (const file of cacheFiles) {
  const entry = JSON.parse(readFileSync(file));
  const siteKey = deriveSiteKey(entry.sourcePath, contract); // deterministic
  const pageKey = entry.pageId; // already in cache file

  if (!pageCacheBySite[siteKey]) {
    pageCacheBySite[siteKey] = {};
  }
  pageCacheBySite[siteKey][pageKey] = entry;
}

// Return updated strategy context
return {
  ...strategyContext,
  pageCacheBySite
};
```

**SiteKey Derivation (deterministic):**
- Derived from `baseURL` in contract or `repo-topology.json`
- **NOT** from runtime browsing (keeps it deterministic)
- Example: `"example.com"` or `"localhost:3000"`

**PageKey Derivation (deterministic):**
- Already present in cache file as `pageId`
- Example: `"frameworks__style3-pom-bdd__src__pages__BasePage"`

**Availability Check:**
```typescript
if (!pageKey) {
  return { status: "skipped", reason: "NO_PAGEKEY", attempts: [skipAttempt] };
}

if (!cache.valid) {
  // Cache hash mismatch already WARN from Phase 2.0
  return { status: "skipped", reason: "CACHE_DISABLED", attempts: [skipAttempt] };
}

const siteKey = deriveSiteKey(pageKey, contract);
if (!pageCacheBySite[siteKey]?.[pageKey]) {
  return { status: "miss", reason: "PAGEKEY_NOT_FOUND_IN_CACHE", attempts: [] };
}
```

**Candidate Generation:**
```typescript
const cacheEntry = pageCacheBySite[siteKey][pageKey];

// Extract candidates with confidence >= threshold (e.g., 0.5)
const candidates = [];

// From stableIds (high confidence)
for (const id of cacheEntry.stableIds) {
  if (isActionCompatible(id, actionType)) {
    candidates.push({
      candidateId: computeId("cache", "testid", `[data-testid="${id}"]`, pageKey),
      tier: "cache",
      locatorType: "testid",
      selector: `[data-testid="${id}"]`,
      riskScore: 0.1,
      confidenceScore: cacheEntry.confidence,
      evidence: { fromCachePage: pageKey }
    });
  }
}

// From roles (high confidence)
for (const role of cacheEntry.roles) {
  if (isActionCompatible(role, actionType)) {
    candidates.push({
      candidateId: computeId("cache", "role", `getByRole('${role}')`, pageKey),
      tier: "cache",
      locatorType: "role",
      selector: `getByRole('${role}')`,
      riskScore: 0.15,
      confidenceScore: cacheEntry.confidence,
      evidence: { fromCachePage: pageKey }
    });
  }
}

// From labels, interactionTargets, etc.
// ... (similar extraction)

// Rank by cache confidence (deterministic)
candidates.sort((a, b) => {
  if (a.confidenceScore !== b.confidenceScore) {
    return b.confidenceScore - a.confidenceScore; // higher first
  }
  return a.candidateId.localeCompare(b.candidateId); // stable tie-break
});

// Cap at maxCandidatesTier2 (e.g., 15)
return candidates.slice(0, maxCandidatesTier2);
```

**Probing:**
- Same deterministic probe as Tier 1
- Record attempts with cache evidence

**Artifacts:** Attempts logged with `{ fromCachePage: pageKey }`

---

### 3.3 Tier 3: Last-Known-Good (LKG)

**Source:** `history/run-index.jsonl` (read-only, append-only history)

**Availability Check:**
```typescript
if (!pageKey) {
  return { status: "skipped", reason: "NO_PAGEKEY", attempts: [skipAttempt] };
}

if (!existsSync("history/run-index.jsonl")) {
  return { status: "skipped", reason: "LKG_UNAVAILABLE", attempts: [skipAttempt] };
}
```

**Bounded History Scan:**
```typescript
const maxHistoryLinesToScan = 50000; // policy cap
const maxHistoryDays = 30;           // policy cap
const cutoffDate = Date.now() - (maxHistoryDays * 24 * 60 * 60 * 1000);

const historyLines = readLinesReverse("history/run-index.jsonl", maxHistoryLinesToScan);
```

**Lookup Key:**
```typescript
const lookupKey = {
  pageKey,
  actionType,
  framework: contract.framework,
  primaryStyle: contract.primaryStyle
};
```

**Selection Rule (deterministic):**
```typescript
let selectedRecord: HistoryRecord | null = null;

for (const line of historyLines) {
  const record = JSON.parse(line);

  // Filter by lookup key
  if (record.pageKey !== lookupKey.pageKey) continue;
  if (record.actionType !== lookupKey.actionType) continue;

  // Cross-framework poison guard
  if (record.framework !== lookupKey.framework) {
    skippedRecords.push({ recordHash: record.recordHash, skipReason: "CROSS_FRAMEWORK_MISMATCH" });
    continue;
  }

  // Must be successful and have selector
  if (!record.success || !record.candidate) continue;

  // Must be policy-allowed (e.g., XPath disallowed)
  if (!isPolicyAllowed(record.candidate.locatorType, selectorPolicy)) {
    skippedRecords.push({ recordHash: record.recordHash, skipReason: "POLICY_DISALLOWED" });
    continue;
  }

  // Found a match
  selectedRecord = record;
  break;
}

if (!selectedRecord) {
  return { status: "miss", attempts: [], reason: "NO_LKG_FOUND" };
}
```

**Tie-Breakers (if multiple records match):**
1. Higher `confidence_delta` (or stored confidence)
2. Higher tier trust: contract > cache > lkg > fallback > llm
3. Lexical `candidateId`

**Candidate Generation:**
```typescript
const candidate: Candidate = {
  candidateId: selectedRecord.candidate.candidateId,
  tier: "lkg",
  locatorType: selectedRecord.candidate.locatorType,
  selector: selectedRecord.candidate.normalizedSelector,
  riskScore: selectedRecord.candidate.riskScore,
  confidenceScore: selectedRecord.confidence,
  evidence: { fromHistoryRun: selectedRecord.runId }
};
```

**Probing:**
- Same deterministic probe
- Record attempt with LKG evidence

**Artifacts:**

**lkg-selection.json:**
```json
{
  "schema_version": "1.0.0",
  "lookupKey": { "pageKey": "...", "actionType": "click" },
  "framework": "playwright",
  "primaryStyle": "bdd",
  "selectedCandidateId": "cache_role_button_...",
  "sourceRecord": {
    "recordHash": "sha256(...)",
    "lineNumber": 12345
  },
  "skippedRecords": [
    { "recordHash": "sha256(...)", "skipReason": "POLICY_DISALLOWED" },
    { "recordHash": "sha256(...)", "skipReason": "CROSS_FRAMEWORK_MISMATCH" }
  ],
  "historyScanned": { "lines": 50000, "days": 30 }
}
```

**run-index.jsonl Record Shape (locked for Phase 5):**
```jsonl
{
  "runId": "phase3-test-run",
  "timestamp": "2026-03-04T10:30:00Z",
  "pageKey": "frameworks__style3-pom-bdd__src__pages__LoginPage",
  "actionType": "click",
  "outcome": "pass",
  "success": true,
  "tierUsed": "contract",
  "candidate": {
    "candidateId": "contract_testid_login-btn_abc123",
    "locatorType": "testid",
    "normalizedSelector": "[data-testid='login-btn']",
    "riskScore": 0.05
  },
  "confidence": 0.95,
  "policySnapshot": "sha256(...)",
  "recordHash": "sha256(...)",
  "framework": "playwright",
  "primaryStyle": "bdd"
}
```

---

### 3.4 Tier 4: Deterministic Fallback

**Source:** Algorithmic, action-aware candidate generation

**Eligibility Gate:**
```typescript
// Check failure is healable
if (!failureClass.healable) {
  return { status: "skipped", reason: "NOT_HEALABLE", attempts: [skipAttempt] };
}

// Check page actionable
if (page.isClosed() || contextCrashed()) {
  return { status: "skipped", reason: "PAGE_NOT_ACTIONABLE", attempts: [skipAttempt] };
}

// Check budget allows
if (budgetRemaining.step <= 0) {
  return { status: "skipped", reason: "BUDGET_EXHAUSTED", attempts: [skipAttempt] };
}
```

**Action-Compatible Probes (deterministic):**

**click/hover:**
```typescript
const probes = [
  "getByRole('button')",
  "getByRole('link')",
  "button",
  "a",
  "[role='button']",
  "[role='link']"
];

// Add XPath only if policy allows
if (selectorPolicy.allowedLocatorTypes.includes("xpath")) {
  probes.push("//button", "//a");
}
```

**fill:**
```typescript
const probes = [
  "getByRole('textbox')",
  "input",
  "textarea",
  "[contenteditable='true']"
];
```

**select:**
```typescript
const probes = [
  "select",
  "[role='combobox']"
];
```

**Candidate Generation Algorithm:**
```typescript
const candidates: Candidate[] = [];

for (const probe of probes) {
  if (candidates.length >= maxProbesTier4) break; // e.g., 6 probes

  // Query page for elements matching probe
  const elements = await page.locator(probe).all();

  for (const element of elements) {
    if (candidates.length >= maxCandidatesTier4) break; // e.g., 20 candidates

    // Filter: visible + enabled (deterministic checks)
    const isVisible = await element.isVisible();
    const isEnabled = await element.isEnabled();
    if (!isVisible || !isEnabled) continue;

    // Filter: action-compatible
    if (actionType === "fill") {
      const isEditable = await element.isEditable();
      if (!isEditable) continue;
    }

    // Apply target hints (if available)
    if (expectedNameHint) {
      const accessibleName = await element.getAttribute("aria-label") || await element.textContent();
      if (!matchesNameLadder(accessibleName, expectedNameHint)) continue;
    }

    // Synthesize selector using deterministic utility
    const selector = synthesizeSelector(element, probe, selectorPolicy);

    // Build candidate
    const candidate: Candidate = {
      candidateId: computeId("fallback", deriveLocatorType(probe), selector, pageKey),
      tier: "fallback",
      locatorType: deriveLocatorType(probe),
      selector: normalizeSelector(selector),
      riskScore: computeRiskScore(deriveLocatorType(probe)), // role: 0.3, css: 0.6, xpath: 0.9
      confidenceScore: 0.5, // moderate
      evidence: {}
    };

    candidates.push(candidate);
  }
}

// Rank candidates (deterministic)
candidates.sort((a, b) => {
  // 1. Locator type trust: role > native > aria-role CSS > xpath
  const trustA = getLocatorTrust(a.locatorType);
  const trustB = getLocatorTrust(b.locatorType);
  if (trustA !== trustB) return trustB - trustA; // higher first

  // 2. Name match ladder score (if expectedNameHint present)
  if (expectedNameHint) {
    const scoreA = getNameMatchScore(a, expectedNameHint);
    const scoreB = getNameMatchScore(b, expectedNameHint);
    if (scoreA !== scoreB) return scoreB - scoreA;
  }

  // 3. DOM depth (optional, deterministic)
  // const depthA = computeDepth(a);
  // const depthB = computeDepth(b);
  // if (depthA !== depthB) return depthA - depthB; // shallower first

  // 4. Tie-break: candidateId
  return a.candidateId.localeCompare(b.candidateId);
});

return candidates;
```

**Name-Match Ladder (deterministic):**
```typescript
function getNameMatchScore(candidate: Candidate, expectedName: string): number {
  const actualName = extractAccessibleName(candidate);

  // 1. Exact (case-sensitive)
  if (actualName === expectedName) return 1.0;

  // 2. Exact (case-insensitive)
  if (actualName.toLowerCase() === expectedName.toLowerCase()) return 0.7;

  // 3. Substring (case-insensitive)
  if (actualName.toLowerCase().includes(expectedName.toLowerCase())) return 0.4;

  return 0.0;
}
```

**Selector Synthesis Utility (shared, policy-gated):**
```typescript
function synthesizeSelector(
  element: Element,
  probe: string,
  selectorPolicy: SelectorPolicy
): string {
  // Precedence (deterministic, policy-gated):

  // 1. testid/data-qa/data-cy (if present)
  const testId = element.getAttribute("data-testid") ||
                 element.getAttribute("data-qa") ||
                 element.getAttribute("data-cy");
  if (testId && !isVolatileValue(testId)) {
    return `[data-testid="${testId}"]`;
  }

  // 2. role + name (when name available)
  const role = element.getAttribute("role");
  const ariaLabel = element.getAttribute("aria-label");
  if (role && ariaLabel && !isVolatileValue(ariaLabel)) {
    return `getByRole('${role}', { name: '${ariaLabel}' })`;
  }

  // 3. label / aria-label
  if (ariaLabel && !isVolatileValue(ariaLabel)) {
    return `[aria-label="${ariaLabel}"]`;
  }

  // 4. stable attribute CSS
  const stableAttrs = ["name", "id", "class"];
  for (const attr of stableAttrs) {
    const value = element.getAttribute(attr);
    if (value && !isVolatileValue(value) && selectorPolicy.allowedLocatorTypes.includes("css")) {
      return `[${attr}="${value}"]`;
    }
  }

  // 5. structural selector (only if policy allows + strict caps)
  if (selectorPolicy.allowStructural && selectorPolicy.maxStructuralDepth) {
    return generateStructuralSelector(element, selectorPolicy.maxStructuralDepth);
  }

  // Fallback: use probe as-is
  return probe;
}

// Volatile value filter (prevent UUID-like IDs)
function isVolatileValue(value: string): boolean {
  // UUID pattern: 8-4-4-4-12 hex chars
  const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
  if (uuidPattern.test(value)) return true;

  // Random ID pattern: contains long hex/base64-like strings
  const randomPattern = /[a-z0-9]{16,}/i;
  if (randomPattern.test(value)) return true;

  return false;
}
```

**Probing:**
- `perCandidateProbeTimeoutMs` from policy
- Use action-aware probe method
- Stop conditions:
  - Success (one candidate works)
  - `maxCandidatesTier4` reached
  - `maxProbesTier4` reached
  - Step/run budget exhausted

**Artifacts:**

**tier4-probe-plan.json:**
```json
{
  "schema_version": "1.0.0",
  "tier4AlgorithmVersion": "1.0.0",
  "actionType": "click",
  "allowedLocatorTypes": ["role", "css", "xpath"],
  "probeList": [
    "getByRole('button')",
    "getByRole('link')",
    "button",
    "a",
    "[role='button']",
    "//button"
  ],
  "caps": {
    "maxCandidates": 20,
    "maxProbes": 6,
    "perCandidateTimeoutMs": 3000
  }
}
```

**tier4-result.json:**
```json
{
  "schema_version": "1.0.0",
  "attemptedCandidatesCount": 12,
  "probesUsed": 4,
  "selectedCandidateId": "fallback_role_button_abc123",
  "stopReason": "SUCCESS"
}
```

**Safety Guardrails:**
- **No-repeat across tiers**: candidateIds in `priorAttempts` never probed again
- **Action-compatible filter**: Only editable for fill, only clickable for click
- **Strict-mode violation**: Treat as `selectorMissing` or fail Tier 4 early
- **Multi-match handling**: Use `.first()` only if policy allows (default: yes)
- **Multi-frame/shadow DOM**: Main frame only by default; future: policy-gated with deterministic frame selection

---

### 3.5 Tier 5: LLM (Phase 5 Stub)

**Status:** Stub implementation for Phase 3, full implementation in Phase 5

**Implementation:**
```typescript
async function runTier5(ctx: HealingContext, priorAttempts: Set<string>): Promise<TierResult> {
  return {
    status: "skipped",
    reason: "LLM_TIER_DEFERRED_TO_PHASE5",
    attempts: [{
      ...baseAttempt,
      tier: "llm",
      result: "skipped",
      skipReason: "LLM_TIER_DEFERRED_TO_PHASE5"
    }]
  };
}
```

**Future (Phase 5):**
- LLM returns ranked suggestions with risk scores
- Runtime validates candidates against policy (e.g., disallow XPath unless allowed)
- AI outputs written to run-local artifacts only (redacted)
- **LLM NEVER mutates contracts, cache, or writes to shared stores**
- AI tier remains advisory only (governance decides pass/fail)

---

## 4. Artifacts Specification

All artifacts follow PLATINUM principles:
- **Canonical JSON** (recursively sorted keys)
- **schema_version + writerVersion** (backward compatibility)
- **Deterministic redaction** (SKIP/HASH/PROCESS style)
- **No timestamps** (except history/run-index.jsonl which is inherently time-based)
- **Cross-links** (attemptIds[], ledgerPath) for easy RCA

### 4.1 Schema + Writer Versioning Rules

**Reader Compatibility:**
- Must accept N and N-1 schema versions
- If schema is older than N-1:
  - COMPLIANCE mode → ERROR → exit 3
  - BEST_EFFORT mode → WARN

**Writer Version:**
- Incremented when writer logic changes
- Used for audit trail and debugging
- Example: `"3.0.0"` for Phase 3

### 4.2 Artifact Reduction Contract

**Single Run-Level Reduction Job:**
```typescript
// Runs once at end of run (or after each step if desired)
function reduceHealingArtifacts(runId: string): void {
  // Pure reduction from healing-attempts.jsonl
  const attempts = readHealingAttemptsLedger(runId);

  // Generate healing-summary.json
  const summary = {
    schema_version: "1.0.0",
    writerVersion: "3.0.0",
    runId,
    totalAttempts: attempts.length,
    successCount: attempts.filter(a => a.result === "success").length,
    tierUsageCounts: computeTierUsage(attempts),
    topFailureCategories: computeTopFailures(attempts),
    cacheUsed: attempts.some(a => a.tier === "cache"),
    cacheHitRate: computeCacheHitRate(attempts)
  };

  writeCanonicalJSON(`runs/${runId}/artifacts/runtime/healing-summary.json`, summary);
}

// Invariant: reduceHealingArtifacts NEVER reads Playwright state
// Invariant: ledger is the ONLY source of truth
```

### 4.3 Artifact Specifications

#### **healing-attempts.jsonl** (Primary Source of Truth)

**Path:** `runs/<runId>/artifacts/runtime/healing-attempts.jsonl`

**Format:** JSONL (one attempt per line)

**Record Schema:** (see Section 2.1 AttemptRecord)

**Invariants:**
- Append-only (never modify existing lines)
- Canonical JSON per line (sorted keys)
- Redaction applied before writing (errorMessage, selector values)
- No nondeterministic fields (no timestamps, no random IDs)

---

#### **healing-outcome.json** (Governance Summary)

**Path:** `runs/<runId>/artifacts/runtime/healing-outcome.json`

**Schema:**
```json
{
  "schema_version": "1.0.0",
  "writerVersion": "3.0.0",
  "runId": "...",
  "stepId": "...",
  "attemptGroupId": "sha256(...)",
  "outcome": "healed",
  "outcomeReason": "HEAL_SUCCESS",
  "usedTier": "contract",
  "selectedCandidateId": "contract_testid_login-btn_abc123",
  "totalAttempts": 3,
  "failureFingerprint": "sha256(...)",
  "policyAllowed": true,
  "budgetStatus": { "step": 0, "run": 7 },
  "attemptIds": ["attempt_001", "attempt_002", "attempt_003"],
  "ledgerPath": "artifacts/runtime/healing-attempts.jsonl"
}
```

**Reduction Rule:** Derived from last attempt + aggregate counts from ledger

---

#### **healing-summary.json** (Run-Level Summary)

**Path:** `runs/<runId>/artifacts/runtime/healing-summary.json`

**Schema:**
```json
{
  "schema_version": "1.0.0",
  "writerVersion": "3.0.0",
  "runId": "...",
  "totalAttempts": 42,
  "successCount": 38,
  "tierUsageCounts": {
    "contract": 25,
    "cache": 8,
    "lkg": 5,
    "fallback": 4,
    "llm": 0
  },
  "topFailureCategories": [
    { "category": "selectorMissing", "count": 3 },
    { "category": "timeout", "count": 1 }
  ],
  "cacheUsed": true,
  "cacheHitRate": 0.19,
  "ledgerPath": "artifacts/runtime/healing-attempts.jsonl"
}
```

**Reduction Rule:** Aggregate of all healing-attempts.jsonl for this runId

---

#### **lkg-selection.json** (Tier 3 Audit)

**Path:** `runs/<runId>/artifacts/runtime/lkg-selection.json`

**Schema:** (see Section 3.3)

---

#### **tier4-probe-plan.json** (Tier 4 Audit)

**Path:** `runs/<runId>/artifacts/runtime/tier4-probe-plan.json`

**Schema:** (see Section 3.4)

---

#### **tier4-result.json** (Tier 4 Outcome)

**Path:** `runs/<runId>/artifacts/runtime/tier4-result.json`

**Schema:** (see Section 3.4)

---

## 5. Testing Strategy

### 5.1 Test Pyramid

**Unit Tests (60%):**
- Pure functions: normalizer, classifier, candidate synthesizer
- Tier logic: isolated tier implementations
- Redaction rules
- Budget calculations
- Fingerprint generation

**Integration Tests (30%):**
- Tier coordination (orchestrator)
- Budget enforcement across tiers
- No-repeat dedupe
- Policy gate enforcement
- Artifact writing + reduction

**End-to-End Tests (10%):**
- Full healing flow with real Playwright pages (local static HTML, no network)
- Byte-identical artifact validation
- Performance benchmarks

### 5.2 Mandatory Acceptance Tests

**Test 1: Tier Order Never Violated**
```typescript
test("healing respects tier order: Contract → Cache → LKG → Fallback", async () => {
  // Mock all tiers to return "miss"
  // Verify attempts logged in correct order with no skips upward
  const attempts = readHealingAttemptsLedger(runId);
  const tierOrder = attempts.map(a => a.tier);
  expect(tierOrder).toEqual(["contract", "contract", "cache", "cache", "lkg", "fallback"]);
});
```

**Test 2: Non-Healable Fast Fail**
```typescript
test("assertion/network/environment errors never trigger healing", async () => {
  const testCases = [
    { error: new Error("expect(x).toBe(y) failed"), category: "assertion" },
    { error: new Error("HTTP 404 Not Found"), category: "network4xx" },
    { error: new Error("ECONNREFUSED"), category: "environment" }
  ];

  for (const { error, category } of testCases) {
    const result = classifyFailure(error, ctx);
    expect(result.healable).toBe(false);
    expect(result.category).toBe(category);

    const healResult = await healSelector(request, error, page);
    expect(healResult.outcome).toBe("skipped");
  }
});
```

**Test 3: Budget Enforced Deterministically**
```typescript
test("healing stops after maxAttemptsPerStep reached", async () => {
  // Set budget: maxAttemptsPerStep = 2
  const budgets = { maxAttemptsPerStep: 2, maxAttemptsPerRun: 10, perCandidateProbeTimeoutMs: 3000 };

  // Trigger 3 failures in same stepScopeId
  const error = new Error("locator timeout");

  await healSelector(request, error, page); // Attempt 1
  await healSelector(request, error, page); // Attempt 2
  const result3 = await healSelector(request, error, page); // Attempt 3 (should skip)

  expect(result3.outcome).toBe("skipped");
  expect(result3.outcomeReason).toBe("HEAL_BUDGET_EXHAUSTED_STEP");
});
```

**Test 4: Policy-Decision Precondition**
```typescript
test("healing blocked if policy-decision.json not written", async () => {
  // Delete runs/<runId>/artifacts/policy-decision.json
  unlinkSync(`runs/${runId}/artifacts/policy-decision.json`);

  // Trigger healable failure
  const error = new Error("locator timeout");
  const result = await healSelector(request, error, page);

  expect(result.outcome).toBe("skipped");
  expect(result.outcomeReason).toBe("HEAL_POLICY_PRECONDITION_VIOLATED");
});
```

**Test 5: Byte-Identical Artifacts (Determinism)**
```typescript
test("same inputs produce byte-identical artifacts", async () => {
  // Run 1
  const result1 = await healSelector(request, error, page);
  const artifact1 = readFileSync(`runs/${runId}/artifacts/runtime/healing-outcome.json`, "utf8");

  // Reset state
  unlinkSync(`runs/${runId}/artifacts/runtime/healing-outcome.json`);
  unlinkSync(`runs/${runId}/artifacts/runtime/healing-attempts.jsonl`);

  // Run 2 (identical inputs)
  const result2 = await healSelector(request, error, page);
  const artifact2 = readFileSync(`runs/${runId}/artifacts/runtime/healing-outcome.json`, "utf8");

  // Byte-identical
  expect(artifact1).toBe(artifact2);
});
```

**Test 6: CI Contract Test (Byte-Identical Output)**
```typescript
test("CI contract test: byte-identical output on fixture", async () => {
  // Use deterministic fixture: local static HTML, fixed selectors, no network
  const fixturePage = await loadFixture("test-page.html");

  // Run healing twice
  const run1 = await healSelector(request, error, fixturePage);
  const artifact1Raw = readFileSync("healing-outcome.json", "binary");

  unlinkSync("healing-outcome.json");

  const run2 = await healSelector(request, error, fixturePage);
  const artifact2Raw = readFileSync("healing-outcome.json", "binary");

  // Compare raw bytes
  expect(artifact1Raw).toEqual(artifact2Raw);
});
```

**Test 7: E2E Determinism (Local Static HTML)**
```typescript
test("E2E healing flow with local static HTML (deterministic)", async () => {
  // Local static HTML fixture (no network)
  const page = await browser.newPage();
  await page.goto("file:///path/to/fixture.html");

  // Fixed timeout from policy
  const budgets = { perCandidateProbeTimeoutMs: 3000, ... };

  // Trigger healing
  const error = new Error("locator timeout waiting for selector");
  const result = await healSelector(request, error, page);

  expect(result.outcome).toBe("healed");
  expect(result.usedTier).toBe("contract");

  // Verify artifacts written
  expect(existsSync("healing-attempts.jsonl")).toBe(true);
  expect(existsSync("healing-outcome.json")).toBe(true);
});
```

### 5.3 Test Data Fixtures

**Deterministic Test Fixtures:**
- Local static HTML files (no external resources)
- Fixed contract bundles (`.mcp-contract/`)
- Fixed page cache (`.mcp-cache/pages/`)
- Fixed history (prepopulated `history/run-index.jsonl`)
- Fixed policies (deterministic budgets, timeouts)

**No Network Dependencies:**
- All E2E tests use local HTML fixtures
- No external APIs, CDNs, or remote resources
- No timing-dependent assertions

---

## 6. Implementation Phases

### Phase 3.1: Foundation + Tier 1 (Contract)

**Duration:** 2-3 days

**Definition of Done:**
- ✅ FailureClassifier integrated into runtime error pipeline
- ✅ Healing orchestrator skeleton with precondition guards
- ✅ `policyDecisionWritten === true` enforced by code guard
- ✅ `contractAwarenessExitState !== 3` enforced
- ✅ Tier 1 (Contract) functional
- ✅ `PageAdapter` interface for unit testing
- ✅ Attempt ledger writes to `healing-attempts.jsonl`
- ✅ Budget tracker (pure reduction from artifacts)
- ✅ Tests: Non-healable fast fail, policy precondition, tier 1 logic
- ✅ Schemas: failure-class.schema.json, healing-attempt.schema.json

**Artifacts:**
- healing-attempts.jsonl
- healing-outcome.json

**Acceptance Criteria:**
- Test 2 (Non-healable fast fail) passes
- Test 4 (Policy precondition) passes
- Tier 1 probes contract candidates successfully
- Budget tracker reconstructible from ledger

---

### Phase 3.2: Tier 2 (Cache) + Page Cache Parsing

**Duration:** 2-3 days

**Definition of Done:**
- ✅ `strategy-context.ts` parses `.mcp-cache/pages/*.json` → `pageCacheBySite`
- ✅ Deterministic `siteKey` + `pageKey` derivation
- ✅ Tier 2 (Cache) functional with cache evidence
- ✅ Cache mismatch → Tier 2 skipped (WARN already from Phase 2.0)
- ✅ Tests: Cache hit/miss, NO_PAGEKEY handling, cache indexing
- ✅ `candidate-synthesizer.ts` shared utility (policy-gated)

**Artifacts:**
- (existing) + cache evidence in attempts

**Acceptance Criteria:**
- Tier 2 queries `pageCacheBySite[siteKey][pageKey]` successfully
- Cache disabled → explicit "skipped" attempt logged
- NO_PAGEKEY → explicit "skipped" attempt logged
- Selector synthesis utility used by Tier 2

---

### Phase 3.3: Tier 3 (LKG from History)

**Duration:** 2-3 days

**Definition of Done:**
- ✅ LKG derived from `history/run-index.jsonl` with bounded scan
- ✅ Cross-framework poison guard (match framework + style)
- ✅ `lkg-selection.json` artifact with source record pointers
- ✅ Deterministic selection rule with tie-breakers
- ✅ Tests: LKG hit/miss, policy-disallowed skip, bounded scan limit, cross-framework guard

**Artifacts:**
- lkg-selection.json

**Acceptance Criteria:**
- LKG scans max 50k lines or 30 days (policy caps)
- Cross-framework records skipped with reason
- Policy-disallowed locators skipped with reason
- Source record pointer uses `recordHash` (stable)

---

### Phase 3.4: Tier 4 (Deterministic Fallback)

**Duration:** 2-3 days

**Definition of Done:**
- ✅ Eligibility gate (healable + page actionable + budget)
- ✅ Action-aware probe generation with caps
- ✅ Selector synthesis utility used (shared with Tier 2)
- ✅ Name-match ladder (exact CS → CI → substring)
- ✅ Volatile value filter (UUID/random ID blocking)
- ✅ `tier4-probe-plan.json` + `tier4-result.json` artifacts
- ✅ No-repeat across tiers enforced (candidateId dedupe in orchestrator)
- ✅ Tests: Tier 4 generation, caps enforced, ambiguous match handling, action-compatible filter
- ✅ Deterministic ranking key (locatorType trust + name match + candidateId)

**Artifacts:**
- tier4-probe-plan.json
- tier4-result.json

**Acceptance Criteria:**
- Tier 4 never attempts candidateIds from prior tiers
- MaxCandidates (20) and maxProbes (6) enforced
- Action-compatible filter prevents fill on non-editable targets
- Ambiguous match (>N matches) logged with reason
- Volatile IDs (UUIDs) never used in selectors

---

### Phase 3.5: Integration + Summary Artifacts

**Duration:** 2-3 days

**Definition of Done:**
- ✅ Budget enforcement across step + run
- ✅ `healing-summary.json` artifact (run-level)
- ✅ Step scope boundary rules enforced (dedupe within stepScopeId)
- ✅ Artifact cross-links (attemptIds[], ledgerPath) in all per-step artifacts
- ✅ Integration tests: tier order, budget, full flow, byte-identical output
- ✅ End-to-end test with local static HTML (deterministic)
- ✅ CI contract test for byte-identical output
- ✅ All schemas defined and validated in CI
- ✅ Reduction job contract: `reduceHealingArtifacts(runId)` pure function

**Artifacts:**
- healing-summary.json
- All schemas: failure-class.schema.json, healing-attempt.schema.json, healing-outcome.schema.json, healing-summary.schema.json

**Acceptance Criteria:**
- Test 1 (Tier order) passes
- Test 3 (Budget) passes
- Test 5 (Byte-identical) passes
- Test 6 (CI contract test) passes
- Test 7 (E2E determinism) passes
- All schemas validate in CI
- Budget tracker reconstructs from ledger only (no in-memory state)
- healing-summary.json is pure reduction of healing-attempts.jsonl

---

**Total Duration:** 10-15 days (2 weeks)

---

## 7. Non-Negotiable Rules

### 7.1 Determinism

1. **No network calls** (healing engine is local-only)
2. **No timestamps in artifacts** (except history/run-index.jsonl which is inherently time-based)
3. **No random IDs or nonces** (all IDs are stable hashes)
4. **Canonical JSON** (recursively sorted keys) for all artifacts
5. **Deterministic iteration order** (sort all lists before processing)
6. **Byte-identical outputs** for same inputs (CI test enforced)

### 7.2 Authority Boundaries

1. **Read-only:**
   - `.mcp-contract/*` (contracts)
   - `.mcp-cache/*` (page cache)
   - `history/run-index.jsonl` (history)

2. **Write-only:**
   - `runs/<runId>/artifacts/runtime/*` (healing artifacts)
   - Never write to contracts, cache, or history

3. **Precondition:**
   - `policy-decision.json` must exist and parse before healing

### 7.3 Governance

1. **LLM NEVER:**
   - Overrides governance policy
   - Mutates contracts or cache
   - Writes to shared stores
   - Claims authority

2. **Healing NEVER:**
   - Runs if contract-awareness ended in exit 3 (compliance invalid)
   - Runs if policy blocks it (`policyAllowsHealing === false`)
   - Exceeds budgets (step or run limits)

3. **Classification NEVER:**
   - Marks assertion/network/environment as healable
   - Uses nondeterministic patterns

### 7.4 Audit Trail

1. **All attempts logged** (success, fail, skipped)
2. **Single source of truth:** healing-attempts.jsonl
3. **All other artifacts are reductions** of the ledger
4. **Cross-links** for easy RCA (attemptIds[], ledgerPath)
5. **Error codes** are enums (not free strings)

### 7.5 Testing

1. **Mandatory acceptance tests** must pass before merge
2. **CI contract test** enforces byte-identical output
3. **E2E tests** use local static HTML (no network)
4. **No flaky tests** (fixed timeouts, deterministic fixtures)

---

## 8. Success Criteria

### 8.1 Functional

- ✅ All 5 tiers functional (Tier 5 stubbed for Phase 5)
- ✅ Tier order respected (Contract → Cache → LKG → Fallback → LLM)
- ✅ Non-healable failures fast fail
- ✅ Budget enforcement prevents runaway healing
- ✅ Policy-decision precondition enforced

### 8.2 Quality

- ✅ All mandatory acceptance tests pass
- ✅ Byte-identical output validated (CI test)
- ✅ No network dependencies in core logic
- ✅ All artifacts schema-validated

### 8.3 Audit & Governance

- ✅ Single source of truth (healing-attempts.jsonl)
- ✅ All decisions traceable (error codes, tier reasons, evidence)
- ✅ LLM tier remains advisory (stub for Phase 3)
- ✅ Authority boundaries enforced (read-only for contracts/cache/history)

### 8.4 Performance

- ✅ Healing adds <100ms overhead per failure (deterministic probe timeouts)
- ✅ Budget caps prevent runaway (max 2 attempts/step, 10/run)
- ✅ Page cache parsing <50ms (cached in strategy context)

### 8.5 Phase 5 Readiness

- ✅ Tier 5 (LLM) stub in place
- ✅ Attempt ledger format stable (can be consumed by learning loop)
- ✅ Candidate evidence tracked (for Phase 5 confidence scoring)
- ✅ run-index.jsonl record shape locked (for Phase 5 learning)

---

## Appendix A: Risk Mitigation

### Risk 1: Healing Creates Infinite Loops

**Mitigation:**
- Budget caps (maxAttemptsPerStep, maxAttemptsPerRun)
- `attemptGroupId` prevents retrying same failure repeatedly
- No-repeat rule (candidateId dedupe across tiers)
- `stepScopeId` prevents mixing attempts across steps

### Risk 2: Nondeterministic Artifact Outputs

**Mitigation:**
- Canonical JSON (sorted keys)
- No timestamps in core artifacts
- Deterministic iteration order (sort before process)
- CI contract test enforces byte-identical output

### Risk 3: Cross-Framework Poisoning

**Mitigation:**
- LKG tier matches framework + primaryStyle
- Tier 2 cache organized by deterministic siteKey
- Tier 1 uses contract-specific selectors only

### Risk 4: Selector Drift (Volatile IDs)

**Mitigation:**
- Volatile value filter (UUID/random ID blocking)
- Selector synthesis utility enforces stable attributes only
- Policy-gated locator types (disallow XPath if too risky)

### Risk 5: Budget Tracker State Inconsistency

**Mitigation:**
- Budget tracker is pure reduction from healing-attempts.jsonl
- No in-memory counters as authority
- Always reconstructible from artifacts

### Risk 6: Page Not Actionable (Crashed/Closed)

**Mitigation:**
- Explicit "page actionable" guard before healing
- Tier 4 eligibility gate checks `page.isClosed()`
- Orchestrator precondition checks context not crashed

---

## Appendix B: Future Enhancements (Out of Scope for Phase 3)

### Phase 5: Runtime Learning Loop

- Tier 5 (LLM) full implementation
- Confidence scoring updates
- Learning from successful/failed healing attempts
- Append to `history/run-index.jsonl` with confidence deltas

### Phase 6: Enterprise Layer

- CLI commands: `mindtrace phase0`, `mindtrace phase1`, `mindtrace validate`
- Dashboard integration (consume healing artifacts)
- Cross-repo comparison

### Post-Phase 3 Optimizations

- Multi-frame / shadow DOM support (policy-gated)
- Structural selector generation (policy-gated, strict caps)
- Advanced name matching (fuzzy, phonetic) if needed

---

**End of Design Document**
