# MindTrace for Playwright

**Governance-first test automation with production UI.**

Playwright + compliance layer + operational dashboard. Deterministic artifacts. Contract-driven execution. Complete visibility.

---

## What It Does

Transforms Playwright tests into a governed execution platform:

- **Contract** → Define what should be tested
- **Cache** → Detect what can be tested
- **Integrity Gates** → Verify everything aligns
- **Run** → Execute with governance + audit trail
- **UI** → See exactly what's happening

**Exit codes differentiate:** test failures (1) | infrastructure (2) | compliance violations (3)

**Healing uses 5-tier authority:** Contract > Cache > Last-Known-Good > Fallback > LLM (advisory only)

---

## Quick Start

```bash
npm install && npm run dev
# Open http://localhost:5173
```

**First workflow:**
1. Generate Contract
2. Build Cache
3. Check Integrity
4. Run Tests

**See:** [Getting Started Guide](GETTING_STARTED.md) for details.

---

## Why MindTrace

**Problem:** Playwright tests break. No governance. Hard to debug. Can't trust results.

**Solution:**
- **Contracts** enforce what's valid
- **Integrity gates** prevent drift
- **Artifacts** are deterministic and auditable
- **UI** makes everything transparent

**Result:** Tests you can trust. Failures you can debug. Compliance you can prove.

---

## 🚀 Quick Start

### **Option 1: Use the UI (Recommended)**

```bash
# Install dependencies
npm install

# Start the UI
npm run dev

# Open http://localhost:5173
```

Then follow the in-app guidance:
1. **Generate Contract** - Define what to test
2. **Build Cache** - Detect pages from your application
3. **Run Tests** - Execute with governance enforcement
4. **Check Integrity** - Verify contract and cache alignment

### **Option 2: CLI Usage**

```bash
# Generate contract
npm run contract:generate

# Build page cache
npm run cache:build

# Run tests with governance
npm run test

# Check integrity gates
npm run integrity:check
```

For detailed setup, see **[Getting Started Guide](GETTING_STARTED.md)**.

---

## 📖 Documentation

### **Getting Started**
- **[Getting Started Guide](GETTING_STARTED.md)** - Complete onboarding walkthrough
- **[How It Works](docs/HOW_IT_WORKS.md)** - Operational model explained
- **[UI System Guide](docs/architecture/ui-system.md)** - Understanding the interface

### **Architecture**
- **[Architecture Overview](docs/architecture/overview.md)** - System design and components
- **[Phase Documentation](docs/architecture/phases/)** - Detailed phase architecture
  - [Phase 0: Contract Generators](docs/architecture/phases/phase0-contracts.md)
  - [Phase 1: Page Cache](docs/architecture/phases/phase1-cache.md)
  - [Phase 2: Contract Awareness](docs/architecture/phases/phase2-awareness.md)
  - [Phase 3: Healing Engine](docs/architecture/phases/phase3-healing.md)

### **Reference**
- **[Setup & Configuration](docs/SETUP.md)** - Installation and configuration
- **[TeamCity Integration](docs/TEAMCITY.md)** - CI/CD setup
- **[Compliance & Enterprise](docs/reference/)** - Governance features

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       Web UI (Port 5173)                     │
│  System • Runs • Contract • Cache • Integrity • Job Monitor  │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                   UI Server (Port 3001)                      │
│         REST API • System Status • Integrity Gates           │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│              Repo Intelligence MCP (stdio)                   │
│    Contract Gen • Cache Build • Integrity Verification       │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                 MindTrace AI Runtime                         │
│           Contract-Aware Playwright Execution                │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
              Deterministic Artifacts
        (.mcp-contract/ • .mcp-cache/v1/ • runs/)
```

**Key Components:**
- **Web UI** - React + TypeScript production interface
- **UI Server** - Express API serving system state
- **Repo Intelligence MCP** - Contract and cache operations
- **AI Runtime** - Governed Playwright execution
- **Artifacts** - Immutable, validated test outputs

---

## 📦 Deterministic Artifact Contract

Every test run generates a complete artifact bundle:

```
runs/<runName>/
├── artifacts/
│   ├── playwright-report.json
│   ├── normalized-results.json
│   ├── policy-decision.json
│   ├── gate-summary.json
│   ├── artifact-validation.json
│   ├── healed-selectors.json
│   ├── locator-manifest.snapshot.json
│   ├── contract-awareness.json
│   ├── contract-snapshot.json
│   ├── contract-utilization.json
│   └── runtime/
│       ├── healing-attempts.jsonl
│       ├── healing-outcome.json
│       └── healing-summary.json
├── audit/
│   ├── events.ndjson
│   └── final.json
└── (repo root) history/
    └── run-index.jsonl
```

**If required artifacts are missing → run fails with exit code 3.**

---

## 🔐 Governance Exit Codes

MindTrace standardizes exit codes for CI/CD integration:

| Code | Meaning | CI Action |
|------|---------|-----------|
| **0** | Tests passed, policy satisfied | ✅ Pass |
| **1** | Test failures (expected Playwright failure) | ❌ Fail (flaky) |
| **2** | Infrastructure/runtime failure | ⚠️ Fail (infra) |
| **3** | Policy violation (contract invalid or artifact missing) | 🚫 Fail (compliance) |

This allows CI/CD systems to differentiate failure types and take appropriate action.

---

## 🛡️ Integrity Gates

Built-in verification system ensures system integrity:

### **Contract Integrity Gate**
- Validates contract structure and schema
- Verifies all required contract files exist
- Ensures contract fingerprint is current
- **Status:** Valid | Invalid | Warning

### **Cache Integrity Gate**
- Validates cache structure and metadata
- Verifies cache binding to contract
- Detects drift between cache and contract
- **Status:** Valid | Invalid | Warning | Not Created

### **Drift Detection**
- Compares cache fingerprint with current contract
- Identifies when cache needs rebuild
- Prevents tests from running against stale cache
- **Auto-resolution:** Rebuild cache to sync

All gates are **verifier-only** — never regenerate, repair, or mutate artifacts.

---

## 📂 Project Structure

```
mindtrace-for-playwright/
├── ui-client/                         # React web UI (Vite + TypeScript)
├── ui-server/                         # Express API server
├── repo-intelligence-mcp/             # Contract + cache operations (MCP)
├── mindtrace-ai-runtime/              # Playwright runtime + pipeline
├── shared-packages/
│   ├── contracts/                     # @mindtrace/contracts
│   ├── promptpacks/                   # @mindtrace/promptpacks
│   ├── integrity-gates/               # @mindtrace/integrity-gates
│   └── ui-types/                      # @breakline/ui-types
├── .mcp-contract/                     # Generated contracts
├── .mcp-cache/v1/                     # Page detection cache
├── runs/                              # Test execution artifacts
├── history/                           # Run index and audit
└── docs/                              # Documentation
```

---

## 🎓 Core Concepts

### **Contract**
Your automation's source of truth — defines:
- What pages exist in your application
- What selectors are valid for each page
- Policy rules for execution
- Healing strategies

Generated from your codebase, stored in `.mcp-contract/`.

### **Cache**
Page detection results from your application:
- Built from the contract
- Bound to a specific contract version (fingerprint)
- Detects which pages are accessible
- Stored in `.mcp-cache/v1/`

### **Integrity**
Verification that your system is synchronized:
- Contract is valid and current
- Cache matches the current contract
- No drift between artifacts
- Tests can run safely

### **Run**
A single test execution with governance:
- Uses contract for validation
- Uses cache for page detection
- Generates deterministic artifacts
- Records audit trail

---

## 🛠️ Development

```bash
# Install all dependencies
npm install

# Build shared packages
npm run build

# Start development UI
cd ui-client && npm run dev

# Start API server (separate terminal)
cd ui-server && npm run dev

# Run tests
npm test

# Build for production
npm run build
```

---

## ✨ What Makes MindTrace Different

### **Governance-First**
Compliance and policy enforcement are primary — AI resilience is secondary and advisory-only.

### **Deterministic by Design**
Every run produces the same artifacts given the same inputs. No randomness, no surprises.

### **Observable**
Complete visibility into system state, execution history, and integrity status through production UI.

### **Trustworthy**
Situation-aware messaging, clear error recovery, and no dead ends. Users always know what's happening and what to do next.

### **Contract-Driven**
Your codebase defines the contract. The contract governs execution. The UI makes it transparent.

---

## 🗺️ Roadmap

### **Completed**
- ✅ Phase 0: Repo Intelligence (contract generation via MCP)
- ✅ Phase 1: Page Semantic Cache (`.mcp-cache/v1/`)
- ✅ Phase 2: Contract-Awareness Module (deterministic loading + validation)
- ✅ Phase 2 GSL: Governance Safety Layer (`@mindtrace/integrity-gates`)
- ✅ Phase 3: Healing Engine (contract-aware selector ranking)
- ✅ **Stage 5: Operational Clarity UI** (production-ready web interface)

### **Next**
- 🔄 Phase 4: Cross Framework Adapter (contract-driven mapping)
- ⏭️ Phase 5: Runtime Learning Loop (confidence scoring)
- ⏭️ Phase 6: Enterprise Layer (advanced CLI commands)

---

## 💡 Use Cases

### **For QA Engineers**
- Generate contracts from existing tests
- Visual cache management
- Clear test execution history
- Integrity verification workflows

### **For DevOps/SRE**
- CI/CD integration with exit code differentiation
- Audit trail for compliance
- Deterministic artifact validation
- Policy enforcement

### **For Engineering Managers**
- Operational visibility dashboard
- Compliance status monitoring
- Test execution trends
- System health overview

---

## 📄 License

MIT License

---

## 🏢 About

© 2026 MindTrace Inc.
Building compliance-first test infrastructure with operational clarity.

**Status:** Production-ready with Stage 5 complete
**Version:** v1.0 (Operational Clarity Release)
