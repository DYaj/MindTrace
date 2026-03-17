# Architecture Overview

## System Overview

MindTrace for Playwright is a **production-ready, enterprise-grade test automation framework** that combines:

- **Playwright** - Browser automation engine
- **MindTrace Platform** - AI intelligence layer
- **Self-Healing** - Automatic selector repair
- **Failure Classification** - AI-powered root cause analysis
- **Three Framework Styles** - Native, BDD, POM+BDD
- **TeamCity Integration** - CI/CD ready
- **Continuous Learning** - Gets smarter over time

## Component Architecture

### 1. MindTrace Runtime
- **Role**: Central intelligence layer
- **Responsibilities**:
  - Prompt routing
  - Failure classification
  - Selector healing
  - Artifact generation

### 2. Framework Styles
- **Style 1 (Native)**: Direct Playwright usage
- **Style 2 (BDD)**: Gherkin + Step definitions
- **Style 3 (POM+BDD)**: Enterprise architecture

### 3. Shared Utilities
- **Selector Engine**: Ranking and optimization
- **Page Scraper**: DOM snapshot capture
- **MCP Runtime**: Test execution listener

### 4. Governance Safety Layer (GSL) 🆕

**Package:** `@mindtrace/integrity-gates` (Phase A Complete)

The Governance Safety Layer provides hard authority verification for contract integrity, cache binding, and drift detection.

#### Components

**Contract Integrity Gate**
- Verifies automation contracts before test execution
- Canonical `.mcp-contract/` precedence over legacy `.mindtrace/contracts/`
- All failures are fatal (exit code 3)
- Verifier-only (never regenerates or mutates contracts)

**Cache Integrity Gate**
- Verifies page cache binding to contract fingerprint
- Path-sensitive (only fails when cache required for current path)
- Mode-aware (strict mode fails hard, default mode continues)
- Drift always invalidates cache (hard invariant)

**Drift Safety System**
- Pure drift detection (no I/O, no timestamps)
- Compares contract fingerprint vs cache binding
- Audit trail in append-only JSONL format
- Records drift events with action taken

#### Verification Principles

1. **Hard Authority** - Contract verification is always enforced
2. **Verifier-Only** - Never generate, repair, or mutate artifacts
3. **Pure Detection** - Drift logic has zero side effects
4. **Canonical First** - `.mcp-contract/` wins if both paths exist
5. **Drift Invariant** - Cache immediately invalid on contract mismatch
6. **Exit Code 3** - All integrity failures are compliance violations

#### Parity Protection

The package includes parity tests vs. `repo-intelligence-mcp` to ensure deterministic logic has not diverged. This protects against regression during Phase B extraction to `@mindtrace/deterministic-core`.

## Data Flow

```
┌─────────────────────────────────────────────────────┐
│                   Developer                          │
│              (Writes Playwright Tests)               │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│              Playwright Runtime                      │
│         (Executes Tests in Browser)                  │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│           MindTrace Runtime Listener                 │
│      (Captures Failures & Events)                    │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│        Failure Classification Engine                 │
│    (Analyzes: DOM, Logs, Screenshots)                │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│          LLM Reasoning Layer                         │
│    (OpenAI / Claude / Ollama)                        │
│                                                      │
│  - What failed?                                      │
│  - Why did it fail?                                  │
│  - Is test wrong or app wrong?                       │
│  - How to fix?                                       │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│          Artifact Generator                          │
│                                                      │
│  Creates:                                            │
│  - Healed selectors                                  │
│  - Failure narratives                                │
│  - Root cause summaries                              │
│  - Jira tickets                                      │
│  - Automation suggestions                            │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│              Git Push                                │
│   (Code + Artifacts → Repository)                    │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│          TeamCity CI Pipeline                        │
│                                                      │
│  1. npm install                                      │
│  2. npx playwright install                           │
│  3. npx mindtrace-playwright run                     │
│  4. Publish artifacts                                │
│  5. Notify Slack/Jira                                │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│         Continuous Learning Loop                     │
│                                                      │
│  Framework learns:                                   │
│  - Which selectors break often                       │
│  - Which tests are flaky                             │
│  - Which API endpoints fail                          │
│  - Which pages change frequently                     │
│                                                      │
│  Result: Self-improving automation!                  │
└─────────────────────────────────────────────────────┘
```

## Failure Classification

### Categories
1. **DOM Changed**: Element structure modified
2. **Selector Failed**: Locator no longer valid
3. **API Error**: Backend service issues
4. **Timeout**: Timing/performance problems
5. **Navigation Mismatch**: Unexpected redirects
6. **UX Regression**: Visual/behavioral changes
7. **Unexpected Modal**: New popup/dialog

### AI Analysis Process
- Analyzes error messages
- Reviews screenshots
- Examines network logs
- Checks console output
- Determines root cause
- Suggests remediation

### Example Output

```json
{
  "category": "selector_failed",
  "confidence": 0.92,
  "reasoning": "Element ID changed in recent deployment",
  "suggestedActions": [
    "Use data-testid attribute",
    "Update page object with new selector",
    "Add explicit wait"
  ],
  "isFlaky": false,
  "rootCause": "DOM structure modified"
}
```

## Self-Healing

### Strategy Ranking
1. `data-testid` (100 stability)
2. `role` (90 stability)
3. `aria-label` (80 stability)
4. `text` (70 stability)
5. `css class` (40 stability)
6. `xpath` (30 stability)

### Healing Process
1. Detect selector failure
2. Capture page snapshot
3. Analyze DOM structure
4. Generate alternatives
5. Rank by stability
6. Apply best option
7. Log change
8. Create PR suggestion

### Example

**Before:**
```typescript
// Test breaks when ID changes
await page.click("#submit-btn");
```

**After (Automatic):**
```typescript
// MCP detects failure and heals
await page.click('[data-testid="submit-button"]');
// Suggestion saved to: mindtrace-artifacts/healed-selectors.json
```

## Framework Styles

### Comparison

| Feature                  | Native       | BDD            | POM+BDD     |
| ------------------------ | ------------ | -------------- | ----------- |
| **Setup Time**           | 5 min        | 10 min         | 15 min      |
| **Learning Curve**       | Low          | Medium         | High        |
| **Best For**             | 10-500 tests | 100-1000 tests | 1000+ tests |
| **Team Size**            | 1-5          | 3-10           | 10+         |
| **Maintainability**      | Medium       | High           | Very High   |
| **Stakeholder Friendly** | No           | Yes            | Yes         |
| **Code Reusability**     | Low          | Medium         | High        |
| **CI Speed**             | Fast         | Medium         | Medium      |

### When to Choose Each

**Style 1 (Native)**
- Startups & small teams
- Rapid prototyping
- API-first testing
- Developer-centric QA

**Style 2 (BDD)**
- Enterprise with non-tech stakeholders
- Regulatory compliance
- Living documentation
- BA-QA-PO collaboration

**Style 3 (POM+BDD)**
- Fortune 500 companies
- Multi-team organizations
- 2+ year automation strategy
- Complex domain models

## Generated Artifacts

After each test run, check `mindtrace-artifacts/`:

```
mindtrace-artifacts/
├── healed-selectors.json         # Fixed locators
├── failure-narrative.md          # Human-readable analysis
├── root-cause-summary.json       # Structured failure data
├── automation-suggestions.md     # Next steps for engineers
├── jira-ticket.json              # Bug report template
├── steps-to-reproduce.md         # Manual repro steps
├── execution-trace-map.json      # Test flow visualization
└── coverage-gap-report.md        # Missing test scenarios
```

## Continuous Learning

The framework stores and learns from:

- Failure patterns
- Selector stability metrics
- Flaky test detection
- API contract changes
- UX behavior changes

**Result:** Tests become **more stable over time**!
