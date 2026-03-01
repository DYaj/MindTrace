# MindTrace for Playwright

## 🧠 Governance-First Test Automation Runtime

**MindTrace** is an enterprise-grade compliance and governance layer for Playwright test execution.

It enforces deterministic artifact contracts, immutable manifest validation, policy decisions, and audit traceability — before introducing AI-based resilience features.

MindTrace is not a wrapper around Playwright.

It is a compliance-enforced execution runtime.

---

# 🎯 What MindTrace Is (Phase 3)

MindTrace transforms Playwright into:

• A policy-controlled execution engine  
• A contract-validated test runtime  
• A deterministic artifact generator  
• A CI-governed compliance system  
• An audit-ready execution layer  

AI resilience features are layered on top — but governance comes first.

---

# 🏗️ Architecture (Current State)

Developer
↓
MindTrace CLI / Runtime
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

MindTrace ensures every run produces deterministic, machine-validated artifacts.

---

# 📦 Deterministic Artifact Contract (Phase 3)

Every run generates:

runs/<runName>/

├── artifacts/
│   ├── playwright-report.json
│   ├── normalized-results.json
│   ├── policy-decision.json
│   ├── gate-summary.json
│   ├── artifact-validation.json
│   ├── healed-selectors.json
│   └── locator-manifest.snapshot.json
│
├── audit/
│   ├── events.ndjson
│   └── final.json
│
└── (repo root) history/
    └── run-index.jsonl

If required artifacts are missing → run fails with exit code 3.

---

# 🔐 Governance Exit Codes

MindTrace standardizes exit codes:

0  → Tests passed, policy satisfied  
1  → Test failures (expected Playwright failure)  
2  → Infrastructure/runtime failure  
3  → Policy violation (contract invalid or artifact missing)  

This allows CI/CD systems to differentiate failure types.

---

# 📜 Manifest Enforcement (Phase 3)

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

Phase 4 — Manifest Drift Detection
Phase 5 — Drift Scoring + Risk Levels
Phase 6 — AI Resilience Proposal Engine
Phase 7 — Compliance Export Bundle

Compliance remains primary.
AI resilience remains secondary.

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
