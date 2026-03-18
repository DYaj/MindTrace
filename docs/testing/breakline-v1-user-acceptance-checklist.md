# BreakLine V1 — User Acceptance Checklist

## Purpose

Validate that BreakLine is usable, understandable, and correct without guidance, while preserving deterministic system guarantees.

## Usage

Run this checklist:

- **Before moving to a new major stage** (e.g., Stage 4)
- **After significant UX or architecture changes**
- **With a user who has no prior context** (recommended)

**Do NOT explain the system before testing.**
Observe behavior and confusion points.

---

## Test Mode

- No prior explanation to tester
- Tester should rely only on UI
- Observe hesitation, confusion, and incorrect assumptions

---

## 1. First-Time User Flow (Cold Start)

### Setup

Ensure:
- `.mcp-contract/` does NOT exist
- `.mcp-cache/` does NOT exist

### Steps

1. Open BreakLine UI
2. Land on System page

### Expected UX

- Clear indication that system is not initialized
- Visible onboarding guidance:
  - Step 1: Generate Contract
  - Step 2: Build Cache
  - Step 3: Run Tests

### Pass Criteria

- User understands what to do within 5 seconds
- User correctly identifies Generate Contract as first step

### Fail Signals

- User asks "Is this broken?"
- User clicks random pages/buttons
- User does not know where to start

---

## 2. Contract Generation Flow

### Steps

1. Navigate to Contract page
2. Click Generate Contract

### Expected UX

- Button enters loading state
- Message: "This may take a few seconds…"
- On completion:
  - Contract data appears
  - No page refresh confusion

### Pass Criteria

- User understands action is in progress
- User understands when it completes
- Contract presence is clearly visible

### Fail Signals

- User clicks multiple times
- User thinks nothing is happening
- User unsure if action succeeded

---

## 3. Cache Build Flow

### Setup

Contract must exist

### Steps

1. Navigate to Cache page
2. Click Build Cache

### Expected UX

- **If contract missing:**
  - Button disabled OR guidance shown
- **If contract present:**
  - Button runs job
  - Loading + reassurance message
  - Cache results visible after completion

### Pass Criteria

- User understands dependency on contract
- User sees successful cache creation
- No confusion about what cache is doing

### Fail Signals

- User tries to build cache before contract
- User does not understand why action fails
- User cannot tell if cache was built

---

## 4. Run Tests Flow (Happy Path)

### Setup

- Contract exists
- Cache exists (optional but recommended)

### Steps

1. Navigate to Runs page
2. Click Run Tests

### Expected UX

- Job starts visibly
- Loading / running indicator shown
- On completion:
  - Run appears in table
  - Pass/fail summary visible

### Pass Criteria

- User understands test execution lifecycle
- User can identify result without digging

### Fail Signals

- User unsure if tests started
- User unsure where results appear
- User confused by run table

---

## 5. Failure Handling

### Scenarios

- Contract generation fails
- Cache build fails
- Test run fails

### Expected UX

Clear, human-readable error message:
- No stack traces
- No silent failures

### Pass Criteria

User can answer:
- "What failed?"
- "Why did it fail?"

### Fail Signals

- Generic error messages
- Missing error feedback
- Technical noise without meaning

---

## 6. Drift Scenario (Critical)

### Setup

1. Generate contract
2. Build cache
3. Modify repository (simulate drift)

### Steps

1. Navigate to Integrity page

### Expected UX

- Drift detected
- Clear explanation:
  - "Cache no longer matches current contract"
  - "Rebuild cache"

### Pass Criteria

User understands:
- What drift means
- What action to take

### Fail Signals

- User does not understand drift
- User does not know how to fix it

---

## 7. Multi-Run Behavior

### Steps

1. Execute multiple test runs
2. Observe Runs page

### Expected UX

- Runs listed clearly
- Latest run identifiable
- Pass/fail summary visible

### Pass Criteria

- User can quickly scan results
- User can identify latest run

### Fail Signals

- Runs look identical/confusing
- No visual hierarchy
- Hard to interpret results

---

## 8. UX Clarity Validation (Meta Check)

### Ask Tester After Use:

1. What does BreakLine do?
2. What is a "contract"?
3. What is "cache"?
4. What does "drift" mean?
5. What should you do first in a new repo?

### Pass Criteria

- Answers are approximately correct
- No internal terminology confusion

### Fail Signals

- Misunderstanding core concepts
- Inability to describe workflow

---

## 9. Architectural Integrity Check (Non-UI)

### Verify:

UI does NOT:
- write to filesystem
- compute drift
- recompute integrity logic

Backend remains:
- single authority for execution
- single source of truth for integrity

### Pass Criteria

Authority chain preserved:
```
Producer → Artifacts → Gates → API → UI
```

### Fail Signals

- UI deriving new "truth"
- Duplicate logic outside integrity-gates

---

## Final Acceptance Criteria

**BreakLine V1 is accepted if:**

A new user can complete:
- contract generation
- cache build
- test run

**Without external explanation**

**With:**
- minimal confusion
- correct mental model
- clear next steps at all times

---

## Result

- ✅ **PASS** → Ready for Stage 4
- ⚠️ **PARTIAL** → Fix UX gaps before proceeding
- ❌ **FAIL** → Rework flows before expansion

---

**This checklist is the gate before BreakLine evolves further.**
