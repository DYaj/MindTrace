# Phase 1: Real Detection & Page Cache Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace Phase 0 placeholders with real repository detection and add optional contract-derived page cache.

**Architecture:** Integrate existing `scanRepo()` and detection functions (`detectFramework`, `inferStructure`, `detectLocatorStyle`, `detectAssertionStyle`) into `generateContractBundle()`. Add optional `buildCache` parameter that triggers contract-derived page cache generation. Migrate canonical contract path from `.mindtrace/contracts` to `.mcp-contract` with backward compatibility.

**Tech Stack:** TypeScript, Node.js, fast-glob (scanning), AJV (validation), SHA256 (fingerprinting), Vitest (testing)

**Design Doc:** [docs/plans/2026-03-03-phase1-real-detection-page-cache-design.md](2026-03-03-phase1-real-detection-page-cache-design.md)

---

## Task 1: Path Migration - Add Contract Directory Resolution

**Files:**
- Modify: `repo-intelligence-mcp/src/tools/generateContractBundle.ts:91-95`
- Create: `repo-intelligence-mcp/src/core/paths.ts`
- Test: `repo-intelligence-mcp/src/core/__tests__/paths.test.ts`

**Step 1: Write the failing test**

Create `repo-intelligence-mcp/src/core/__tests__/paths.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import * as crypto from "node:crypto";
import { resolveContractDir } from "../paths.js";

describe("resolveContractDir", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `test-paths-${crypto.randomUUID()}`);
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("returns canonical .mcp-contract path when it exists", async () => {
    const canonical = path.join(tempDir, ".mcp-contract");
    await fs.mkdir(canonical, { recursive: true });

    const result = resolveContractDir(tempDir);
    expect(result.dir).toBe(canonical);
    expect(result.isLegacy).toBe(false);
  });

  it("falls back to legacy .mindtrace/contracts when canonical doesn't exist", async () => {
    const legacy = path.join(tempDir, ".mindtrace/contracts");
    await fs.mkdir(legacy, { recursive: true });

    const result = resolveContractDir(tempDir);
    expect(result.dir).toBe(legacy);
    expect(result.isLegacy).toBe(true);
  });

  it("prefers canonical over legacy when both exist", async () => {
    const canonical = path.join(tempDir, ".mcp-contract");
    const legacy = path.join(tempDir, ".mindtrace/contracts");
    await fs.mkdir(canonical, { recursive: true });
    await fs.mkdir(legacy, { recursive: true });

    const result = resolveContractDir(tempDir);
    expect(result.dir).toBe(canonical);
    expect(result.isLegacy).toBe(false);
  });

  it("returns canonical path when neither exists", async () => {
    const result = resolveContractDir(tempDir);
    expect(result.dir).toBe(path.join(tempDir, ".mcp-contract"));
    expect(result.isLegacy).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd repo-intelligence-mcp && npm test -- paths.test.ts`
Expected: FAIL with "Cannot find module '../paths.js'"

**Step 3: Write minimal implementation**

Create `repo-intelligence-mcp/src/core/paths.ts`:

```typescript
import * as fs from "node:fs";
import * as path from "node:path";

export type ContractDirResult = {
  dir: string;
  isLegacy: boolean;
};

/**
 * Resolve contract directory with fallback to legacy path.
 *
 * Priority:
 * 1. .mcp-contract/ (canonical)
 * 2. .mindtrace/contracts/ (legacy fallback)
 * 3. .mcp-contract/ (default for creation)
 *
 * @param repoRoot - Repository root path
 * @returns Contract directory path and whether it's legacy
 */
export function resolveContractDir(repoRoot: string): ContractDirResult {
  const canonical = path.join(repoRoot, ".mcp-contract");
  const legacy = path.join(repoRoot, ".mindtrace", "contracts");

  // Prefer canonical
  if (fs.existsSync(canonical)) {
    return { dir: canonical, isLegacy: false };
  }

  // Fallback to legacy
  if (fs.existsSync(legacy)) {
    return { dir: legacy, isLegacy: true };
  }

  // Neither exists - use canonical for creation
  return { dir: canonical, isLegacy: false };
}
```

**Step 4: Run test to verify it passes**

Run: `cd repo-intelligence-mcp && npm test -- paths.test.ts`
Expected: PASS (all 4 tests)

**Step 5: Commit**

```bash
git add repo-intelligence-mcp/src/core/paths.ts repo-intelligence-mcp/src/core/__tests__/paths.test.ts
git commit -m "feat(phase1): add contract directory resolution with legacy fallback

- Canonical path: .mcp-contract/
- Legacy fallback: .mindtrace/contracts/ (read-only)
- Tests verify priority and fallback behavior

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Update generateContractBundle to Use New Path Resolution

**Files:**
- Modify: `repo-intelligence-mcp/src/tools/generateContractBundle.ts:1-10, 91-95`
- Modify: `repo-intelligence-mcp/src/contracts/writeContractBundle.ts:1-10`
- Modify: `repo-intelligence-mcp/src/contracts/validateContractBundle.ts:1-10`

**Step 1: Update imports in generateContractBundle.ts**

Modify `repo-intelligence-mcp/src/tools/generateContractBundle.ts`:

```typescript
// Add to imports (around line 7)
import { resolveContractDir } from "../core/paths.js";

// Replace hardcoded path (around line 93)
// OLD:
// const contractDir = path.join(params.repoRoot, ".mindtrace", "contracts");

// NEW:
const { dir: contractDir, isLegacy } = resolveContractDir(params.repoRoot);

// Emit warning if legacy path used (around line 95)
if (isLegacy) {
  console.warn("⚠️  Using legacy contract directory: .mindtrace/contracts/ (migrate to .mcp-contract/)");
}
```

**Step 2: Run existing tests to verify no regression**

Run: `cd repo-intelligence-mcp && npm test -- generateContractBundle.test.ts`
Expected: PASS (all existing tests still pass)

**Step 3: Commit**

```bash
git add repo-intelligence-mcp/src/tools/generateContractBundle.ts
git commit -m "refactor(phase1): use resolveContractDir in generateContractBundle

- Canonical path: .mcp-contract/
- Legacy fallback with warning
- No breaking changes to existing tests

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Replace scanRepo Placeholder

**Files:**
- Modify: `repo-intelligence-mcp/src/tools/generateContractBundle.ts:31-38`

**Step 1: Write test for real repository scanning**

Add to `repo-intelligence-mcp/src/tools/__tests__/generateContractBundle.integration.test.ts`:

```typescript
it("uses real scanRepo instead of placeholder topology", async () => {
  // Create a test file to ensure scanning works
  await fs.writeFile(path.join(testRepoRoot, "test.spec.ts"), `
import { test, expect } from '@playwright/test';

test('example', async ({ page }) => {
  await page.goto('https://example.com');
  expect(await page.title()).toBe('Example');
});
  `);

  const result = await generateContractBundle({
    repoRoot: testRepoRoot,
    mode: "strict"
  });

  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("Should not fail");

  // Read generated contract
  const contractPath = path.join(testRepoRoot, ".mcp-contract/automation-contract.json");
  const contract = JSON.parse(await fs.readFile(contractPath, "utf-8"));

  // Verify topology includes scanned files (not empty placeholder)
  expect(contract.repoTopology).toBeDefined();
  expect(contract.repoTopology.files.count).toBeGreaterThan(0);
  expect(contract.repoTopology.files.paths).toContain("test.spec.ts");
});
```

**Step 2: Run test to verify it fails**

Run: `cd repo-intelligence-mcp && npm test -- generateContractBundle.integration.test.ts`
Expected: FAIL (topology is still placeholder with empty files)

**Step 3: Replace placeholder with real scanRepo**

Modify `repo-intelligence-mcp/src/tools/generateContractBundle.ts`:

```typescript
// Add import at top (around line 8)
import { scanRepo } from "./scanRepo.js";

// Replace placeholder (around line 31-38)
// OLD:
// const topology: RepoTopologyJSON = {
//   repoRoot: params.repoRoot,
//   entrypoints: [],
//   files: [],
//   packages: []
// };

// NEW:
const topology = await scanRepo({
  rootPath: params.repoRoot,
  // Use defaults for ignore dirs/globs and limits
});

// Remove TODO comment (line 32)
```

**Step 4: Run test to verify it passes**

Run: `cd repo-intelligence-mcp && npm test -- generateContractBundle.integration.test.ts`
Expected: PASS (topology now includes real scanned files)

**Step 5: Commit**

```bash
git add repo-intelligence-mcp/src/tools/generateContractBundle.ts repo-intelligence-mcp/src/tools/__tests__/generateContractBundle.integration.test.ts
git commit -m "feat(phase1): replace scanRepo placeholder with real implementation

- Import and call real scanRepo function
- Remove hardcoded empty topology
- Test verifies scanned files appear in contract

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Replace detectFramework Placeholder

**Files:**
- Modify: `repo-intelligence-mcp/src/tools/generateContractBundle.ts:40-47`

**Step 1: Write test for real framework detection**

Add to `repo-intelligence-mcp/src/tools/__tests__/generateContractBundle.integration.test.ts`:

```typescript
it("detects framework from actual repository", async () => {
  // Create playwright.config.ts to ensure detection
  await fs.writeFile(path.join(testRepoRoot, "playwright.config.ts"), `
import { defineConfig } from '@playwright/test';
export default defineConfig({});
  `);

  // Create package.json with playwright dependency
  await fs.writeFile(path.join(testRepoRoot, "package.json"), JSON.stringify({
    name: "test-repo",
    dependencies: {
      "@playwright/test": "^1.40.0"
    }
  }));

  const result = await generateContractBundle({
    repoRoot: testRepoRoot,
    mode: "strict"
  });

  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("Should not fail");

  const contractPath = path.join(testRepoRoot, ".mcp-contract/automation-contract.json");
  const contract = JSON.parse(await fs.readFile(contractPath, "utf-8"));

  // Verify real framework detection
  expect(contract.framework).toBe("playwright");
  expect(contract.frameworkConfidence).toBeGreaterThan(0.5);
});
```

**Step 2: Run test to verify it fails**

Run: `cd repo-intelligence-mcp && npm test -- generateContractBundle.integration.test.ts`
Expected: FAIL (framework is still hardcoded "playwright" with confidence 0.9)

**Step 3: Replace placeholder with real detectFramework**

Modify `repo-intelligence-mcp/src/tools/generateContractBundle.ts`:

```typescript
// Add import at top (around line 9)
import { detectFramework } from "./infer.js";

// Replace placeholder (around line 42-47)
// OLD:
// const framework: import("../types/contract.js").DetectFrameworkOutput = {
//   framework: "playwright",
//   confidence: 0.9,
//   signalsUsed: [],
//   notes: []
// };

// NEW:
const frameworkDetection = detectFramework(topology);

// Remove TODO comment (line 41)
```

**Step 4: Update contract generation to use detection result**

Modify `repo-intelligence-mcp/src/tools/generateContractBundle.ts` (around line 92):

```typescript
// Update generateAutomationContract call
const automationContract = generateAutomationContract({
  topology,
  framework: frameworkDetection,  // Use real detection
  structure,
  locatorStyle,
  assertionStyle,
  stylesDetected,
  entrypoints,
  primaryStyle
});
```

**Step 5: Run test to verify it passes**

Run: `cd repo-intelligence-mcp && npm test -- generateContractBundle.integration.test.ts`
Expected: PASS (framework is now detected from config file)

**Step 6: Commit**

```bash
git add repo-intelligence-mcp/src/tools/generateContractBundle.ts repo-intelligence-mcp/src/tools/__tests__/generateContractBundle.integration.test.ts
git commit -m "feat(phase1): replace detectFramework placeholder with real detection

- Import and call real detectFramework function
- Remove hardcoded framework object
- Test verifies framework detected from playwright.config.ts

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Replace inferStructure Placeholder

**Files:**
- Modify: `repo-intelligence-mcp/src/tools/generateContractBundle.ts:49-66`

**Step 1: Write test for real structure detection**

Add to `repo-intelligence-mcp/src/tools/__tests__/generateContractBundle.integration.test.ts`:

```typescript
it("infers structure from actual repository patterns", async () => {
  // Create BDD-style structure
  await fs.mkdir(path.join(testRepoRoot, "features"), { recursive: true });
  await fs.writeFile(path.join(testRepoRoot, "features/login.feature"), `
Feature: Login
  Scenario: Successful login
    Given I am on the login page
    When I enter credentials
    Then I should be logged in
  `);

  await fs.mkdir(path.join(testRepoRoot, "step_definitions"), { recursive: true });
  await fs.writeFile(path.join(testRepoRoot, "step_definitions/login.ts"), `
import { Given, When, Then } from '@cucumber/cucumber';
  `);

  const result = await generateContractBundle({
    repoRoot: testRepoRoot,
    mode: "strict"
  });

  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("Should not fail");

  const contractPath = path.join(testRepoRoot, ".mcp-contract/automation-contract.json");
  const contract = JSON.parse(await fs.readFile(contractPath, "utf-8"));

  // Verify BDD structure detected
  expect(contract.structure.style).toBe("bdd");
  expect(contract.structure.bdd.present).toBe(true);
  expect(contract.structure.bdd.featurePaths).toContain("features/login.feature");
});
```

**Step 2: Run test to verify it fails**

Run: `cd repo-intelligence-mcp && npm test -- generateContractBundle.integration.test.ts`
Expected: FAIL (structure is still hardcoded "native")

**Step 3: Replace placeholder with real inferStructure**

Modify `repo-intelligence-mcp/src/tools/generateContractBundle.ts`:

```typescript
// Add import at top (around line 10)
import { inferStructure } from "./infer.js";

// Replace placeholder (around line 49-66)
// OLD:
// const structure: import("../types/contract.js").InferStructureOutput = {
//   style: "native",
//   confidence: 0.8,
//   signalsUsed: [],
//   structure: { ... }
// };

// NEW:
const structureDetection = inferStructure(topology);

// Remove TODO comment (line 41)
```

**Step 4: Update contract generation call**

Modify generateAutomationContract call (around line 92):

```typescript
const automationContract = generateAutomationContract({
  topology,
  framework: frameworkDetection,
  structure: structureDetection,  // Use real detection
  locatorStyle,
  assertionStyle,
  stylesDetected,
  entrypoints,
  primaryStyle
});
```

**Step 5: Run test to verify it passes**

Run: `cd repo-intelligence-mcp && npm test -- generateContractBundle.integration.test.ts`
Expected: PASS (BDD structure detected from feature files)

**Step 6: Commit**

```bash
git add repo-intelligence-mcp/src/tools/generateContractBundle.ts repo-intelligence-mcp/src/tools/__tests__/generateContractBundle.integration.test.ts
git commit -m "feat(phase1): replace inferStructure placeholder with real detection

- Import and call real inferStructure function
- Remove hardcoded structure object
- Test verifies BDD structure detected from .feature files

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Replace detectLocatorStyle Placeholder

**Files:**
- Modify: `repo-intelligence-mcp/src/tools/generateContractBundle.ts:68-76`

**Step 1: Write test for real locator style detection**

Add to `repo-intelligence-mcp/src/tools/__tests__/generateContractBundle.integration.test.ts`:

```typescript
it("detects locator style from actual test files", async () => {
  // Create test file with data-testid usage
  await fs.writeFile(path.join(testRepoRoot, "login.spec.ts"), `
import { test, expect } from '@playwright/test';

test('login', async ({ page }) => {
  await page.getByTestId('username').fill('user');
  await page.getByTestId('password').fill('pass');
  await page.getByRole('button', { name: 'Login' }).click();
});
  `);

  const result = await generateContractBundle({
    repoRoot: testRepoRoot,
    mode: "strict"
  });

  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("Should not fail");

  const contractPath = path.join(testRepoRoot, ".mcp-contract/automation-contract.json");
  const contract = JSON.parse(await fs.readFile(contractPath, "utf-8"));

  // Verify locator preferences detected from test patterns
  expect(contract.locatorStyle.preferenceOrder).toContain("data-testid");
  expect(contract.locatorStyle.preferenceOrder).toContain("role");
});
```

**Step 2: Run test to verify it fails**

Run: `cd repo-intelligence-mcp && npm test -- generateContractBundle.integration.test.ts`
Expected: FAIL (locator style is still hardcoded)

**Step 3: Replace placeholder with real detectLocatorStyle**

Modify `repo-intelligence-mcp/src/tools/generateContractBundle.ts`:

```typescript
// Add import at top (around line 11)
import { detectLocatorStyle } from "./infer.js";

// Replace placeholder (around line 68-76)
// OLD:
// const locatorStyle: import("../types/contract.js").DetectLocatorStyleOutput = {
//   preferenceOrder: ["role", "css"],
//   confidence: 0.85,
//   signalsUsed: [],
//   orgConventions: { ... }
// };

// NEW:
const locatorDetection = detectLocatorStyle(topology);
```

**Step 4: Update contract generation call**

Modify generateAutomationContract call:

```typescript
const automationContract = generateAutomationContract({
  topology,
  framework: frameworkDetection,
  structure: structureDetection,
  locatorStyle: locatorDetection,  // Use real detection
  assertionStyle,
  stylesDetected,
  entrypoints,
  primaryStyle
});
```

**Step 5: Run test to verify it passes**

Run: `cd repo-intelligence-mcp && npm test -- generateContractBundle.integration.test.ts`
Expected: PASS (locator preferences detected from test file patterns)

**Step 6: Commit**

```bash
git add repo-intelligence-mcp/src/tools/generateContractBundle.ts repo-intelligence-mcp/src/tools/__tests__/generateContractBundle.integration.test.ts
git commit -m "feat(phase1): replace detectLocatorStyle placeholder with real detection

- Import and call real detectLocatorStyle function
- Remove hardcoded locator preferences
- Test verifies data-testid and role detected from test files

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Replace detectAssertionStyle Placeholder

**Files:**
- Modify: `repo-intelligence-mcp/src/tools/generateContractBundle.ts:78-83`

**Step 1: Write test for real assertion style detection**

Add to `repo-intelligence-mcp/src/tools/__tests__/generateContractBundle.integration.test.ts`:

```typescript
it("detects assertion style from actual test files", async () => {
  // Create test file with expect() assertions
  await fs.writeFile(path.join(testRepoRoot, "assertions.spec.ts"), `
import { test, expect } from '@playwright/test';

test('assertions', async ({ page }) => {
  expect(await page.title()).toBe('Example');
  await expect(page.locator('h1')).toHaveText('Welcome');
});
  `);

  const result = await generateContractBundle({
    repoRoot: testRepoRoot,
    mode: "strict"
  });

  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("Should not fail");

  const contractPath = path.join(testRepoRoot, ".mcp-contract/automation-contract.json");
  const contract = JSON.parse(await fs.readFile(contractPath, "utf-8"));

  // Verify expect-style assertions detected
  expect(contract.assertionStyle.primary).toBe("expect");
});
```

**Step 2: Run test to verify it fails**

Run: `cd repo-intelligence-mcp && npm test -- generateContractBundle.integration.test.ts`
Expected: FAIL (assertion style is still hardcoded)

**Step 3: Replace placeholder with real detectAssertionStyle**

Modify `repo-intelligence-mcp/src/tools/generateContractBundle.ts`:

```typescript
// Add import at top (around line 12)
import { detectAssertionStyle } from "./infer.js";

// Replace placeholder (around line 78-83)
// OLD:
// const assertionStyle: import("../types/contract.js").DetectAssertionStyleOutput = {
//   primary: "expect",
//   confidence: 0.9,
//   wrappers: [],
//   signalsUsed: []
// };

// NEW:
const assertionDetection = detectAssertionStyle(topology);
```

**Step 4: Update contract generation call**

Modify generateAutomationContract call:

```typescript
const automationContract = generateAutomationContract({
  topology,
  framework: frameworkDetection,
  structure: structureDetection,
  locatorStyle: locatorDetection,
  assertionStyle: assertionDetection,  // Use real detection
  stylesDetected,
  entrypoints,
  primaryStyle
});
```

**Step 5: Run test to verify it passes**

Run: `cd repo-intelligence-mcp && npm test -- generateContractBundle.integration.test.ts`
Expected: PASS (expect assertions detected from test files)

**Step 6: Commit**

```bash
git add repo-intelligence-mcp/src/tools/generateContractBundle.ts repo-intelligence-mcp/src/tools/__tests__/generateContractBundle.integration.test.ts
git commit -m "feat(phase1): replace detectAssertionStyle placeholder with real detection

- Import and call real detectAssertionStyle function
- Remove hardcoded assertion style
- Test verifies expect() style detected from test files

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Add buildCache Parameter to generateContractBundle

**Files:**
- Modify: `repo-intelligence-mcp/src/tools/generateContractBundle.ts:24-27, 220-230`
- Modify: `repo-intelligence-mcp/src/tools/generateContractBundle.ts` (add type for result)

**Step 1: Update GenerateContractBundleResult type**

Modify `repo-intelligence-mcp/src/tools/generateContractBundle.ts`:

```typescript
// Update type (around line 12-14)
export type GenerateContractBundleResult =
  | { ok: true; contractSha256: string; filesWritten: string[] }  // Rename hash → contractSha256
  | { ok: false; error: string };
```

**Step 2: Add buildCache parameter**

Modify function signature (around line 24-27):

```typescript
export async function generateContractBundle(params: {
  repoRoot: string;
  mode?: "strict" | "best_effort";
  buildCache?: boolean;  // NEW: default false
}): Promise<GenerateContractBundleResult>
```

**Step 3: Add placeholder for cache building (around line 220)**

After fingerprint computation and before return:

```typescript
// Step 10 (NEW): Optionally build cache
if (params.buildCache) {
  // TODO: Implement cache building in next task
  console.log("Cache building requested but not yet implemented");
}

return {
  ok: true,
  contractSha256: fpResult.fingerprint,  // Rename hash → contractSha256
  filesWritten: [
    "automation-contract.json",
    "contract.fingerprint.sha256",
    "contract.meta.json",
    "page-key-policy.json"
  ]
};
```

**Step 4: Update all existing references from `hash` to `contractSha256`**

Search and replace in `generateContractBundle.ts`:
- `result.hash` → `result.contractSha256`

**Step 5: Run tests to verify no regression**

Run: `cd repo-intelligence-mcp && npm test -- generateContractBundle`
Expected: PASS (all tests still work, buildCache parameter optional)

**Step 6: Commit**

```bash
git add repo-intelligence-mcp/src/tools/generateContractBundle.ts
git commit -m "feat(phase1): add buildCache parameter to generateContractBundle

- Add optional buildCache parameter (default false)
- Rename result.hash to result.contractSha256
- Add placeholder for cache building (implemented in next task)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 9: Implement Contract-Derived Page Cache Builder

**Files:**
- Modify: `repo-intelligence-mcp/src/tools/buildPageCache.ts:1-50`
- Create: `repo-intelligence-mcp/src/tools/__tests__/buildPageCache.test.ts`

**Step 1: Review existing buildPageCache signature**

Check current signature in `repo-intelligence-mcp/src/tools/buildPageCache.ts` and verify it needs updating to be contract-derived (no RepoTopologyJSON parameter).

**Step 2: Write test for contract-derived cache**

Create `repo-intelligence-mcp/src/tools/__tests__/buildPageCache.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import * as crypto from "node:crypto";
import { buildPageCache } from "../buildPageCache.js";
import type { AutomationContract, PageKeyPolicy } from "../../types/contract.js";

describe("buildPageCache", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `test-cache-${crypto.randomUUID()}`);
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("builds cache from contract data only (no raw repo access)", async () => {
    const mockContract: AutomationContract = {
      schemaVersion: "0.1.0",
      framework: "playwright",
      structure: { style: "native" },
      // ... other required fields
    };

    const mockPolicy: PageKeyPolicy = {
      schemaVersion: "0.1.0",
      rules: [],
      // ... other required fields
    };

    const contractSha256 = "abc123def456"; // Mock hash

    const result = await buildPageCache({
      automationContract: mockContract,
      pageKeyPolicy: mockPolicy,
      contractSha256,
      outputDir: tempDir
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Should not fail");

    // Verify cache files written
    const cacheFiles = await fs.readdir(path.join(tempDir, "pages"));
    expect(cacheFiles.length).toBeGreaterThan(0);

    // Verify all cache files include contractSha256
    for (const file of cacheFiles) {
      const cacheEntry = JSON.parse(
        await fs.readFile(path.join(tempDir, "pages", file), "utf-8")
      );
      expect(cacheEntry.contractSha256).toBe(contractSha256);
      expect(cacheEntry.schemaVersion).toBeDefined();
      expect(cacheEntry.pageId).toBeDefined();
      expect(cacheEntry.generatedAt).toBeUndefined(); // NO timestamp
    }
  });

  it("rejects RepoTopologyJSON parameter (compile-time type check)", () => {
    // This is a type-level test - if uncommented, should fail to compile
    // expectTypeError(() => {
    //   buildPageCache({
    //     topology: mockTopology,  // ❌ Should not compile
    //     contractSha256: "abc123"
    //   });
    // });
  });
});
```

**Step 3: Run test to verify current behavior**

Run: `cd repo-intelligence-mcp && npm test -- buildPageCache.test.ts`
Expected: May FAIL or PASS depending on current buildPageCache implementation

**Step 4: Update buildPageCache signature to be contract-derived**

Modify `repo-intelligence-mcp/src/tools/buildPageCache.ts`:

```typescript
import type { AutomationContract, PageKeyPolicy } from "../types/contract.js";
import type { PageCacheIndex } from "../types/pageCache.js";

export type BuildPageCacheParams = {
  automationContract: AutomationContract;  // ✅ FROM contract
  pageKeyPolicy: PageKeyPolicy;            // ✅ FROM contract
  contractSha256: string;                  // ✅ FROM fingerprint
  outputDir: string;                       // Where to write cache
};

export type BuildPageCacheResult =
  | { ok: true; pagesWritten: number }
  | { ok: false; error: string };

/**
 * Build page cache strictly from contract bundle (no raw repo access).
 *
 * BOUNDARY ENFORCEMENT: This function MUST NOT accept RepoTopologyJSON or
 * any raw repository scanning outputs. Cache is purely contract-derived.
 *
 * @param params - Contract data and output directory
 * @returns Result with pages written count or error
 */
export async function buildPageCache(
  params: BuildPageCacheParams
): Promise<BuildPageCacheResult> {
  try {
    // Extract page information from automation contract
    const pages = extractPagesFromContract(params.automationContract);

    // Create output directory
    const pagesDir = path.join(params.outputDir, "pages");
    await fs.mkdir(pagesDir, { recursive: true });

    // Write one file per page
    for (const page of pages) {
      const pageId = generatePageId(page);
      const cacheEntry = {
        pageId,
        contractSha256: params.contractSha256,
        schemaVersion: "0.1.0",
        generatedBy: `repo-intelligence-mcp@0.2.0`,
        // NO generatedAt timestamp (determinism)
        page: {
          path: page.path,
          semanticRole: page.semanticRole || "unknown",
          selectors: page.selectors || [],
          actions: page.actions || []
        }
      };

      await fs.writeFile(
        path.join(pagesDir, `${pageId}.json`),
        JSON.stringify(cacheEntry, null, 2),
        "utf-8"
      );
    }

    return { ok: true, pagesWritten: pages.length };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

function generatePageId(page: any): string {
  // Deterministic pageId from contract page identity
  const canonicalPath = page.path || "unknown";
  return canonicalPath.replace(/[\/\.]/g, "_").replace(/[^A-Za-z0-9_]/g, "");
}

function extractPagesFromContract(contract: AutomationContract): any[] {
  // Extract pages from contract structure
  // This is a simplified implementation - adjust based on actual contract schema
  return contract.pages || [];
}
```

**Step 5: Run test to verify it passes**

Run: `cd repo-intelligence-mcp && npm test -- buildPageCache.test.ts`
Expected: PASS (cache built from contract only)

**Step 6: Commit**

```bash
git add repo-intelligence-mcp/src/tools/buildPageCache.ts repo-intelligence-mcp/src/tools/__tests__/buildPageCache.test.ts
git commit -m "refactor(phase1): make buildPageCache contract-derived

- Remove RepoTopologyJSON parameter (boundary enforcement)
- Accept automationContract, pageKeyPolicy, contractSha256
- Include contractSha256 in every cache page
- NO timestamps (use generatedBy for provenance)
- Test verifies contract-only derivation

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 10: Integrate buildPageCache into generateContractBundle

**Files:**
- Modify: `repo-intelligence-mcp/src/tools/generateContractBundle.ts:220-230`

**Step 1: Write test for cache integration**

Add to `repo-intelligence-mcp/src/tools/__tests__/generateContractBundle.integration.test.ts`:

```typescript
it("builds contract-derived cache when buildCache: true", async () => {
  const result = await generateContractBundle({
    repoRoot: testRepoRoot,
    buildCache: true
  });

  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("Should not fail");

  // Verify cache directory exists
  const cachePath = path.join(testRepoRoot, ".mcp-cache/pages");
  const cacheExists = await fs.access(cachePath).then(() => true).catch(() => false);
  expect(cacheExists).toBe(true);

  // Verify cache files include contractSha256
  const cacheFiles = await fs.readdir(cachePath);
  expect(cacheFiles.length).toBeGreaterThan(0);

  for (const file of cacheFiles) {
    const cacheEntry = JSON.parse(
      await fs.readFile(path.join(cachePath, file), "utf-8")
    );
    expect(cacheEntry.contractSha256).toBe(result.contractSha256);
    expect(cacheEntry.generatedAt).toBeUndefined(); // NO timestamp
  }
});

it("skips cache building when buildCache: false (default)", async () => {
  const result = await generateContractBundle({
    repoRoot: testRepoRoot,
    buildCache: false  // Explicit false
  });

  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("Should not fail");

  // Verify cache directory does NOT exist
  const cachePath = path.join(testRepoRoot, ".mcp-cache");
  const cacheExists = await fs.access(cachePath).then(() => true).catch(() => false);
  expect(cacheExists).toBe(false);
});
```

**Step 2: Run test to verify it fails**

Run: `cd repo-intelligence-mcp && npm test -- generateContractBundle.integration.test.ts`
Expected: FAIL (cache building not yet implemented)

**Step 3: Implement cache building integration**

Modify `repo-intelligence-mcp/src/tools/generateContractBundle.ts`:

```typescript
// Add import at top (around line 13)
import { buildPageCache } from "./buildPageCache.js";

// Replace placeholder (around line 220-230)
// OLD:
// if (params.buildCache) {
//   console.log("Cache building requested but not yet implemented");
// }

// NEW:
if (params.buildCache) {
  const cacheDir = path.join(params.repoRoot, ".mcp-cache");

  // Read contract from disk (contract-derived boundary)
  const contractPath = path.join(contractDir, "automation-contract.json");
  const policyPath = path.join(contractDir, "page-key-policy.json");

  const contractJson = await fs.readFile(contractPath, "utf-8");
  const policyJson = await fs.readFile(policyPath, "utf-8");

  const automationContract = JSON.parse(contractJson);
  const pageKeyPolicy = JSON.parse(policyJson);

  const cacheResult = await buildPageCache({
    automationContract,
    pageKeyPolicy,
    contractSha256: fpResult.fingerprint,
    outputDir: cacheDir
  });

  if (!cacheResult.ok) {
    return { ok: false, error: `Cache building failed: ${cacheResult.error}` };
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd repo-intelligence-mcp && npm test -- generateContractBundle.integration.test.ts`
Expected: PASS (cache built when buildCache: true, skipped otherwise)

**Step 5: Commit**

```bash
git add repo-intelligence-mcp/src/tools/generateContractBundle.ts repo-intelligence-mcp/src/tools/__tests__/generateContractBundle.integration.test.ts
git commit -m "feat(phase1): integrate buildPageCache into contract bundle generation

- Import and call buildPageCache when buildCache: true
- Read contract from disk (enforce contract-derived boundary)
- Pass contractSha256 from fingerprint
- Test verifies cache built with correct hash linkage

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 11: Add Determinism Test for Byte-Identical Outputs

**Files:**
- Modify: `repo-intelligence-mcp/src/tools/__tests__/generateContractBundle.integration.test.ts`

**Step 1: Write byte-identical determinism test**

Add to `repo-intelligence-mcp/src/tools/__tests__/generateContractBundle.integration.test.ts`:

```typescript
it("produces byte-identical contracts and cache across independent runs", async () => {
  // Create two separate temp directories
  const tmp1 = path.join(os.tmpdir(), `phase1-test-1-${crypto.randomUUID()}`);
  const tmp2 = path.join(os.tmpdir(), `phase1-test-2-${crypto.randomUUID()}`);

  await fs.mkdir(tmp1, { recursive: true });
  await fs.mkdir(tmp2, { recursive: true });

  try {
    // Create identical test repos in both directories
    for (const tmpDir of [tmp1, tmp2]) {
      await fs.writeFile(
        path.join(tmpDir, "playwright.config.ts"),
        `import { defineConfig } from '@playwright/test';
export default defineConfig({});`
      );

      await fs.writeFile(
        path.join(tmpDir, "test.spec.ts"),
        `import { test, expect } from '@playwright/test';
test('example', async ({ page }) => {
  expect(true).toBe(true);
});`
      );

      await fs.writeFile(
        path.join(tmpDir, "package.json"),
        JSON.stringify({ name: "test", dependencies: { "@playwright/test": "^1.40.0" } })
      );
    }

    // Run contract generation twice independently
    const result1 = await generateContractBundle({
      repoRoot: tmp1,
      buildCache: true
    });

    const result2 = await generateContractBundle({
      repoRoot: tmp2,
      buildCache: true
    });

    // Verify contractSha256 is identical
    expect(result1.contractSha256).toBe(result2.contractSha256);

    // Verify contract file bytes are identical
    const contract1Bytes = await fs.readFile(
      path.join(tmp1, ".mcp-contract/automation-contract.json")
    );
    const contract2Bytes = await fs.readFile(
      path.join(tmp2, ".mcp-contract/automation-contract.json")
    );
    expect(contract1Bytes.equals(contract2Bytes)).toBe(true);

    // Verify cache file bytes are identical
    const cache1Files = await fs.readdir(path.join(tmp1, ".mcp-cache/pages"));
    const cache2Files = await fs.readdir(path.join(tmp2, ".mcp-cache/pages"));
    expect(cache1Files.sort()).toEqual(cache2Files.sort());

    for (const file of cache1Files) {
      const cache1Bytes = await fs.readFile(path.join(tmp1, ".mcp-cache/pages", file));
      const cache2Bytes = await fs.readFile(path.join(tmp2, ".mcp-cache/pages", file));
      expect(cache1Bytes.equals(cache2Bytes)).toBe(true);
    }
  } finally {
    await fs.rm(tmp1, { recursive: true, force: true });
    await fs.rm(tmp2, { recursive: true, force: true });
  }
});
```

**Step 2: Run test to verify determinism**

Run: `cd repo-intelligence-mcp && npm test -- generateContractBundle.integration.test.ts`
Expected: PASS (byte-identical outputs across runs)

**Step 3: Commit**

```bash
git add repo-intelligence-mcp/src/tools/__tests__/generateContractBundle.integration.test.ts
git commit -m "test(phase1): add determinism test for byte-identical outputs

- Create two independent temp repos with identical content
- Run contract+cache generation on both
- Verify contractSha256 is identical
- Verify contract and cache file bytes are identical

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 12: Update Unit Tests to Work with Real Detection

**Files:**
- Modify: `repo-intelligence-mcp/src/tools/__tests__/generateContractBundle.test.ts`

**Step 1: Update existing unit tests**

The existing unit tests may need adjustment to work with real detection instead of placeholders. Review and update as needed:

```typescript
it("generates complete contract bundle with all required files", async () => {
  // May need to create minimal test repo structure to ensure detection works
  await fs.writeFile(
    path.join(tempDir, "package.json"),
    JSON.stringify({ name: "test", dependencies: { "@playwright/test": "^1.40.0" } })
  );

  const result = await generateContractBundle({ repoRoot: tempDir });

  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("Should not fail");

  expect(result.contractSha256).toMatch(/^[a-f0-9]{64}$/);
  expect(result.filesWritten).toEqual([
    "automation-contract.json",
    "contract.fingerprint.sha256",
    "contract.meta.json",
    "page-key-policy.json"
  ]);

  // Verify all files exist
  const contractDir = path.join(tempDir, ".mcp-contract");  // Update path
  const files = await fs.readdir(contractDir);
  expect(files.sort()).toEqual(result.filesWritten.sort());
});
```

**Step 2: Run updated unit tests**

Run: `cd repo-intelligence-mcp && npm test -- generateContractBundle.test.ts`
Expected: PASS (all unit tests work with real detection)

**Step 3: Commit**

```bash
git add repo-intelligence-mcp/src/tools/__tests__/generateContractBundle.test.ts
git commit -m "test(phase1): update unit tests for real detection

- Create minimal test repo structure (package.json)
- Update contract directory path to .mcp-contract
- Verify tests pass with real detection instead of placeholders

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 13: Update MCP Server to Use New Contract Path

**Files:**
- Modify: `repo-intelligence-mcp/src/mcp/server.ts` (if it references contract paths)

**Step 1: Search for hardcoded contract paths in MCP server**

Run: `grep -n "mindtrace/contracts" repo-intelligence-mcp/src/mcp/server.ts`

**Step 2: If found, update to use resolveContractDir**

Modify any hardcoded paths to use the new resolution function.

**Step 3: Run tests to verify**

Run: `cd repo-intelligence-mcp && npm test`
Expected: PASS (all tests still work)

**Step 4: Commit (if changes made)**

```bash
git add repo-intelligence-mcp/src/mcp/server.ts
git commit -m "refactor(phase1): update MCP server to use canonical contract path

- Use .mcp-contract instead of hardcoded .mindtrace/contracts
- Maintain backward compatibility via resolveContractDir

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 14: Update Documentation

**Files:**
- Create: `repo-intelligence-mcp/README.phase1.md`
- Modify: `repo-intelligence-mcp/README.phase0.md` (update Next Steps section)

**Step 1: Create Phase 1 README**

Create `repo-intelligence-mcp/README.phase1.md`:

```markdown
# Phase 1: Real Detection & Page Cache

**Status**: Complete (Architecture Frozen)
**Design Doc**: [docs/plans/2026-03-03-phase1-real-detection-page-cache-design.md](../../docs/plans/2026-03-03-phase1-real-detection-page-cache-design.md)

## Overview

Phase 1 replaces Phase 0's placeholder detection data with real repository scanning and detection, and optionally builds a contract-derived page cache.

## Generated Files

### Contract Bundle (`.mcp-contract/`)

```
.mcp-contract/
├── automation-contract.json       # Master automation contract (real detection)
├── page-key-policy.json           # Page identity rules
├── contract.meta.json             # Contract metadata
└── contract.fingerprint.sha256    # SHA256 fingerprint (commit marker)
```

**Note**: Legacy path `.mindtrace/contracts/` is supported as read-only fallback.

### Page Cache (`.mcp-cache/`) - Optional

```
.mcp-cache/
├── pages/
│   ├── <pageId>.json             # One file per page (contract-derived)
│   └── ...
└── index.json                    # Optional index with all pageIds
```

**Key Property**: Every cache page includes `contractSha256` for drift detection.

## Usage

### Generate Contract Only (Default)

```bash
cd repo-intelligence-mcp
npm run mcp:server

# Via MCP tool:
generate_contract_bundle({ repoRoot: "/path/to/repo" })
```

### Generate Contract + Page Cache

```bash
# Via MCP tool:
generate_contract_bundle({
  repoRoot: "/path/to/repo",
  buildCache: true
})
```

### Programmatic

```typescript
import { generateContractBundle } from "./src/tools/generateContractBundle.js";

// Contract only (fast, enterprise-safe)
const result = await generateContractBundle({
  repoRoot: "/path/to/repo",
  mode: "strict"
});

// Contract + cache (dev convenience)
const resultWithCache = await generateContractBundle({
  repoRoot: "/path/to/repo",
  mode: "strict",
  buildCache: true  // Optional
});

if (result.ok) {
  console.log(`Contract: ${result.contractSha256}`);
  console.log(`Files: ${result.filesWritten.join(", ")}`);
}
```

## Real Detection

Phase 1 uses real repository scanning and detection:

- **`scanRepo()`**: File enumeration, signal generation
- **`detectFramework()`**: Playwright/Cypress/Selenium detection
- **`inferStructure()`**: BDD/POM/Native/Hybrid pattern detection
- **`detectLocatorStyle()`**: Locator preference detection (data-testid, role, etc.)
- **`detectAssertionStyle()`**: Assertion style detection (expect, should, etc.)

## Phase 1 Guarantees

✅ **Deterministic Output**: Same repo → byte-identical contracts + cache
✅ **Contract-Derived Cache**: Cache built strictly from contract (no raw repo access)
✅ **Hash Linkage**: Every cache page includes `contractSha256`
✅ **Schema Validation**: Both contract and cache pass strict schema validation
✅ **Backward Compatible**: Legacy `.mindtrace/contracts/` read fallback

## Migration from Phase 0

**Contract Directory:**
- **Old**: `.mindtrace/contracts/`
- **New**: `.mcp-contract/` (canonical)
- **Fallback**: Legacy path supported (read-only, emits warning)

**No Breaking Changes:**
- Existing Phase 0 contracts in `.mindtrace/contracts/` still work
- Phase 1 will read from legacy path if canonical doesn't exist
- Warning emitted: `⚠️  Using legacy contract directory`

## Next Steps

After Phase 1 completion:

1. **Phase 2**: Runtime contract loader
   - Load contracts during test execution
   - Contract-aware runtime context
   - Enforce cache freshness (validate `contractSha256`)

2. **Phase 3**: Healing engine upgrade (contract-aware)
3. **Phase 4**: Cross-framework adapters

## References

- **Design Doc**: [docs/plans/2026-03-03-phase1-real-detection-page-cache-design.md](../../docs/plans/2026-03-03-phase1-real-detection-page-cache-design.md)
- **Phase 0 README**: [README.phase0.md](README.phase0.md)
```

**Step 2: Update Phase 0 README Next Steps**

Modify `repo-intelligence-mcp/README.phase0.md`:

```markdown
## Next Steps

After Phase 0 completion:

1. ✅ **Phase 1**: Real Detection & Page Cache (COMPLETE)
   - Real repository scanning (replaced placeholders)
   - Real framework/locator/assertion detection
   - Optional contract-derived page cache
   - See: [README.phase1.md](README.phase1.md)

2. **Phase 2**: Runtime contract loader
   - Load contracts during test execution
   - Contract-aware runtime context

3. **Phase 3**: Healing engine upgrade (contract-aware)
```

**Step 3: Commit documentation**

```bash
git add repo-intelligence-mcp/README.phase1.md repo-intelligence-mcp/README.phase0.md
git commit -m "docs(phase1): add Phase 1 README and update Phase 0 next steps

- Create README.phase1.md with usage and migration guide
- Update Phase 0 README to mark Phase 1 as complete
- Document contract directory migration (.mindtrace → .mcp-contract)
- Document buildCache parameter usage

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 15: Final Verification & Completion

**Files:**
- None (verification only)

**Step 1: Run full test suite**

Run: `cd repo-intelligence-mcp && npm test`
Expected: ALL tests PASS

**Step 2: Verify all acceptance criteria**

Manually verify:
- ✅ Determinism: Same repo → byte-identical contracts + cache
- ✅ Hash linking: Every cache page includes `contractSha256`
- ✅ Drift handling: Cache validation possible (Phase 2 enforces)
- ✅ Strict validation: Contract + cache pass schema validation
- ✅ Real detection: All placeholders replaced
- ✅ Contract purity: buildPageCache is contract-derived
- ✅ Backward compatibility: Legacy path works with warning
- ✅ Enterprise safety: buildCache: false by default

**Step 3: Create final completion commit**

```bash
git commit --allow-empty -m "feat(phase1): real detection & page cache implementation complete

All acceptance criteria met:
✅ Deterministic output (same repo → byte-identical contracts + cache)
✅ Hash linkage (contractSha256 in every cache page)
✅ Real detection (scanRepo, detectFramework, inferStructure, etc.)
✅ Contract-derived cache (buildPageCache boundary enforced)
✅ Schema validation (contract + cache pass strict validation)
✅ Backward compatibility (.mindtrace/contracts fallback)
✅ Enterprise safety (buildCache: false default)
✅ Path migration (.mcp-contract canonical)

Tasks: 15/15 complete
Tests: All passing
Ready for Phase 2 (Runtime Contract Loader)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Summary

**Total Tasks**: 15
**Estimated Time**: 6-8 hours

**Key Milestones**:
1. Tasks 1-2: Path migration (`.mindtrace/contracts` → `.mcp-contract`)
2. Tasks 3-7: Replace all detection placeholders with real functions
3. Tasks 8-10: Add optional contract-derived page cache
4. Tasks 11-13: Testing and verification
5. Tasks 14-15: Documentation and completion

**Dependencies**:
- All existing Phase 0 code remains stable
- No breaking changes to existing tests
- Backward compatibility maintained throughout

**Next Phase**: After Phase 1 approval, move to Phase 2 (Runtime Contract Loader)
