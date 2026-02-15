# TeamCity Integration Guide
MindTrace for Playwright CI/CD Runtime Integration

## Overview

MindTrace integrates into TeamCity pipelines as a runtime intelligence layer on top of Playwright test execution. It enhances CI/CD with:

- Selector self-healing
- Failure classification (RCA)
- Governance gate enforcement
- Artifact validation
- Immutable audit trails
- Stability metrics
- Historical execution indexing

MindTrace does NOT replace Playwright. It wraps execution and post-processes runtime signals.

## Recommended TeamCity pipeline steps

### Step 1: Install dependencies

    cd frameworks/style1-native
    npm ci
    npx playwright install --with-deps

### Step 2: Run MindTrace-enhanced tests

Use a deterministic run name (TeamCity build number is ideal):

    cd frameworks/style1-native

    export CI=true
    export CI_PROVIDER=teamcity
    export MINDTRACE_RUN_NAME="tc-$BUILD_NUMBER"

    npx mindtrace run --style native --run-name "$MINDTRACE_RUN_NAME"

Outputs:

- runs/<runName>/
- mindtrace-artifacts/

### Step 3: Artifact validation (CI enforcement)

Validates existence and structure of:

- healed-selectors.json
- root-cause-summary.json
- failure-narrative.md
- execution-trace-map.json

Fails CI if:

- artifact missing
- JSON invalid
- required keys absent

    cd frameworks/style1-native
    npx mindtrace validate-artifacts --run "$MINDTRACE_RUN_NAME"

### Step 4: Pipeline governance gate

Applies runtime policy enforcement.

Fails CI if:

- critical RCA category detected
- non-flaky failures exist (policy-driven)
- required artifacts missing

    cd frameworks/style1-native
    npx mindtrace gate --run "$MINDTRACE_RUN_NAME"

### Step 5: Finalize audit trail

Creates an immutable audit log with a hash chain.

Outputs:

- runs/<runName>/audit/events.ndjson
- runs/<runName>/audit/final.json

    cd frameworks/style1-native
    npx mindtrace finalize-run --run "$MINDTRACE_RUN_NAME"

### Step 6: Index historical execution

Appends a run summary into:

- history/run-index.jsonl

Used for:

- flaky tracking
- failure clustering
- selector degradation
- stability scoring

    cd frameworks/style1-native
    npx mindtrace index-run --run "$MINDTRACE_RUN_NAME"

### Step 7: Generate report

    cd frameworks/style1-native
    npx mindtrace report --run "$MINDTRACE_RUN_NAME" --output ../../reports --format markdown

## Artifact publishing (TeamCity)

Publish these paths:

- test-results/**
- playwright-report/**
- mindtrace-artifacts/**
- runs/**
- history/**
- screenshots/**

## Environment variables

Configure these in TeamCity Parameters:

    OPENAI_API_KEY=%env.OPENAI_API_KEY%
    BASE_URL=%env.BASE_URL%
    CI=true
    CI_PROVIDER=teamcity
    HEADLESS=true
    PARALLEL_WORKERS=4

    MINDTRACE_HEAL_ENABLED=true
    MINDTRACE_RCA_ENABLED=true

Optional:

    SLACK_WEBHOOK_URL=%vault:slack/webhook-url%
    JIRA_API_TOKEN=%vault:jira/api-token%

## Pass/fail semantics

Fail build if:

- artifact validation fails
- governance gate fails
- critical RCA detected

Pass build if:

- tests pass
- OR only flaky failures exist (policy-driven)

## CI runtime flow

1. Install
2. Run tests
3. Validate artifacts
4. Governance gate
5. Finalize audit
6. Index history
7. Generate report
8. Publish artifacts
