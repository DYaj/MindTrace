# MindTrace Client Setup Prompt Contract

## Purpose

This document defines the exact onboarding questions, allowed answers,
and deterministic runtime mappings for MindTrace.

This spec is implementation-ready for:

- CLI onboarding flow
- Web UI wizard
- Enterprise setup assistant
- Automated bootstrap script

No ambiguity. No partial states. Deterministic configuration output.

---

# 1. Onboarding Flow Overview

MindTrace onboarding consists of three required questions:

1. Existing tests?
2. Execution environment?
3. Strictness level?

The answers generate a normalized configuration profile
that drives the runtime engine.

---

# 2. Question 1 — Existing Tests

## Prompt

Do you already have automated tests?

Allowed values:

- yes
- no

---

## If answer = yes

Follow-up prompt:

What framework style are you using?

Allowed values:

- native
  Meaning: Playwright Test

- bdd
  Meaning: Cucumber / Gherkin with Playwright

- pom-bdd
  Meaning: Page Object Model + Gherkin hybrid

- external
  Meaning: Other or custom runner (process-level wrapper mode)

---

### Runtime Mapping (if yes)

The following configuration is generated:

hasExistingTests=true  
MINDTRACE_OPERATION_MODE=baseline-first  
MINDTRACE_MODE=<selected framework style>

Next automatic action:

Run Baseline Scan Mode.

Baseline mode rules:

- Healing disabled
- Retries disabled
- Quarantine disabled
- Policy in report-only mode
- No mutation of client tests

---

## If answer = no

MindTrace enters scaffold generation mode.

Generated configuration:

hasExistingTests=false  
MINDTRACE_OPERATION_MODE=scaffold  
MINDTRACE_MODE=native (default unless user specifies otherwise)

Generated structure example:

frameworks/
style1-native/
tests/

All tests must read configuration from:

.env  
BASE_URL=<defined value>

No hardcoded URLs allowed.

---

# 3. Question 2 — Execution Environment

## Prompt

Where do you run your tests?

Allowed values:

- local
- ci
- staging
- prod-like

---

## Runtime Mapping

MINDTRACE_PROFILE=<selected value>

Example:

MINDTRACE_PROFILE=ci

---

## Profile Behavior

local:

- Standard timeouts
- Minimal artifact capture
- Healing allowed if enabled

ci:

- Strict timeout enforcement
- Full artifact capture
- Policy enforcement active

staging:

- Full evidence capture
- Stability tracking enabled
- Healing allowed (bounded)

prod-like:

- Safety restrictions enabled
- No destructive operations
- Healing in assist-only mode
- Rate limiting protections

Profiles affect runtime behavior only.
They never alter test source code.

---

# 4. Question 3 — Strictness Level

## Prompt

What strictness level do you want?

Allowed values:

- conservative
- balanced
- strict

---

## Runtime Mapping

MINDTRACE_STRICTNESS=<selected value>

This selects a policy preset.

---

## Conservative Preset

- Higher retry tolerance
- Higher quarantine threshold
- Stability scoring less strict
- Warnings do not fail build

Intended for:

- Early adoption
- Legacy unstable suites

---

## Balanced Preset (Default)

- Standard retry count
- Quarantine enabled
- Stability scoring enforced
- Failures respected

Intended for:

- Normal enterprise usage

---

## Strict Preset

- Minimal retries
- Low quarantine tolerance
- Missing artifacts fail build
- Strict stability enforcement

Intended for:

- Regulated environments
- Production-grade enforcement

---

# 5. Final Configuration Object

After onboarding, MindTrace generates a normalized configuration profile.

Example:

{
"hasExistingTests": true,
"frameworkStyle": "native",
"executionProfile": "ci",
"strictness": "balanced",
"operationMode": "baseline-first"
}

This profile is written to:

runs/<runName>/metadata.json

And drives:

- Execution mode
- Policy engine behavior
- Artifact requirements
- Stability scoring rules
- Exit code mapping

---

# 6. Deterministic Guarantees

Onboarding must:

- Never modify client test source files
- Never require structural refactoring
- Never force framework migration
- Only configure runtime behavior

MindTrace is additive.

---

# 7. Extensibility (Reserved)

Future optional prompts may include:

- Enable AI assistance? (off / assistive)
- Enable stability scoring? (yes / no)
- Enable healing mode? (off / bounded / aggressive)
- Run history retention window?

These remain optional and must never break existing flows.

---

# 8. Design Principle

Onboarding must be:

- Minimal
- Deterministic
- Enterprise-safe
- Non-invasive
- Additive

The objective is integration without disruption.
