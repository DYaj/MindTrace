# Architecture Deep Dive

## System Components

### 1. MindTrace Runtime
- **Role**: Central intelligence layer
- **Responsibilities**:
  - Prompt routing
  - Failure classification
  - Selector healing
  - Artifact generation

### 2. Framework Styles
- **Style 1 (Native)**: Direct Playwright usage
- **Style 2 (BDD)**: Gherkin + Step definitions
- **Style 3 (POM+BDD)**: Enterprise architecture

### 3. Shared Utilities
- **Selector Engine**: Ranking and optimization
- **Page Scraper**: DOM snapshot capture
- **MCP Runtime**: Test execution listener

## Data Flow

\`\`\`
Test Execution
    ↓
Runtime Listener (captures events)
    ↓
MindTrace Runtime (analyzes failures)
    ↓
LLM Reasoning (classifies issues)
    ↓
Artifact Generator (creates reports)
    ↓
CI/CD Pipeline (publishes results)
\`\`\`

## Failure Classification

### Categories
1. **DOM Changed**: Element structure modified
2. **Selector Failed**: Locator no longer valid
3. **API Error**: Backend service issues
4. **Timeout**: Timing/performance problems
5. **Navigation Mismatch**: Unexpected redirects
6. **UX Regression**: Visual/behavioral changes
7. **Unexpected Modal**: New popup/dialog

### AI Analysis
- Analyzes error messages
- Reviews screenshots
- Examines network logs
- Checks console output
- Determines root cause
- Suggests remediation

## Self-Healing

### Strategy Ranking
1. \`data-testid\` (100 stability)
2. \`role\` (90 stability)
3. \`aria-label\` (80 stability)
4. \`text\` (70 stability)
5. \`css class\` (40 stability)
6. \`xpath\` (30 stability)

### Healing Process
1. Detect selector failure
2. Capture page snapshot
3. Analyze DOM structure
4. Generate alternatives
5. Rank by stability
6. Apply best option
7. Log change
8. Create PR suggestion
