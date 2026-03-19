# How MindTrace Works

A simple explanation of MindTrace's operational model.

---

## 🎯 The Big Picture

MindTrace adds **governance** and **observability** to Playwright test automation.

Think of it as adding a compliance layer that:
1. **Defines** what should be tested (Contract)
2. **Detects** what can be tested (Cache)
3. **Verifies** everything is synchronized (Integrity)
4. **Records** what was tested (Artifacts + Audit)

All visible through a modern web interface.

---

## 🔄 The Core Workflow

```
Generate Contract → Build Cache → Check Integrity → Run Tests
       ↓                ↓              ↓                ↓
  Source of truth   Page detection  Verification   Execution
```

### **1. Generate Contract**

**What it does:**
- Scans your test repository
- Identifies test files and patterns
- Extracts selectors and page objects
- Creates governance rules
- Generates a fingerprint (SHA-256 hash)

**Output:**
- `.mcp-contract/` directory with:
  - `automation-contract.json` - Your test structure
  - `page-key-policy.json` - Page definitions
  - `contract.fingerprint.sha256` - Unique identifier
  - `contract.meta.json` - Metadata

**Why it matters:**
The contract is your **source of truth**. Everything else references it.

---

### **2. Build Cache**

**What it does:**
- Reads the contract to know what pages should exist
- Connects to your application
- Detects which pages are actually accessible
- Records results with contract binding
- Stores contract fingerprint for drift detection

**Output:**
- `.mcp-cache/v1/` directory with:
  - Page detection results (JSON files per page)
  - `cache.meta.json` - Includes bound contract fingerprint
  - Metadata about what was detected

**Why it matters:**
The cache tells your tests **which pages are available**. It's bound to a specific contract version to prevent running tests against the wrong configuration.

---

### **3. Check Integrity**

**What it does:**
- Validates contract structure and schema
- Validates cache structure and binding
- Compares cache fingerprint with current contract
- Reports any drift or misalignment

**Output:**
- **Contract Integrity Gate**: Valid | Invalid | Warning
- **Cache Integrity Gate**: Valid | Invalid | Warning | Not Created
- **Drift Status**: No drift | Drift detected

**Why it matters:**
Integrity gates prevent you from running tests when:
- Contract is corrupted or invalid
- Cache is out of sync with contract
- Configuration has changed but cache hasn't been rebuilt

This is **governance** — enforcing rules before execution.

---

### **4. Run Tests**

**What it does:**
- Loads and validates contract
- Loads and verifies cache binding
- Runs integrity checks
- Executes Playwright tests with contract awareness
- Generates deterministic artifacts
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

## 🔍 The Healing System

When a selector breaks, MindTrace has a **5-tier authority system**:

```
1. Contract (highest authority)
   ↓ "The contract says this selector should work"

2. Cache (semantic signals)
   ↓ "The cache detected this element recently"

3. Last-Known-Good (historical)
   ↓ "This selector worked in the last run"

4. Fallback (deterministic)
   ↓ "Try these bounded alternatives"

5. LLM (advisory only)
   ↓ "AI suggests this might work - but governance decides"
```

**Key principle:**
- LLM suggestions are **advisory only**
- Contract and policy **always override AI**
- All healing attempts are **logged and auditable**

---

## 📊 The UI System

The web interface provides **operational visibility**:

### **System Status Page**
Your operational dashboard:
- Component health (Contract, Cache, Runtime, MCP)
- Status badge (System Ready | Setup Required | Issues)
- Recent run history
- Quick actions

**Situation awareness:**
- "Setup Required" when starting fresh → welcoming guidance
- "System Warnings" when partial issues → clear remediation
- "Critical Issues" when governance blocked → urgent actions

---

### **Contract Page**
Contract management:
- View contract existence and location
- Generate new contracts
- Browse contract files
- Validate contract structure

**Empty state:**
- Shows "No Contract Found" with helpful guidance
- Single focused action: "Generate Contract"
- No confusion about what to do first

---

### **Cache Page**
Cache operations:
- View cache status and page count
- Build or rebuild cache
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

## 🎨 Design Principles

### **1. Situation Awareness**

The system distinguishes:
- **"Not created"** → First time setup (blue, welcoming)
- **"Warning"** → Issue but not critical (orange, informative)
- **"Failed"** → Actual failure (red, urgent)

Users never see scary error messages for normal empty states.

---

### **2. Progressive Disclosure**

Information hierarchy:
- **UI** → Shows what matters most
- **Tooltips** → Explain details on demand
- **Expandable sections** → Reveal technical details when needed

Not everything is shown at once. Users drill down as needed.

---

### **3. Error Recovery**

Every error state has:
- Clear explanation of what failed
- Why it might have failed
- **Retry button** to try again
- Alternative actions (Back, Check Docs, etc.)

No dead ends. Users always know what to do next.

---

### **4. No Ambiguity**

Every state explains itself:
- "No Contract Found" → What is a contract? What should I do?
- "Drift Detected" → What is drift? Why does it matter? How do I fix it?
- "Cache Built Successfully" → What does this mean? What can I do now?

Users never wonder "Is this broken?" or "What now?"

---

## 🔒 Governance Model

### **Write Strictly, Read Compatibly**

When **generating artifacts**:
- Use canonical field names (camelCase: `schemaVersion`)
- Follow strict schemas
- Validate before writing

When **reading artifacts**:
- Accept canonical names (prefer `schemaVersion`)
- Provide transitional compatibility for old names (`schema_version`)
- Migrate over time to strict canonical only

This allows:
- **Forward progress** - New systems use canonical names
- **Backward compatibility** - Old artifacts still work
- **Migration path** - Gradual transition to strict standards

**Important:** Compatibility is **transitional**, not permanent.

---

## 🎯 Real-World Example

Let's walk through a typical scenario:

### **Scenario: New Team Member Onboarding**

**Day 1 - First Time User:**

1. Opens UI → Sees "System Status: Setup Required"
2. Sees numbered steps with checkmarks
3. Clicks "Generate Contract" → Job runs → ✓ Complete
4. Clicks "Build Cache" → Job runs → ✓ Complete
5. Checks "Integrity" → Sees "All Gates Passed"
6. Clicks "Run Tests" → First test executes → ✓ Success

**Experience:**
- No confusion
- No "is this broken?" moments
- Clear guidance at every step
- Success feedback at every milestone

---

### **Scenario: Contract Changes**

**Developer updates test structure:**

1. System Status shows "System Warnings" (orange)
2. Integrity page shows "Drift Detected"
3. Cache page shows prominent warning: "Your cache was built from an older contract version"
4. Developer clicks "Rebuild Cache Now"
5. Cache rebuilds with new contract fingerprint
6. Integrity page returns to "All Gates Passed"
7. System Status returns to "System Ready"

**Experience:**
- Clear detection of the issue
- Explanation of what drift means
- Single action to resolve
- Visual confirmation of fix

---

### **Scenario: Test Failure Investigation**

**Tests fail in CI:**

1. Developer opens Runs page
2. Sees failed run with Exit Code 1 (test failure)
3. Clicks run → Overview shows 3 passed, 2 failed
4. Artifacts tab shows detailed Playwright report
5. Audit tab shows all system operations were normal
6. Developer investigates test logic (not infrastructure)

**Experience:**
- Clear differentiation: test failure vs infrastructure vs compliance
- Easy access to debug artifacts
- Complete audit trail
- Knows this is a test issue, not a governance issue

---

## 🏁 Summary

MindTrace works by:

1. **Defining** your automation structure (Contract)
2. **Detecting** what's available (Cache)
3. **Verifying** everything aligns (Integrity)
4. **Executing** with governance (Runs)
5. **Recording** everything (Artifacts + Audit)
6. **Showing** you what's happening (UI)

All designed with:
- **Governance first** - Policy over convenience
- **Determinism** - Same inputs → same outputs
- **Observability** - See everything that happens
- **Trust** - Clear communication, no surprises

This transforms test automation from:
- "I hope this works" → "I know this works"
- "What happened?" → "Here's exactly what happened"
- "Is this broken?" → "Here's the status and what to do"

That's the difference between a tool and a product.
