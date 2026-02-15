# 🚀 QUICKSTART GUIDE

Get up and running with MindTrace for Playwright in 5 minutes!

---

## Prerequisites

- **Node.js 18+** ([Download](https://nodejs.org/))
- **npm or yarn**
- **LLM API Key** (OpenAI, Anthropic, or local Ollama)

---

## ⚡ 1-Minute Setup

```bash
# Clone or extract the project
cd mindtrace-playwright

# Run automated setup
bash setup.sh

# Follow the prompts to select your framework style
```

---

## 🎯 Choose Your Style

### Style 1: Playwright Native ⚡
**Perfect for:** Small teams, fast iteration, developer-centric

```bash
cd frameworks/style1-native
npm install
npx playwright install
npm run test:mindtrace
```

**Example test:**
```typescript
test('login works', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[data-testid="email"]', 'user@example.com');
  await page.click('[data-testid="login-btn"]');
  await expect(page).toHaveURL('/dashboard');
});
```

---

### Style 2: Cucumber BDD 📝
**Perfect for:** Business stakeholders, living documentation

```bash
cd frameworks/style2-bdd
npm install
npx playwright install
npm run test:mindtrace
```

**Example feature:**
```gherkin
Feature: User Login
  Scenario: Successful login
    Given I am on the login page
    When I enter valid credentials
    Then I should see the dashboard
```

---

### Style 3: POM + Cucumber 🏢
**Perfect for:** Enterprise scale, 1000+ tests, multiple teams

```bash
cd frameworks/style3-pom-bdd
npm install
npx playwright install
npm run test:mindtrace
```

**Example page object:**
```typescript
export class LoginPage extends BasePage {
  async login(email: string, password: string) {
    await this.fillInput(this.selectors.email, email);
    await this.fillInput(this.selectors.password, password);
    await this.clickElement(this.selectors.loginButton);
  }
}
```

---

## 🔧 Configure LLM Provider

Edit `.env` file:

```bash
# Option 1: OpenAI
OPENAI_API_KEY=sk-your-key-here
LLM_PROVIDER=openai

# Option 2: Anthropic Claude
ANTHROPIC_API_KEY=sk-ant-your-key-here
LLM_PROVIDER=anthropic

# Option 3: Ollama (Local)
OLLAMA_BASE_URL=http://localhost:11434
LLM_PROVIDER=ollama
```

---

## 🎪 Run Your First Test

```bash
# Standard Playwright
npm run test

# MindTrace-Enhanced (with AI healing & analysis)
npm run test:mindtrace

# View HTML report
npm run report
```

---

## 🤖 What MCP Does Automatically

### 1. **Self-Healing Selectors**
```
❌ Test fails: Element not found with selector '#submit-btn'
🔧 MCP analyzes DOM
✅ Heals to: [data-testid="submit-button"]
💾 Saves suggestion to mindtrace-artifacts/healed-selectors.json
```

### 2. **Failure Classification**
```
🔍 Analyzes: Error message, screenshots, logs
📊 Classifies: "DOM Changed" (confidence: 0.92)
💡 Suggests: "Update selector to use data-testid"
📝 Creates: Detailed narrative in mindtrace-artifacts/
```

### 3. **Artifact Generation**
After each run, check `mindtrace-artifacts/`:
- `healed-selectors.json` - Fixed locators
- `failure-narrative.md` - Human-readable analysis
- `root-cause-summary.json` - Structured data
- `automation-suggestions.md` - Next steps
- `jira-ticket.json` - Bug report template

---

## 📊 TeamCity Integration

### Quick Setup

1. **Add build step:**
```xml
<step name="MCP Tests">
  <command>npx mindtrace-playwright run</command>
</step>
```

2. **Publish artifacts:**
```
test-results/**/*
mindtrace-artifacts/**/*
playwright-report/**/*
```

3. **Set environment variables:**
```
OPENAI_API_KEY=%vault:openai/key%
CI=true
HEALING_ENABLED=true
```

See [docs/TEAMCITY.md](docs/TEAMCITY.md) for complete guide.

---

## 🎯 Common Workflows

### Workflow 1: Write Test → Run → Auto-Heal
```bash
# 1. Write test with any selector
await page.click('#submit');

# 2. Run with MCP
npm run test:mindtrace

# 3. If selector breaks, MCP auto-heals
# 4. Check mindtrace-artifacts/healed-selectors.json
# 5. Apply suggestion to your test
```

### Workflow 2: Analyze Failures
```bash
# 1. Run tests
npm run test:mindtrace

# 2. Check failure analysis
cat mindtrace-artifacts/failure-narrative.md

# 3. View root cause
cat mindtrace-artifacts/root-cause-summary.json

# 4. Get suggestions
cat mindtrace-artifacts/automation-suggestions.md
```

### Workflow 3: CI/CD Pipeline
```bash
# TeamCity runs:
1. npm install
2. npx playwright install --with-deps
3. npx mindtrace-playwright run

# If failures:
4. MCP generates artifacts
5. Publishes to TeamCity
6. Posts to Slack
7. Creates Jira ticket (optional)
```

---

## 📚 Learn More

- **Full Documentation**: [README.md](README.md)
- **Setup Guide**: [docs/SETUP.md](docs/SETUP.md)
- **Architecture**: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- **TeamCity**: [docs/TEAMCITY.md](docs/TEAMCITY.md)

---

## 🆘 Troubleshooting

### "Module not found"
```bash
npm install
```

### "Browsers not installed"
```bash
npx playwright install --with-deps
```

### "LLM API errors"
Check `.env` file:
```bash
# Make sure API key is set
echo $OPENAI_API_KEY
```

### "MCP server not starting"
```bash
cd mindtrace-runtime
npm run build
```

---

## 💬 Support

- **Issues**: [GitHub Issues](https://github.com/yourorg/playwright-mcp)
- **Docs**: [Documentation](docs/)
- **Slack**: #test-automation

---

## 🎉 You're Ready!

Start testing with AI-powered intelligence:

```bash
cd frameworks/style1-native  # or style2-bdd or style3-pom-bdd
npm run test:mindtrace
```

**The framework learns with every test run. The more you use it, the smarter it gets!**

Happy Testing! 🚀
