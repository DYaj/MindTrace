#!/bin/bash

# MindTrace for Playwright - Full Project Generator
# This script generates all necessary files for the complete framework

set -e

BASE_DIR="/home/claude/mindtrace-playwright"
cd "$BASE_DIR"

echo "🚀 Generating MindTrace for Playwright Framework..."

# Create all necessary directories
mkdir -p shared/{page-scraper,selector-engine,mcp-runtime}
mkdir -p docs
mkdir -p prompts/{native,bdd,pom-bdd}
mkdir -p runs/.gitkeep

# ========================================
# FRAMEWORK STYLE 1: NATIVE
# ========================================
echo "📦 Creating Style 1 - Playwright Native..."

cat > frameworks/style1-native/playwright.config.ts << 'EOF'
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }]
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
EOF

cat > frameworks/style1-native/tests/example.spec.ts << 'EOF'
import { test, expect } from '@playwright/test';

test.describe('Example Test Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('homepage loads successfully', async ({ page }) => {
    await expect(page).toHaveTitle(/Home/);
    await expect(page.locator('h1')).toBeVisible();
  });

  test('navigation works correctly', async ({ page }) => {
    await page.click('a[href="/about"]');
    await expect(page).toHaveURL(/about/);
  });

  test('form submission with MCP healing', async ({ page }) => {
    // This selector might break - MCP will heal it
    await page.fill('#email-input', 'test@example.com');
    await page.fill('#password-input', 'password123');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('.success-message')).toBeVisible();
  });
});
EOF

cat > frameworks/style1-native/README.md << 'EOF'
# Style 1: Playwright Native Test Runner

## Quick Start
\`\`\`bash
npm install
npx playwright install
npm run test
\`\`\`

## MCP-Enhanced Testing
\`\`\`bash
npm run test:mindtrace
\`\`\`

This enables:
- Automatic selector healing
- AI failure classification
- Real-time artifact generation
EOF

# ========================================
# FRAMEWORK STYLE 2: BDD
# ========================================
echo "📦 Creating Style 2 - Playwright + Cucumber..."

cat > frameworks/style2-bdd/package.json << 'EOF'
{
  "name": "@playwright-mcp/style2-bdd",
  "version": "1.0.0",
  "description": "Playwright + Cucumber BDD with MCP Integration",
  "scripts": {
    "test": "cucumber-js",
    "test:mcp": "mindtrace-playwright run --style bdd",
    "report": "node generate-report.js"
  },
  "dependencies": {
    "@playwright/test": "^1.49.0",
    "@cucumber/cucumber": "^11.1.0",
    "@playwright-mcp/server": "file:../../mindtrace-runtime",
    "dotenv": "^16.4.7"
  },
  "devDependencies": {
    "@types/node": "^22.10.2",
    "typescript": "^5.7.2"
  }
}
EOF

mkdir -p frameworks/style2-bdd/features/step_definitions
mkdir -p frameworks/style2-bdd/features/support

cat > frameworks/style2-bdd/features/login.feature << 'EOF'
Feature: User Login
  As a user
  I want to login to the application
  So that I can access my account

  Background:
    Given I am on the login page

  Scenario: Successful login with valid credentials
    When I enter username "test@example.com"
    And I enter password "password123"
    And I click the login button
    Then I should see the dashboard
    And I should see my username displayed

  Scenario: Failed login with invalid credentials
    When I enter username "invalid@example.com"
    And I enter password "wrongpass"
    And I click the login button
    Then I should see an error message "Invalid credentials"
    And I should remain on the login page

  Scenario Outline: Login with various user roles
    When I login as "<role>"
    Then I should see "<page>" page
    And I should have "<permissions>" permissions

    Examples:
      | role    | page       | permissions |
      | admin   | admin      | full        |
      | user    | dashboard  | read-only   |
      | guest   | limited    | view-only   |
EOF

cat > frameworks/style2-bdd/features/step_definitions/login.steps.ts << 'EOF'
import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

Given('I am on the login page', async function () {
  await this.page.goto('/login');
});

When('I enter username {string}', async function (username: string) {
  await this.page.fill('[data-testid="username"]', username);
});

When('I enter password {string}', async function (password: string) {
  await this.page.fill('[data-testid="password"]', password);
});

When('I click the login button', async function () {
  await this.page.click('[data-testid="login-button"]');
});

Then('I should see the dashboard', async function () {
  await expect(this.page).toHaveURL(/dashboard/);
});

Then('I should see my username displayed', async function () {
  await expect(this.page.locator('[data-testid="username-display"]')).toBeVisible();
});

Then('I should see an error message {string}', async function (message: string) {
  await expect(this.page.locator('.error-message')).toContainText(message);
});
EOF

cat > frameworks/style2-bdd/cucumber.js << 'EOF'
module.exports = {
  default: {
    require: ['features/step_definitions/**/*.ts', 'features/support/**/*.ts'],
    requireModule: ['ts-node/register'],
    format: ['progress', 'json:test-results/cucumber-report.json'],
    publishQuiet: true,
  },
};
EOF

# ========================================
# FRAMEWORK STYLE 3: POM + BDD
# ========================================
echo "📦 Creating Style 3 - Playwright + POM + Cucumber..."

cat > frameworks/style3-pom-bdd/package.json << 'EOF'
{
  "name": "@playwright-mcp/style3-pom-bdd",
  "version": "1.0.0",
  "description": "Playwright + Page Object Model + Cucumber with MCP Integration",
  "scripts": {
    "test": "cucumber-js",
    "test:mcp": "mindtrace-playwright run --style pom-bdd",
    "report": "node generate-report.js",
    "lint": "eslint src --ext .ts"
  },
  "dependencies": {
    "@playwright/test": "^1.49.0",
    "@cucumber/cucumber": "^11.1.0",
    "@playwright-mcp/server": "file:../../mindtrace-runtime",
    "dotenv": "^16.4.7"
  },
  "devDependencies": {
    "@types/node": "^22.10.2",
    "typescript": "^5.7.2",
    "eslint": "^9.17.0"
  }
}
EOF

mkdir -p frameworks/style3-pom-bdd/src/{pages,components,fixtures,utils}
mkdir -p frameworks/style3-pom-bdd/features/{step_definitions,support}

cat > frameworks/style3-pom-bdd/src/pages/BasePage.ts << 'EOF'
import { Page, Locator } from '@playwright/test';

export class BasePage {
  protected page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(path: string = '') {
    await this.page.goto(path);
  }

  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
  }

  protected getLocator(selector: string): Locator {
    return this.page.locator(selector);
  }

  protected async clickElement(selector: string) {
    await this.getLocator(selector).click();
  }

  protected async fillInput(selector: string, value: string) {
    await this.getLocator(selector).fill(value);
  }
}
EOF

cat > frameworks/style3-pom-bdd/src/pages/LoginPage.ts << 'EOF'
import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  private readonly selectors = {
    usernameInput: '[data-testid="username"]',
    passwordInput: '[data-testid="password"]',
    loginButton: '[data-testid="login-button"]',
    errorMessage: '.error-message',
    forgotPasswordLink: '[data-testid="forgot-password"]',
  };

  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await super.goto('/login');
  }

  async login(username: string, password: string) {
    await this.fillInput(this.selectors.usernameInput, username);
    await this.fillInput(this.selectors.passwordInput, password);
    await this.clickElement(this.selectors.loginButton);
  }

  async enterUsername(username: string) {
    await this.fillInput(this.selectors.usernameInput, username);
  }

  async enterPassword(password: string) {
    await this.fillInput(this.selectors.passwordInput, password);
  }

  async clickLoginButton() {
    await this.clickElement(this.selectors.loginButton);
  }

  async getErrorMessage() {
    return await this.getLocator(this.selectors.errorMessage).textContent();
  }

  async isErrorMessageVisible() {
    return await this.getLocator(this.selectors.errorMessage).isVisible();
  }

  async clickForgotPassword() {
    await this.clickElement(this.selectors.forgotPasswordLink);
  }
}
EOF

cat > frameworks/style3-pom-bdd/src/pages/DashboardPage.ts << 'EOF'
import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class DashboardPage extends BasePage {
  private readonly selectors = {
    welcomeMessage: '[data-testid="welcome-message"]',
    userProfile: '[data-testid="user-profile"]',
    navigationMenu: '[data-testid="nav-menu"]',
    logoutButton: '[data-testid="logout-button"]',
  };

  constructor(page: Page) {
    super(page);
  }

  async isDisplayed() {
    return await this.getLocator(this.selectors.welcomeMessage).isVisible();
  }

  async getWelcomeMessage() {
    return await this.getLocator(this.selectors.welcomeMessage).textContent();
  }

  async clickLogout() {
    await this.clickElement(this.selectors.logoutButton);
  }

  async navigateTo(section: string) {
    await this.page.click(\`[data-testid="nav-\${section}"]\`);
  }
}
EOF

cat > frameworks/style3-pom-bdd/features/step_definitions/login.steps.ts << 'EOF'
import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { LoginPage } from '../../src/pages/LoginPage';
import { DashboardPage } from '../../src/pages/DashboardPage';

Given('I am on the login page', async function () {
  this.loginPage = new LoginPage(this.page);
  await this.loginPage.goto();
});

When('I enter username {string}', async function (username: string) {
  await this.loginPage.enterUsername(username);
});

When('I enter password {string}', async function (password: string) {
  await this.loginPage.enterPassword(password);
});

When('I click the login button', async function () {
  await this.loginPage.clickLoginButton();
});

Then('I should see the dashboard', async function () {
  this.dashboardPage = new DashboardPage(this.page);
  const isDisplayed = await this.dashboardPage.isDisplayed();
  expect(isDisplayed).toBeTruthy();
});

Then('I should see my username displayed', async function () {
  const welcomeMessage = await this.dashboardPage.getWelcomeMessage();
  expect(welcomeMessage).toBeTruthy();
});

Then('I should see an error message {string}', async function (message: string) {
  const errorMessage = await this.loginPage.getErrorMessage();
  expect(errorMessage).toContain(message);
});
EOF

# ========================================
# PROMPTS
# ========================================
echo "📝 Creating framework prompts..."

cat > prompts/native/main.md << 'EOF'
# Playwright Native Test Runner - Main Prompt

You are an expert Playwright test automation engineer working with the **Native Test Runner** style.

## Framework Characteristics:
- **No page objects** - Direct Playwright API usage
- **Fast feedback** - Minimal abstraction layers
- **Developer-centric** - TypeScript/JavaScript focused
- **CI-optimized** - Quick execution times

## Test Structure:
\`\`\`typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/path');
  });

  test('test name', async ({ page }) => {
    // Direct interactions
    await page.click('[data-testid="button"]');
    await expect(page.locator('.result')).toBeVisible();
  });
});
\`\`\`

## Best Practices:
1. Use data-testid attributes for stable selectors
2. Prefer role-based locators when possible
3. Keep tests focused and independent
4. Use fixtures for shared setup
5. Leverage Playwright's auto-waiting

## When to use this style:
- Small to mid-sized projects
- Rapid prototyping
- API-first testing
- Developer-driven QA
EOF

cat > prompts/bdd/main.md << 'EOF'
# Playwright + Cucumber BDD - Main Prompt

You are an expert BDD practitioner working with **Playwright and Cucumber**.

## Framework Characteristics:
- **Business-readable** - Gherkin syntax
- **Stakeholder-friendly** - Non-technical collaboration
- **Living documentation** - Tests as specs
- **Behavior-driven** - Focus on outcomes

## Test Structure:
\`\`\`gherkin
Feature: Feature Name
  As a [role]
  I want to [action]
  So that [benefit]

  Scenario: Scenario name
    Given I am on the login page
    When I enter username "test@example.com"
    And I click the login button
    Then I should see the dashboard
\`\`\`

## Step Definitions:
\`\`\`typescript
Given('I am on the login page', async function () {
  await this.page.goto('/login');
});

When('I enter username {string}', async function (username: string) {
  await this.page.fill('[data-testid="username"]', username);
});
\`\`\`

## Best Practices:
1. Write declarative Gherkin (what, not how)
2. Keep scenarios independent
3. Use scenario outlines for data-driven tests
4. Reuse step definitions
5. Focus on user journeys

## When to use this style:
- Enterprise products with stakeholders
- Regulatory/compliance requirements
- BDD/ATDD teams
- Living documentation needs
EOF

cat > prompts/pom-bdd/main.md << 'EOF'
# Playwright + POM + Cucumber - Main Prompt

You are an expert test architect working with **Page Object Model + Cucumber**.

## Framework Characteristics:
- **Enterprise-scale** - Maintainable architecture
- **Abstraction layers** - Page objects for reusability
- **Long-term maintainability** - Structured codebase
- **Team collaboration** - Standardized patterns

## Architecture:
\`\`\`
src/
├── pages/
│   ├── BasePage.ts
│   ├── LoginPage.ts
│   └── DashboardPage.ts
├── components/
│   └── HeaderComponent.ts
├── fixtures/
│   └── testData.json
└── utils/
    └── helpers.ts

features/
├── login.feature
└── step_definitions/
    └── login.steps.ts
\`\`\`

## Page Object Example:
\`\`\`typescript
export class LoginPage extends BasePage {
  private selectors = {
    username: '[data-testid="username"]',
    password: '[data-testid="password"]',
  };

  async login(username: string, password: string) {
    await this.fillInput(this.selectors.username, username);
    await this.fillInput(this.selectors.password, password);
    await this.clickElement(this.selectors.loginButton);
  }
}
\`\`\`

## Best Practices:
1. Centralize selectors in page objects
2. Create reusable components
3. Use inheritance for common functionality
4. Implement waiting strategies in base classes
5. Separate test data from logic

## When to use this style:
- Large enterprises (1000+ tests)
- Multi-team organizations
- Complex domain models
- Long-term projects (2+ years)
EOF

# ========================================
# SHARED UTILITIES
# ========================================
echo "🔧 Creating shared utilities..."

cat > shared/selector-engine/ranking.ts << 'EOF'
/**
 * Selector Ranking Engine
 * Ranks selectors by stability, maintainability, and performance
 */

export interface SelectorScore {
  selector: string;
  score: number;
  factors: {
    stability: number;
    specificity: number;
    maintainability: number;
    performance: number;
  };
  recommendation: 'excellent' | 'good' | 'acceptable' | 'poor';
}

export class SelectorRankingEngine {
  rankSelectors(selectors: string[]): SelectorScore[] {
    return selectors.map(selector => {
      const factors = this.calculateFactors(selector);
      const score = this.calculateOverallScore(factors);
      
      return {
        selector,
        score,
        factors,
        recommendation: this.getRecommendation(score),
      };
    });
  }

  private calculateFactors(selector: string) {
    return {
      stability: this.calculateStability(selector),
      specificity: this.calculateSpecificity(selector),
      maintainability: this.calculateMaintainability(selector),
      performance: this.calculatePerformance(selector),
    };
  }

  private calculateStability(selector: string): number {
    if (selector.includes('[data-testid=')) return 100;
    if (selector.startsWith('role=')) return 90;
    if (selector.includes('[aria-label=')) return 80;
    if (selector.match(/^text=/)) return 70;
    if (selector.match(/^\./)) return 40; // CSS class
    if (selector.match(/^#/)) return 30; // CSS ID
    if (selector.includes('nth-child')) return 20;
    return 50;
  }

  private calculateSpecificity(selector: string): number {
    const parts = selector.split(' ').length;
    return Math.max(0, 100 - (parts * 10));
  }

  private calculateMaintainability(selector: string): number {
    if (selector.includes('[data-testid=')) return 100;
    if (selector.length < 50) return 80;
    if (selector.length < 100) return 60;
    return 40;
  }

  private calculatePerformance(selector: string): number {
    if (selector.match(/^#/)) return 100; // ID
    if (selector.includes('[data-testid=')) return 90;
    if (selector.match(/^\./)) return 70; // Class
    if (selector.includes('//')) return 30; // XPath
    return 60;
  }

  private calculateOverallScore(factors: any): number {
    const weights = {
      stability: 0.4,
      specificity: 0.2,
      maintainability: 0.25,
      performance: 0.15,
    };

    return Object.keys(weights).reduce((sum, key) => {
      return sum + factors[key] * weights[key as keyof typeof weights];
    }, 0);
  }

  private getRecommendation(score: number): 'excellent' | 'good' | 'acceptable' | 'poor' {
    if (score >= 85) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'acceptable';
    return 'poor';
  }
}
EOF

# ========================================
# DOCUMENTATION
# ========================================
echo "📚 Creating documentation..."

cat > docs/SETUP.md << 'EOF'
# Setup Guide

## Prerequisites
- Node.js 18+
- npm or yarn

## Installation

### 1. Install MCP Server
\`\`\`bash
cd mindtrace-runtime
npm install
npm run build
\`\`\`

### 2. Choose Framework Style
\`\`\`bash
cd frameworks/style1-native  # or style2-bdd or style3-pom-bdd
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
npm run test          # Standard Playwright
npm run test:mindtrace      # MCP-enhanced with AI healing
\`\`\`

## Troubleshooting
- **Browsers not found**: Run \`npx playwright install\`
- **MCP server not starting**: Check Node.js version (18+)
- **LLM errors**: Verify API keys in \`.env\`
EOF

cat > docs/TEAMCITY.md << 'EOF'
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
EOF

cat > docs/ARCHITECTURE.md << 'EOF'
# Architecture Deep Dive

## System Components

### 1. MCP Server
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
MCP Server (analyzes failures)
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
EOF

echo "✅ Project generation complete!"
echo ""
echo "Next steps:"
echo "1. cd mindtrace-runtime && npm install && npm run build"
echo "2. cd frameworks/style1-native && npm install"
echo "3. Configure .env with your LLM API keys"
echo "4. Run: npm run test:mindtrace"

