# TeamCity Integration Guide
MindTrace for Playwright CI/CD Runtime Integration

---

## Overview

MindTrace integrates directly into TeamCity pipelines as a runtime intelligence layer
on top of Playwright test execution. It enhances CI/CD with:

- Selector Self-Healing
- Failure Classification (RCA)
- Governance Gate Enforcement
- Artifact Validation
- Immutable Audit Trails
- Stability Metrics
- Historical Execution Indexing

MindTrace does NOT replace Playwright.
It wraps test execution and post-processes runtime signals.

---

## Build Configuration

### Step 1: Install Dependencies

    npm ci
    npx playwright install --with-deps

### Step 2: Run MindTrace-Enhanced Tests

Generate deterministic run folder using TeamCity Build ID.

    export MINDTRACE_RUN_NAME="tc-$BUILD_NUMBER"
    npx mindtrace run --style native --run-name "$MINDTRACE_RUN_NAME"

Output generated in:

- runs/<runName>/
- mindtrace-artifacts/

---

### Step 3: Artifact Validation (CI Enforcement)

Validates existence and structure of:

- healed-selectors.json
- root-cause-summary.json
- failure-narrative.md
- execution-trace-map.json

Fails CI if:

- Artifact missing
- JSON invalid
- Required RCA keys absent

    npx mindtrace validate-artifacts --run "$MINDTRACE_RUN_NAME"

---

### Step 4: Pipeline Governance Gate

Fails CI if:

- Critical RCA category detected
- Exit code != 0
- Governance rules violated
- Required artifacts missing

    npx mindtrace gate --run "$MINDTRACE_RUN_NAME"

---

### Step 5: Finalize Audit Trail

Creates immutable audit log.

Outputs:

- runs/<runName>/audit/events.ndjson
- runs/<runName>/audit/final.json

    npx mindtrace finalize-run --run "$MINDTRACE_RUN_NAME"

---

### Step 6: Index Historical Execution

Adds run summary to:

- history/run-index.jsonl

Used for:

- Flaky test tracking
- Failure clustering
- Selector degradation
- Stability scoring

    npx mindtrace index-run --run "$MINDTRACE_RUN_NAME"

---

### Step 7: Generate AI Report

    npx mindtrace report

---

## Artifact Paths (Publish)

test-results/**/*
playwright-report/**/*
mindtrace-artifacts/**/*
runs/**/*
history/**/*
screenshots/**/*

---

## Environment Variables

OPENAI_API_KEY=%env.OPENAI_API_KEY%
BASE_URL=%env.BASE_URL%
CI=true
CI_PROVIDER=teamcity
HEADLESS=true
PARALLEL_WORKERS=4
HEALING_ENABLED=true
FAILURE_CLASSIFICATION_ENABLED=true
MINDTRACE_HEAL_ENABLED=true
MINDTRACE_RCA_ENABLED=true
SLACK_WEBHOOK_URL=%vault:slack/webhook-url%
JIRA_API_TOKEN=%vault:jira/api-token%

---

## Failure Conditions

Fail build if:

- Governance gate fails
- Artifact validation fails
- Critical RCA detected

Pass build if:

- Tests pass
- OR only flaky failures detected

---

## Post-Build Actions

Publish Artifacts:

- mindtrace-artifacts/healed-selectors.json
- mindtrace-artifacts/root-cause-summary.json
- mindtrace-artifacts/failure-narrative.md
- mindtrace-artifacts/automation-suggestions.md
- mindtrace-artifacts/jira-ticket.json
- runs/<runName>/audit/events.ndjson
- runs/<runName>/audit/final.json
- history/run-index.jsonl

Slack Notifications (Optional):

    if (failureClassification.isFlaky) {
      notifySlack("Flaky test detected")
    } else {
      notifySlack("Test failure - needs investigation")
    }

Jira Integration:

    curl -X POST https://jira.company.com/rest/api/2/issue \
      -H "Content-Type: application/json" \
      -d @mindtrace-artifacts/jira-ticket.json

---

## CI/CD Runtime Flow

Install
Run Tests
Validate Artifacts
Governance Gate
Finalize Audit
Index History
Generate Report
Publish Artifacts

MindTrace now provides:

- Pipeline Governance
- Artifact Validation
- Audit Trails
- Stability Metrics
- Test Observability
- Historical Execution Patterns

on top of standard Playwright CI execution.

