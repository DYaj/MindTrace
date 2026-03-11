# MindTrace --- Claude Skills Integration (Scalable Architecture)

## Design Principle

Claude Skills must operate as **assistive expert modules** that:

-   never mutate the contract
-   never override governance
-   never write to `.mcp-contract/`
-   never write to `.mcp-cache/`
-   never affect deterministic runtime decisions

Claude Skills only produce **analysis, proposals, and explanations**.

They are **consultants, not authorities**.

------------------------------------------------------------------------

# Where Claude Skills Fit in MindTrace

Repo Intelligence\
↓\
Contract Generation\
↓\
Runtime Execution\
↓\
Governance Decision\
↓\
AI Assistive Layer (Claude Skills)

Claude Skills run **after deterministic logic**, never before.

------------------------------------------------------------------------

# Core Claude Skills

## Skill 1 --- Repo Intelligence Advisor

Location:

repo-intelligence-mcp/skills/repo-analysis.skill.md

Purpose:

Assist when repository detection confidence is low.

Example Uses:

-   suggest missing selectors
-   detect unusual test frameworks
-   highlight ambiguous locator patterns

Example Output:

``` json
{
  "suggestions": [
    "Detected Playwright but custom wrapper present",
    "Consider adding data-testid for stable selectors"
  ]
}
```

------------------------------------------------------------------------

## Skill 2 --- Failure RCA Generator

Location:

mindtrace-ai-runtime/skills/failure-rca.skill.md

Purpose:

Generate human-readable root cause analysis.

Inputs:

-   healing-attempts.jsonl
-   healing-outcome.json
-   failure logs

Example Output:

Root Cause Summary

The selector `button:has-text("Submit")` failed because the button text
changed to "Send".

Recommendation: add stable data-testid.

------------------------------------------------------------------------

## Skill 3 --- Flaky Pattern Detector

Location:

mindtrace-ai-runtime/skills/flaky-pattern.skill.md

Purpose:

Analyze historical runs to detect flaky patterns.

Example Output:

``` json
{
  "flakyPatterns": [
    {
      "selector": "button.submit",
      "failureRate": 0.42,
      "suggestion": "Replace with data-testid"
    }
  ]
}
```

------------------------------------------------------------------------

## Skill 4 --- Selector Improvement Advisor

Location:

repo-intelligence-mcp/skills/selector-advisor.skill.md

Purpose:

Suggest stronger selectors for developers.

Example:

Replace

button.submit

with

\[data-testid="submit"\]

------------------------------------------------------------------------

## Skill 5 --- Test Coverage Advisor

Location:

repo-intelligence-mcp/skills/test-gap.skill.md

Purpose:

Detect missing test coverage.

Example:

Detected route:

/checkout/payment

No tests cover this route.

Suggested new test scenarios.

------------------------------------------------------------------------

# Skill Directory Layout

mindtrace/

repo-intelligence-mcp/ skills/ repo-analysis.skill.md
selector-advisor.skill.md test-gap.skill.md

mindtrace-ai-runtime/ skills/ failure-rca.skill.md
flaky-pattern.skill.md

------------------------------------------------------------------------

# Claude Skill Execution Policy

1.  Skills run **after deterministic execution**
2.  Skills cannot modify contract files
3.  Skills cannot modify cache files
4.  Skills cannot alter runtime decisions
5.  Skills outputs are advisory artifacts only
6.  Governance decisions always override skill output

------------------------------------------------------------------------

# Why This Scales

AI remains assistive and never breaks deterministic guarantees.

Skills remain modular and extensible.

Artifacts are auditable and enterprise safe.

------------------------------------------------------------------------

# Skill 6 --- Contract Drift Explainer

Location:

repo-intelligence-mcp/skills/contract-drift.skill.md

Purpose:

Explain contract fingerprint changes.

Example Output:

Contract Drift Analysis

Changes detected:

• New page added: /checkout\
• Selector removed: data-testid="submit"\
• Locator strategy changed from role to css

Impact:

3 tests may require updates.

------------------------------------------------------------------------

# Final Claude Skills Strategy

Deterministic Engine\
↓\
Governance Decision\
↓\
Healing Engine\
↓\
Claude Skills (analysis + insights)

Claude Skills become the **QA Intelligence Layer**, not the test
execution layer.

---

# Skill 7 — Contract Evolution Advisor (Advanced AI Capability)

Location:

repo-intelligence-mcp/skills/contract-evolution.skill.md

Purpose:

Analyze real production failures and historical healing attempts to propose **safe contract improvements** without breaking deterministic guarantees.

This skill **never modifies contracts automatically**.  
Instead, it produces **proposed contract evolution suggestions** that developers can review and explicitly approve.

This enables MindTrace to continuously improve test robustness based on real-world failures while maintaining governance authority.

Inputs:

- healing-attempts.jsonl
- healing-summary.json
- history/run-index.jsonl
- current automation-contract.json
- selector-strategy.json
- page cache signals

Example Output:

Contract Evolution Suggestions

Detected pattern:
Selector `button.submit` fails frequently across runs.

Recommended contract improvement:

Replace:

button.submit

With:

[data-testid="submit"]

Confidence: High  
Evidence: 14 failures across 5 runs

Suggested contract patch:

{
  "selectorPolicy": {
    "locators": [
      { "type": "testid", "value": "submit" }
    ]
  }
}

Governance Rule:

1. Skill **cannot modify contract files directly**
2. Skill **cannot modify `.mcp-cache/`**
3. Skill produces **proposal artifacts only**
4. Developers must approve and regenerate the contract bundle

Output Artifact:

contract-evolution-report.json

Example:

{
  "proposals": [
    {
      "page": "/checkout",
      "issue": "unstable css selector",
      "suggestedSelector": "[data-testid='submit']",
      "confidence": 0.92,
      "evidenceRuns": 14
    }
  ]
}

---

# Why This Skill Is Powerful

This capability allows MindTrace to:

• Learn from real production failures  
• Improve contracts safely over time  
• Prevent flaky selectors from persisting  
• Maintain deterministic runtime guarantees  

Most frameworks attempt **runtime AI healing**.

MindTrace instead performs **governed contract evolution**, which is:

- deterministic
- auditable
- developer approved
- enterprise safe

---

# Final MindTrace Intelligence Layer

Deterministic Engine  
↓  
Governance Decision  
↓  
Healing Engine  
↓  
Claude Skills (Analysis + Intelligence)  
↓  
Contract Evolution Suggestions (Human Approved)

Claude Skills become the **QA Intelligence Layer**, enabling continuous improvement without sacrificing deterministic execution.


---

# Skill 9 — UI Change Prediction Engine (Pre-Run Breakage Forecast)

Location:

repo-intelligence-mcp/skills/ui-change-prediction.skill.md

Purpose:

Predict which tests are likely to break **before execution starts** by comparing
UI/DOM changes against the automation contract, selector strategy, page cache signals,
and historical failure patterns.

This makes MindTrace dramatically smarter than traditional automation frameworks because
it does not wait for failure to happen first. It can surface **pre-run risk forecasts**
that help teams intervene before flaky or broken executions waste CI time.

Important:

This skill **never blocks execution by itself**.
It does **not modify contracts**, **does not modify cache**, and **does not override governance**.

It produces **predictive risk artifacts only**.

---

# What This Skill Analyzes

Inputs:

- previous page semantic cache snapshots
- current page semantic cache snapshots
- automation-contract.json
- selector-strategy.json
- contract-evolution-report.json
- healing-attempts.jsonl
- history/run-index.jsonl
- optional DOM diff summaries generated by deterministic scanners

The skill looks for patterns such as:

- removed or renamed stable IDs
- text changes on contract-linked elements
- ARIA role changes
- route/page structure changes
- selector strategy degradation
- historically fragile page regions

---

# Example Output

ui-change-prediction-report.json

Example:

```json
{
  "predictions": [
    {
      "test": "checkout submit flow",
      "page": "/checkout",
      "riskLevel": "high",
      "predictedBreakReason": "data-testid removed from submit button",
      "affectedSelectors": [
        "[data-testid='submit']"
      ],
      "confidence": 0.91,
      "recommendedAction": "review contract selector policy for checkout submit action"
    },
    {
      "test": "login validation flow",
      "page": "/login",
      "riskLevel": "medium",
      "predictedBreakReason": "role changed from button to link",
      "affectedSelectors": [
        "getByRole('button', { name: 'Continue' })"
      ],
      "confidence": 0.78,
      "recommendedAction": "review semantic role mapping in selector strategy"
    }
  ]
}
```

---

# Why This Skill Is a Breakthrough

Most frameworks behave like this:

1. Run test
2. Fail
3. Try to heal or rerun

MindTrace with UI Change Prediction behaves like this:

1. Detect contract + semantic changes
2. Predict breakage risk
3. Warn team before execution
4. Let governance + deterministic runtime remain in control

This shifts the platform from **reactive automation** to **predictive automation intelligence**.

---

# Governance and Safety Rules

This skill must obey the following rules:

1. It cannot mutate `.mcp-contract/`
2. It cannot mutate `.mcp-cache/`
3. It cannot alter runtime decisions
4. It cannot mark tests pass/fail
5. It can only emit advisory prediction artifacts
6. Governance remains the only authority for execution outcomes

---

# Enterprise Value

This skill enables:

- pre-run failure forecasting
- smarter CI prioritization
- early warning for unstable releases
- proactive contract review before widespread breakage
- reduced wasted CI cycles on known-high-risk changes

It makes MindTrace useful not only for execution and healing,
but also for **release readiness intelligence**.

---

# Monetization Alignment

This skill connects directly to high-value enterprise offerings:

### Predictive QA Risk Dashboard

Show teams:

- which tests are likely to fail tonight
- which pages have the highest UI change risk
- which selectors are becoming unstable
- where contract updates are recommended

### CI Optimization Layer

Use prediction artifacts to:

- prioritize high-risk suites first
- route warnings to QA owners
- flag releases that need contract review

### Release Confidence Scoring

Generate a score such as:

```json
{
  "releaseRiskScore": 0.71,
  "highRiskFlows": [
    "/checkout",
    "/login"
  ],
  "predictedFailures": 8
}
```

This turns MindTrace into a **predictive QA governance platform**, not just a test runner.

---

# Final Strategic Positioning

With this addition, MindTrace becomes:

- deterministic execution platform
- contract-governed automation system
- healing and recovery engine
- contract evolution advisor
- global QA intelligence platform
- predictive UI breakage forecasting system

That is far beyond the traditional scope of Playwright, Cypress, or Selenium ecosystems.

