# ⚠️ DEPRECATED - This file has moved

**New location:** [docs/reference/compliance.md](docs/reference/compliance.md)

This file will be removed in v2.0.0. Please update your bookmarks.

---

# MindTrace Compliance Definition of Done (DoD)
Version: 1.0
Last Updated: 2026-03-01

This checklist defines the **non-regression compliance contract** for MindTrace runs.
Any change that violates this contract is considered a breaking change.

---

## A) Run Layout Contract (Immutable Shape)

A MindTrace run MUST create this layout:

- `runs/<runName>/`
  - `artifacts/`
  - `audit/`
  - `metadata.json` (optional for now, allowed to be added later)

And global history MUST exist:

- `history/run-index.jsonl`

---

## B) Required Artifacts Contract (Always Generated)

A run MUST produce ALL of the following files in:

`runs/<runName>/artifacts/`

### Core artifacts
- `playwright-report.json` (deterministic, always present)
- `normalized-results.json` (derived from Playwright report)
- `policy-decision.json` (policy evaluation result)
- `gate-summary.json` (presence + readiness summary)
- `artifact-validation.json` (final required-artifact validation result)

### Runtime baseline artifacts (always present, deterministic defaults allowed)
- `healed-selectors.json` (seeded from manifest snapshot or repo fallback; else empty)
- `locator-manifest.snapshot.json` (if locator-manifest exists; otherwise optional)
- `root-cause-summary.json` (default category "none" if not generated)
- `failure-narrative.md` (default "No failures detected." if not generated)
- `execution-trace-map.json` (default `{ steps: [] }` if not generated)

---

## C) Artifact Validity Contract (JSON parse must succeed)

The following artifacts MUST be valid JSON parseable:
- `playwright-report.json`
- `normalized-results.json`
- `policy-decision.json`
- `gate-summary.json`
- `artifact-validation.json`
- `healed-selectors.json`
- `root-cause-summary.json`
- `execution-trace-map.json`

---

## D) Policy + Gate Behavior (Compliance Core)

### Policy rules (current baseline)
- If tests pass (Playwright exitCode=0) → policy decision MUST be `pass`
- If tests fail:
  - If `root-cause-summary.json.isFlaky === true` → decision MAY be `warn` and policy exitCode MAY be `0`
  - Else → decision MUST be `fail` and policy exitCode MUST be `1`

### Governance gate
- If policy decision is `fail` → governance gate MUST fail the run (CI failing)

---

## E) Exit Code Contract (Stable for CI)

MindTrace CLI exit codes MUST follow:

- **0**: Tests passed OR policy allows pass (including allowed flake)
- **1**: Tests failed AND policy decision is `fail`
- **2**: Runtime/pipeline error (unexpected exception, Playwright spawn failure, internal crash)
- **3**: Compliance/contract invalid (schema invalid OR artifact-validation invalid/missing required artifacts)

This contract MUST remain stable across versions.

---

## F) Deterministic Report Generation (No “missing playwright-report.json”)

- Playwright JSON report MUST be written deterministically into:
  - `runs/<runName>/artifacts/playwright-report.json`
- The CLI MUST NOT print the entire JSON report to the terminal.

---

## G) Audit Trail Contract

The audit folder MUST exist:

`runs/<runName>/audit/`

And MUST contain:
- `events.ndjson` (may be empty but must exist)
- `final.json` (written during finalize step)

---

## H) Regression Rules (Non-Negotiable)

A change is considered a regression if ANY occur:
- Missing required artifacts listed above
- JSON artifacts fail parsing
- Exit code behavior changes
- Terminal starts printing Playwright JSON reporter output
- Run layout paths change unexpectedly
- Governance gate allows failures when policy is `fail`

