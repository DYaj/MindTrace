# TeamCity Integration Guide

## Build Configuration

### 1. Build Steps
\`\`\`xml
<build>
  <step name="Install Dependencies">
    <command>npm install</command>
  </step>
  
  <step name="Install Browsers">
    <command>npx playwright install --with-deps</command>
  </step>
  
  <step name="Run MCP Tests">
    <command>npx mindtrace-playwright run</command>
  </step>
</build>
\`\`\`

### 2. Artifact Paths
\`\`\`
test-results/**/*
playwright-report/**/*
mindtrace-artifacts/**/*
\`\`\`

### 3. Environment Variables
\`\`\`
OPENAI_API_KEY=%env.OPENAI_API_KEY%
BASE_URL=%env.BASE_URL%
CI=true
\`\`\`

### 4. Failure Conditions
- Fail build if: test failures detected
- Success criteria: All tests pass OR only flaky failures

## Post-Build Actions

### Publish Artifacts
\`\`\`bash
# Artifacts are automatically generated in mindtrace-artifacts/
- healed-selectors.json
- failure-narrative.md
- jira-ticket.json
\`\`\`

### Slack Notifications
\`\`\`groovy
if (failureClassification.isFlaky) {
  notifySlack("⚠️ Flaky test detected")
} else {
  notifySlack("❌ Test failure - needs investigation")
}
\`\`\`

### Jira Integration
\`\`\`bash
# Auto-create tickets for non-flaky failures
curl -X POST https://jira.company.com/rest/api/2/issue \
  -H "Content-Type: application/json" \
  -d @mindtrace-artifacts/jira-ticket.json
\`\`\`
