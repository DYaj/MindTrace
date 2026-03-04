# MindTrace for Playwright

## 🧠 Governance-First Test Automation Runtime

**MindTrace** is an enterprise-grade compliance and governance layer for Playwright test execution.

It enforces deterministic artifact contracts, immutable manifest validation, policy decisions, and audit traceability — before introducing AI-based resilience features.

MindTrace is not a wrapper around Playwright.

It is a compliance-enforced execution runtime.

---

# 🎯 What MindTrace Is (Phase 2.0 Complete)

MindTrace transforms Playwright into:

• A policy-controlled execution engine
• A contract-validated test runtime
• A deterministic artifact generator
• A CI-governed compliance system
• An audit-ready execution layer

**Phase 2.0 Contract-Awareness Module** provides deterministic contract loading, validation, and strategy context for runtime execution.

AI resilience features are layered on top — but governance comes first.

---

# 🏗️ Architecture (Phase 2.0+)

Developer
↓
MindTrace CLI / Runtime
↓
**Contract-Awareness Module** (Phase 2.0)
- Loads & validates automation contracts from `.mcp-contract/`
- Binds page cache from `.mcp-cache/v1/`
- Builds runtime strategy context
- Writes contract artifacts to `runs/<runId>/artifacts/`
↓
Governance MCP (contracts + policy gate)
↓
Frameworks MCP (prompt packs discovery/retrieval)
↓
(Optionally) Orchestrator MCP (thin façade over MCPs)
↓
Playwright Execution
↓
Deterministic Artifacts
↓
Governance Gate
↓
Audit Trail + History Index

**Phase 2.0 Integration:**
- Runtime loads contracts **before** test execution
- Environment variables set: `MINDTRACE_AUTOMATION_CONTRACT_CONTEXT_PATH`, `MINDTRACE_CONTRACT_DIR`, `MINDTRACE_PAGE_CACHE_DIR`
- Contract validation errors → exit code 3 (compliance invalid)
- All contract awareness operations are deterministic (no network, no AI)

MindTrace ensures every run produces deterministic, machine-validated artifacts.

---

# 📦 Deterministic Artifact Contract (Phase 2.0+)

Every run generates:

runs/<runName>/

├── artifacts/
│ ├── playwright-report.json
│ ├── normalized-results.json
│ ├── policy-decision.json
│ ├── gate-summary.json
│ ├── artifact-validation.json
│ ├── healed-selectors.json
│ ├── locator-manifest.snapshot.json
│ ├── contract-awareness.json          # Phase 2.0: Contract validation result
│ ├── contract-snapshot.json           # Phase 2.2.1: Contract bundle snapshot
│ └── contract-utilization.json        # Phase 2.2.2: Contract usage tracking
│
├── audit/
│ ├── events.ndjson
│ └── final.json
│
└── (repo root) history/
└── run-index.jsonl

If required artifacts are missing → run fails with exit code 3.

---

# 🔐 Governance Exit Codes

MindTrace standardizes exit codes:

0 → Tests passed, policy satisfied  
1 → Test failures (expected Playwright failure)  
2 → Infrastructure/runtime failure  
3 → Policy violation (contract invalid or artifact missing)

This allows CI/CD systems to differentiate failure types.

---

# 📜 Contract & Manifest Enforcement (Phase 2.0+)

**Contract Loading (Phase 2.0):**

Runtime loads and validates automation contracts from `.mcp-contract/`:
- repo-topology.json
- selector-policy.json
- healing-policy.json
- wrapper-discovery.json
- policy-decision.json
- meta.json
- fingerprint.json

If `locator-manifest.json` exists:

1. It must validate against schema.
2. It is snapshotted into:
   runs/<runName>/artifacts/locator-manifest.snapshot.json
3. The heal layer consumes only the snapshot — never the live repo manifest.

If validation fails → exit code 3.

This ensures deterministic compliance behavior.

---

# 🚀 Quick Start (Monorepo)

From repo root:

```bash
npm install

# build shared libraries
npm -w @mindtrace/shared run build
npm -w @mindtrace/promptpacks run build
npm -w @mindtrace/contracts run build

# build MCPs
npm -w @mindtrace/frameworks-mcp run build
npm -w @mindtrace/governance-mcp run build
npm -w @mindtrace/mcp-orchestrator run build

# (optional) packaged smoke checks
cd "frameworks-mcp" && npm run -s smoke:packaged
cd "../governance-mcp" && npm run -s smoke:packaged


Run MCP servers (stdio):
# Frameworks MCP (prompt pack discovery + retrieval)
cd "/Users/davidyang/Desktop/MindTrace Inc/mindtrace-for-playwright/frameworks-mcp"
node dist/mcp/cli.js

# Governance MCP (CI/governance validation)
cd "/Users/davidyang/Desktop/MindTrace Inc/mindtrace-for-playwright/governance-mcp"
node dist/mcp/cli.js

# Orchestrator MCP (thin façade; optional)
cd "/Users/davidyang/Desktop/MindTrace Inc/mindtrace-for-playwright/orchestrator-mcp"
node dist/mcp/cli.js



⸻

📂 Project Structure

mindtrace-for-playwright/
├── mindtrace-ai-runtime/              # Playwright runtime + pipeline (Option C runtime)
├── frameworks-mcp/                    # prompt pack discovery + retrieval (fast-evolving)
├── governance-mcp/                    # deterministic governance/validation for CI
├── orchestrator-mcp/                  # optional thin façade over MCPs
├── shared-packages/
│   ├── contracts/                     # @mindtrace/contracts (schemas/types/loader)
│   ├── promptpacks/                   # @mindtrace/promptpacks (prompt packs)
│   └── shared/                        # @mindtrace/shared (common utils)
├── prompts/                           # source prompt packs (synced into packages/MCPs at build)
├── contracts/                         # source contracts (synced into packages/MCPs at build)
├── runs/
├── history/
└── reports/

⸻

🛡️ Compliance Definition of Done (Locked)

A run is considered compliant when:

☑ Contract validation passes
☑ Manifest snapshot is created (if manifest exists)
☑ Playwright JSON report is generated deterministically
☑ normalized-results.json exists
☑ policy-decision.json exists
☑ gate-summary.json exists
☑ artifact-validation.json exists
☑ audit trail written
☑ history index updated
☑ exit code reflects correct governance state

Any violation → exit code 3.

⸻

🔮 Roadmap

**Completed:**
- ✅ Phase 0: Repo Intelligence (contract generation via MCP)
- ✅ Phase 1: Page Semantic Cache (`.mcp-cache/v1/`)
- ✅ Phase 2.0: Contract-Awareness Module (deterministic loading + validation)
- ✅ Phase 2: Runtime Contract Execution (CLI integration)

**Next:**
- 🔄 Phase 3: Healing Engine Upgrade (contract-aware selector ranking)
- ⏭️ Phase 4: Cross Framework Adapter (contract-driven mapping)
- ⏭️ Phase 5: Runtime Learning Loop (confidence scoring)
- ⏭️ Phase 6: Enterprise Layer (CLI commands: `mindtrace phase0`, `mindtrace phase1`, etc.)

**Key Principles:**
- Compliance remains primary
- AI resilience remains secondary (advisory only)
- LLM NEVER overrides governance policy
- Deterministic artifacts required for all phases

⸻

💡 Positioning

MindTrace is:

• A Compliance-Governed Test Execution Platform
• A Deterministic Artifact Contract Engine
• A CI/CD Policy Enforcement Layer
• An Audit-Ready Automation Runtime

AI-powered resilience features are layered on top — never bypassing governance.

⸻

📄 License

MIT License

⸻

© 2026 MindTrace Inc.
Building compliance-first test infrastructure.
```
