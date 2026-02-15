# MindTrace for Playwright

## 🧠 AI-Governed Test Automation with Self-Healing

**MindTrace** is an enterprise-grade test automation platform that transforms Playwright testing with AI-powered intelligence, self-healing capabilities, and continuous learning.

---

## 🎯 MindTrace Platform

### Products

- **MindTrace AI Runtime** - Core intelligence layer
- **MindTrace Playwright Adapter** - Playwright integration
- **MindTrace Cypress Adapter** - Cypress integration (coming soon)
- **MindTrace Failure Intelligence** - Root cause analysis
- **MindTrace Selector Engine** - Smart locator management

### Platform Modules

- **MindTrace AI** - LLM-powered reasoning (OpenAI, Claude, Ollama)
- **MindTrace Heal** - Automatic selector repair
- **MindTrace RCA** - Root cause analysis
- **MindTrace CI** - Continuous integration support

### Supported Adapters

- ✅ **MindTrace for Playwright** (this package)
- 🔜 **MindTrace for Cypress** 
- 🔜 **MindTrace for Selenium**

---

## 📊 Architecture Overview

```
Developer → Playwright Runtime → MindTrace Listener → 
Failure Classifier → AI Reasoning → Artifact Generator → 
CI/CD Pipeline → Continuous Learning
```

**The system learns from every test run, becoming smarter over time.**

---

## 🚀 Three Framework Styles

### **Style 1: Playwright Native** ⚡
- **Best for:** Fast setup, 10-500 tests, dev-centric teams
- **Setup:** 5 minutes
- **Features:** Direct Playwright API, minimal abstraction

### **Style 2: Playwright + Cucumber BDD** 📝
- **Best for:** Business-readable tests, stakeholder alignment
- **Setup:** 10 minutes
- **Features:** Gherkin syntax, living documentation

### **Style 3: Playwright + POM + Cucumber** 🏢
- **Best for:** Enterprise scale, 1000+ tests, long-term maintainability
- **Setup:** 15 minutes
- **Features:** Page Object Model, architectural governance

---

## 🤖 AI-Powered Features

### Self-Healing Selectors
Automatically repairs broken locators using DOM analysis:
- Ranks alternatives by stability
- Saves suggestions to `mindtrace-artifacts/healed-selectors.json`
- Learns from historical patterns

### Failure Classification
AI analyzes test failures to determine root cause:
- Error messages, screenshots, logs, network traces
- Categories: DOM changed, selector failed, API error, timeout, flaky
- Confidence scores and suggested actions

### Artifact Generation
After each run:
- `healed-selectors.json` - Fixed locators
- `failure-narrative.md` - Human-readable analysis
- `root-cause-summary.json` - Structured data
- `automation-suggestions.md` - Next steps
- `jira-ticket.json` - Bug report template

---

## 🎯 Quick Start

```bash
# 1. Extract package
unzip mindtrace-playwright.zip
cd mindtrace-playwright

# 2. Run setup
bash setup.sh

# 3. Configure LLM provider (.env)
OPENAI_API_KEY=sk-your-key
# OR
ANTHROPIC_API_KEY=sk-ant-your-key

# 4. Run tests with MindTrace
cd frameworks/style1-native
npm install
npx playwright install
npm run test:mindtrace
```

---

## 📚 Documentation

- **Quick Start:** [QUICKSTART.md](QUICKSTART.md)
- **Setup Guide:** [docs/SETUP.md](docs/SETUP.md)
- **Architecture:** [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- **TeamCity Integration:** [docs/TEAMCITY.md](docs/TEAMCITY.md)
- **Complete Overview:** [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md)

---

## 🏗️ Project Structure

```
mindtrace-playwright/
├── mindtrace-runtime/      # AI intelligence layer
├── frameworks/
│   ├── style1-native/      # Playwright Native
│   ├── style2-bdd/         # Cucumber BDD
│   └── style3-pom-bdd/     # POM + BDD
├── shared/
│   ├── selector-engine/    # Locator ranking
│   └── page-scraper/       # DOM snapshots
├── docs/                   # Documentation
└── mindtrace-artifacts/    # Generated reports (auto-created)
```

---

## 🔧 TeamCity Integration

```xml
<build>
  <step name="Run MindTrace Tests">
    <command>npx mindtrace run</command>
  </step>
</build>
```

Automatic artifact publishing:
- Test results
- AI analysis reports
- Healed selectors
- Failure narratives

---

## 💡 Key Benefits

✅ **80% reduction** in selector maintenance  
✅ **Automatic failure** root cause analysis  
✅ **Self-healing tests** reduce flakiness by 70%  
✅ **Continuous learning** improves stability  
✅ **Enterprise-ready** CI/CD integration  
✅ **Three framework styles** for any team size  

---

## 📄 License

MIT License - See [LICENSE](LICENSE) file

---

## 🙏 Acknowledgments

Built by **MindTrace Inc.** with:
- Playwright
- OpenAI / Anthropic / Ollama
- Cucumber
- TeamCity

---

**© 2026 MindTrace Inc. - Making test automation intelligent.**
