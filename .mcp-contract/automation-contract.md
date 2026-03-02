# MindTrace Automation Contract (Phase 0)

## Detected Framework
- framework: **playwright**
- confidence: **0.95**
- notes: Also detected signals for cypress (score=2)

## Detected Structure
- style: **hybrid**
- confidence: **0.95**

### Page Objects
- present: true
- paths: frameworks/style3-pom-bdd/src/pages

### BDD
- present: true
- glueStyle: cucumber
- featurePaths: 2
- stepDefPaths: 2

## Selector Strategy
- preferenceOrder: data-testid > data-qa > data-cy > role > labelText > placeholder > css > xpath
- stableAttributeKeys: data-cy, data-qa, data-testid
- heuristicHelpers: Cypress.Commands.add
- discoveredLocatorWrappers: 13
- confidence: **0.80**

## Assertion Style
- primary: **expect**
- discoveredAssertionWrappers: 2
- confidence: **0.75**

## Retry / Orchestration Signals
- signals: 1 (see wrapper-discovery.json)

## Runtime Enforcement (Identity Lock)
- Runtime MUST load .mcp-contract/*.json before execution (Phase 2 integration).
- Healing/RCA MUST operate under contract preferenceOrder + discovered wrappers.
- Governance decides pass/fail; AI cannot override policy.

## Uncertainties
- Wrapper discovery is best-effort static analysis (no AST yet).
- Page semantic cache is Phase 1.
