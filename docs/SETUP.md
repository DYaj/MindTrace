# Setup Guide

## Prerequisites

- Node.js 18+
- npm or yarn

## Installation

### 1. Install MindTrace Runtime

\`\`\`bash
cd mindtrace-ai-runtime
npm install
npm run build
\`\`\`

### 2. Choose Framework Style

\`\`\`bash
cd frameworks/style1-native # or style2-bdd or style3-pom-bdd
npm install
npx playwright install
\`\`\`

### 3. Configure Environment

Create \`.env\` file:
\`\`\`

# LLM Provider (choose one)

OPENAI_API_KEY=sk-...

# OR

ANTHROPIC_API_KEY=sk-ant-...

# OR

OLLAMA_BASE_URL=http://localhost:11434

# Test Configuration

BASE_URL=http://localhost:3000
HEADLESS=true
WORKERS=4
\`\`\`

### 4. Run Tests

\`\`\`bash
npm run test # Standard Playwright
npm run test:mindtrace # MCP-enhanced with AI healing
\`\`\`

## Troubleshooting

- **Browsers not found**: Run \`npx playwright install\`
- **MCP server not starting**: Check Node.js version (18+)
- **LLM errors**: Verify API keys in \`.env\`
