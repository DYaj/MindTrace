# BreakLine Terminology Guide

**Purpose:** Ensure consistent wording across UI, API, and documentation.

---

## Core Concepts

### Run (noun, singular)
**Definition:** A single test execution instance.

**Usage:**
- ✅ "View run details"
- ✅ "Delete run"
- ✅ "Run completed"
- ❌ "Test run details"
- ❌ "Test execution"

**Context:** Individual execution entity.

---

### Runs (noun, plural)
**Definition:** Collection of test executions.

**Usage:**
- ✅ "Runs page"
- ✅ "View runs"
- ✅ "No runs yet"
- ❌ "Test runs page"
- ❌ "View test runs"

**Context:** List or history view.

---

### Run Tests (verb)
**Definition:** Action to execute tests.

**Usage:**
- ✅ "Run Tests" (button)
- ✅ "Running tests..."
- ✅ "Run tests with governance"
- ❌ "Execute tests"
- ❌ "Start test run"

**Context:** Action buttons, commands.

---

### Contract (noun)
**Definition:** Automation contract definition.

**Usage:**
- ✅ "Generate Contract"
- ✅ "Contract page"
- ✅ "Contract exists"
- ❌ "Automation contract" (except in technical docs)
- ❌ "Contract data"

**Context:** Always singular, no modifiers in UI.

---

### Cache (noun)
**Definition:** Page cache for detection.

**Usage:**
- ✅ "Build Cache"
- ✅ "Cache page"
- ✅ "Cache exists"
- ❌ "Cache data"
- ❌ "Page cache" (except when being specific)

**Context:** Always singular, no modifiers in UI.

---

### Integrity (noun)
**Definition:** System validation state.

**Usage:**
- ✅ "Check Integrity"
- ✅ "Integrity page"
- ✅ "Integrity gates"
- ❌ "Integrity check" (except as verb)
- ❌ "Validation"

**Context:** Always refers to gate-based validation.

---

## Status Messages

### In Progress
- ✅ "Running tests..."
- ✅ "Generating contract..."
- ✅ "Building cache..."
- ❌ "Test run in progress"
- ❌ "Contract generation in progress"

### Completion
- ✅ "Run completed"
- ✅ "Contract generated"
- ✅ "Cache built"
- ❌ "Test run complete"
- ❌ "Contract generation complete"

### Errors
- ✅ "Failed to run tests"
- ✅ "Failed to generate contract"
- ✅ "Failed to build cache"
- ❌ "Test run failed"
- ❌ "Contract generation failed"

---

## Common Mistakes

### ❌ "Test Run" → ✅ "Run"
Individual execution entity.

### ❌ "Cache data" → ✅ "Cache"
Cache is the concept, not data about cache.

### ❌ "Contract file" → ✅ "Contract"
Contract is the whole, not individual files.

### ❌ "Execute tests" → ✅ "Run tests"
Verb form uses "run".

---

## API Consistency

### Endpoints
- `/api/runs` (plural)
- `/api/runs/:runId` (singular)
- `/api/contract` (singular)
- `/api/cache` (singular)
- `/api/integrity` (singular)

### Types
- `RunListItem` (not TestRun)
- `RunDetail` (not TestRunDetail)
- `ContractStatus` (not AutomationContractStatus)
- `CacheStatus` (not PageCacheStatus)

---

## Documentation Consistency

### README/Docs
Use full names when introducing concepts:
- "automation contract" (first mention)
- "Contract" (subsequent)

### UI
Use short names consistently:
- Always "Contract" (not "automation contract")
- Always "Cache" (not "page cache")
- Always "Run" (not "test run")

---

**Last Updated:** 2026-03-19  
**Stage:** 8 (Trust & Polish)
