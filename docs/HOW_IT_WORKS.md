# How MindTrace Works

Reference guide for the operational model.

---

## Core Model

```
Contract → Cache → Integrity → Run
   ↓         ↓         ↓         ↓
Define    Detect    Verify   Execute
```

**Contract** = Source of truth (what should be tested)
**Cache** = Detection results (what can be tested)
**Integrity** = Verification (are they synchronized?)
**Run** = Execution (governed test run with audit)

---

## Workflow Steps

### 1. Generate Contract

**Scans** → Test repository
**Extracts** → Selectors, page objects, test structure
**Creates** → Governance rules + SHA-256 fingerprint
**Outputs** → `.mcp-contract/` with automation-contract.json, page-key-policy.json, contract.fingerprint.sha256

**Purpose:** Source of truth for all downstream operations.

---

### 2. Build Cache

**Reads** → Contract to know expected pages
**Connects** → Your application
**Detects** → Which pages are accessible
**Binds** → Cache to contract fingerprint
**Outputs** → `.mcp-cache/v1/` with page detection results

**Purpose:** Tells tests which pages are available. Binding prevents tests running against wrong config.

---

### 3. Check Integrity

**Validates** → Contract structure
**Validates** → Cache structure and binding
**Compares** → Cache fingerprint vs current contract
**Reports** → Valid | Invalid | Warning | Drift Detected

**Purpose:** Prevents execution when contract/cache are corrupted or out of sync.

---

### 4. Run Tests

**Loads** → Contract + cache
**Validates** → Integrity gates
**Executes** → Playwright tests with governance
**Generates** → Deterministic artifacts + audit trail
**Sets** → Exit code (0=success, 1=test fail, 2=infra, 3=compliance)
- Records complete audit trail
- Sets exit code based on governance status

**Output:**
- `runs/<runName>/` directory with:
  - Test results and reports
  - Contract snapshot (what contract was used)
  - Healing logs (if selectors were healed)
  - Audit events (what the system did)
  - Policy decisions (governance outcomes)

**Why it matters:**
Every run is **deterministic** and **auditable**. You can trace exactly:
- What contract was used
- What cache was bound
- What tests ran
- What selectors healed
- What policies were checked
- Why the run succeeded or failed

---

## 🧩 How the Pieces Connect

### **Contract → Cache Binding**

When you build cache:
```
1. Read contract fingerprint: abc123...
2. Detect pages from application
3. Store cache with: bound_contract=abc123...
```

Later, when you run tests:
```
1. Load contract fingerprint: abc123...
2. Load cache bound_contract: abc123...
3. Compare: abc123 == abc123 ✓
4. Safe to proceed
```

If contract changes:
```
1. Load contract fingerprint: xyz789... (NEW)
2. Load cache bound_contract: abc123... (OLD)
3. Compare: xyz789 ≠ abc123 ✗
4. DRIFT DETECTED - rebuild cache required
```

This prevents running tests with stale configuration.

---

### **Integrity Gates → Exit Codes**

MindTrace uses **exit codes** to communicate governance status:

| Exit Code | Meaning | Example |
|-----------|---------|---------|
| **0** | Success - tests passed, policy satisfied | All tests green, contract valid |
| **1** | Test failure - expected Playwright failure | Some tests failed (normal) |
| **2** | Infrastructure failure - runtime error | Playwright crashed, network issue |
| **3** | Policy violation - governance failure | Contract invalid, cache missing, drift detected |

CI/CD systems can differentiate:
- **Exit 1** → Flaky test, investigate test logic
- **Exit 2** → Infrastructure issue, check environment
- **Exit 3** → Compliance issue, rebuild contract/cache

---

## Healing System (5-Tier Authority)

| Tier | Authority | Purpose |
|------|-----------|---------|
| 1. Contract | Highest | Governance-defined selectors |
| 2. Cache | High | Recently detected elements |
| 3. Last-Known-Good | Medium | Historical working selectors |
| 4. Fallback | Low | Bounded alternatives |
| 5. LLM | Advisory | AI suggestions (never overrides) |

**Rule:** Contract/policy always wins. LLM is advisory only.

---

## UI Pages

| Page | Purpose | Key Features |
|------|---------|-------------|
| **System Status** | Operational dashboard | Component health, status badge, recent runs, quick actions |
| **Runs** | Execution history | All runs, exit codes, test results, delete actions |
| **Run Detail** | Single run deep dive | Overview, artifacts (Core/Integrity/Healing/Debug), audit timeline |
| **Contract** | Contract management | Generate, view files, validate structure |
| **Cache** | Cache operations | Build/rebuild, view pages, drift warnings, contract binding |
| **Integrity** | Verification dashboard | Contract gate, cache gate, drift check, technical details |

**Design:** Situation-aware (setup vs warnings vs critical), error recovery on all states, no dead ends.
- Browse detected pages
- Monitor contract binding

**Drift detection:**
- Visual warning when cache doesn't match contract
- Clear explanation: "Your cache was built from an older contract version"
- Action button: "Rebuild Cache Now"

---

### **Integrity Page**
Verification dashboard:
- Contract Integrity Gate status
- Cache Integrity Gate status
- Drift detection results
- Technical details (fingerprints, paths, etc.)

**Situation awareness:**
- "All Gates Passed" → Success badge, no banner clutter
- "Setup Required" → Welcoming guidance for first-time users
- "Critical Failures" → Urgent banner only for real issues

---

### **Runs Page**
Execution history:
- All test runs with timestamps
- Exit codes and status badges
- Duration and test counts
- Quick access to run details

**Empty state:**
- "No Test Runs Yet" with context-aware message
- Different guidance if prerequisites ready vs not ready
- No scary "failed" messaging for empty state

---

### **Run Detail Page**
Deep dive into a single run:

**Overview Tab:**
- Exit code interpretation
- Test results summary
- Run metadata

**Artifacts Tab:**
- Organized by category (Core, Integrity, Healing, Debug)
- Click to view file contents
- Visual file type indicators

**Audit Tab:**
- Timeline of all system operations
- Contract validation events
- Cache binding events
- Policy decisions

**Empty states:**
- "No Artifacts" → Explains what artifacts are
- "No Audit Events" → Simple message, not alarming
- No confusion about whether this is broken

---

## Design Principles

| Principle | Implementation |
|-----------|----------------|
| **Situation Awareness** | "Not created" (blue) vs "Warning" (orange) vs "Failed" (red) |
| **Progressive Disclosure** | UI shows essentials → Tooltips for details → Expandable for deep dive |
| **Error Recovery** | Every error has Retry button + clear next steps |
| **No Ambiguity** | Every state explains what it is and what to do |

---

## Governance Model

**Write Strictly:** Use canonical names (camelCase: `schemaVersion`), validate before writing
**Read Compatibly:** Accept canonical + transitional (`schema_version`), migrate gradually

**Important:** Compatibility is transitional, not permanent.

---

## Example Scenarios

### New User Onboarding
1. See "Setup Required" → 2. Generate Contract → 3. Build Cache → 4. Check Integrity → 5. Run Tests
**Result:** No confusion, clear guidance at each step.

### Contract Changes (Drift)
1. System shows "Warnings" → 2. Integrity shows "Drift" → 3. Cache shows warning → 4. Click "Rebuild Cache" → 5. Returns to "All Gates Passed"
**Result:** Clear detection, single action to fix.

### Test Failure
1. See failed run → 2. Check exit code (1=test, 2=infra, 3=compliance) → 3. View artifacts → 4. Check audit trail → 5. Debug accordingly
**Result:** Fast diagnosis, right context immediately.

---

## Summary

**Model:** Contract → Cache → Integrity → Run → Audit → UI

**Principles:** Governance first | Determinism | Observability | Trust

**Result:** Test automation you can trust, debug, and prove compliant.
