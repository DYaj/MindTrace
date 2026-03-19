# Getting Started with MindTrace

This guide will walk you through your first experience with MindTrace, from installation to running your first governed test execution.

---

## 📋 Prerequisites

Before you begin, ensure you have:

- **Node.js** 18 or higher
- **npm** 8 or higher
- A Playwright test project (or willingness to create one)
- Basic understanding of test automation

---

## 🚀 Installation

### **Step 1: Clone the Repository**

```bash
git clone https://github.com/DYaj/MindTrace.git
cd mindtrace-for-playwright
```

### **Step 2: Install Dependencies**

```bash
npm install
```

This installs all dependencies for:
- UI client (React + Vite)
- UI server (Express API)
- Repo intelligence MCP
- Shared packages

### **Step 3: Build Shared Packages**

```bash
npm run build
```

This builds the core libraries that power the system.

---

## 🖥️ Starting the UI

The fastest way to get started is through the web interface.

### **Start the Development Servers**

**Terminal 1 - Start UI Server (API):**
```bash
cd ui-server
npm run dev
```

You should see:
```
Server running on port 3001
MCP client connected successfully
```

**Terminal 2 - Start UI Client (Web Interface):**
```bash
cd ui-client
npm run dev
```

You should see:
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
```

### **Open the UI**

Navigate to **http://localhost:5173** in your browser.

You'll see the **System Status** page — your operational dashboard.

---

## 🎯 Your First Workflow

Follow this workflow to set up your first governed test execution:

### **1. Generate Contract**

The contract is your automation's source of truth.

**Via UI:**
1. Click the **Contract** tab in the navigation
2. You'll see "No Contract Found"
3. Click **Generate Contract**
4. Wait for the job to complete (~10-30 seconds)
5. ✅ You'll see "Contract generated successfully"

**What happened:**
- Scanned your repository structure
- Detected Playwright test files
- Generated policy definitions
- Created contract fingerprint
- Saved to `.mcp-contract/`

**Via CLI (alternative):**
```bash
npm run contract:generate
```

---

### **2. Build Cache**

The cache detects which pages are accessible in your application.

**Via UI:**
1. Click the **Cache** tab
2. You'll see "No Cache Found" (with "Build Cache" button)
3. Click **Build Cache**
4. Wait for the job to complete (~20-60 seconds)
5. ✅ You'll see "Cache built successfully"

**What happened:**
- Loaded the contract you just generated
- Scanned your application URLs
- Detected accessible pages
- Bound cache to contract fingerprint
- Saved to `.mcp-cache/v1/`

**Via CLI (alternative):**
```bash
npm run cache:build
```

---

### **3. Check Integrity**

Verify that your contract and cache are synchronized.

**Via UI:**
1. Click the **Integrity** tab
2. You should see **"All Gates Passed"** status badge
3. Expand the gate cards to see details:
   - ✅ **Contract Integrity Gate** - Valid
   - ✅ **Cache Integrity Gate** - Valid, Synchronized
   - ✅ **Drift Check** - No drift detected

**What this means:**
- Your contract is valid and properly structured
- Your cache is bound to the current contract
- No drift detected - safe to run tests

**Via CLI (alternative):**
```bash
npm run integrity:check
```

---

### **4. Run Tests**

Execute tests with governance enforcement.

**Via UI:**
1. Click the **Runs** tab
2. Click **Run Tests** in the top navigation
3. Wait for the test execution to complete
4. ✅ View the run in the execution history
5. Click on the run to see detailed results

**What happened:**
- Contract loaded and validated
- Cache loaded for page detection
- Tests executed with Playwright
- Deterministic artifacts generated
- Audit trail recorded
- Integrity gates verified

**Via CLI (alternative):**
```bash
npm run test
```

---

## 🔍 Understanding Your First Run

After your first test execution, explore the **Run Detail** page:

### **Overview Tab**
- Exit code and status
- Tests passed/failed
- Duration
- Run metadata

### **Artifacts Tab**
Organized into categories:
- **Core Artifacts** - Test reports and normalized results
- **Integrity Artifacts** - Contract snapshots and validation
- **Healing Artifacts** - Selector healing attempts (if any)
- **Debug Artifacts** - Logs and traces

Click any artifact to view its contents.

### **Audit Tab**
Complete timeline of system operations:
- Contract validation events
- Cache binding events
- Integrity gate checks
- Policy decisions

---

## 📊 System Status Dashboard

The **System Status** page shows your operational health at a glance:

### **When Everything is Ready:**
- **System Ready** badge (green)
- ✅ Contract exists
- ✅ Cache built
- ✅ Integrity gates passing
- Recent runs table with history

### **When Setup Required:**
- **Setup Required** badge (blue)
- Numbered steps with completion status
- Direct links to complete each step
- Clear call-to-action

### **When Issues Detected:**
- **System Warnings** or **Critical Issues** badge
- Detailed issue callouts
- Links to resolve each issue
- Actionable guidance

---

## 🛠️ Common Workflows

### **Contract Changed? Rebuild Cache**

If you modify your test files or application structure:

1. Regenerate contract: **Contract** → **Generate Contract**
2. The **Cache** page will show **Drift Detected** warning
3. Click **Rebuild Cache** to synchronize
4. Verify **Integrity** page shows "No drift detected"

### **Investigating Test Failures**

When a test run fails:

1. Go to **Runs** page
2. Click the failed run (red badge)
3. Check **Exit Code**:
   - **1** = Test failures (normal Playwright failure)
   - **2** = Infrastructure issue
   - **3** = Policy violation (compliance failure)
4. Review **Artifacts** tab for detailed reports
5. Check **Audit** tab for system events

### **Cache Shows No Pages Detected**

If cache builds but detects zero pages:

1. Verify your application is running
2. Check application URLs are accessible
3. Review contract configuration
4. Rebuild cache after fixing issues

---

## 🎓 Key Concepts Recap

| Concept | What It Is | Where It Lives | When to Update |
|---------|-----------|----------------|----------------|
| **Contract** | Source of truth for your automation | `.mcp-contract/` | When test structure changes |
| **Cache** | Page detection results | `.mcp-cache/v1/` | When contract changes or app structure changes |
| **Integrity** | Verification system | Memory (computed) | Checked automatically before runs |
| **Run** | Single test execution | `runs/<runName>/` | Every test execution |

---

## ✅ Success Checklist

You're successfully set up when:

- [ ] UI loads at http://localhost:5173
- [ ] System Status shows **System Ready**
- [ ] Contract generated successfully
- [ ] Cache built successfully
- [ ] Integrity Gates all passing
- [ ] First test run completed
- [ ] Run detail page shows artifacts
- [ ] You can navigate all tabs without errors

---

## 🆘 Troubleshooting

### **UI Won't Start**

```bash
# Check if ports are in use
lsof -i :3001  # API server
lsof -i :5173  # UI client

# Kill processes if needed
kill -9 <PID>

# Restart servers
cd ui-server && npm run dev
cd ui-client && npm run dev
```

### **Contract Generation Fails**

- Ensure you're in a Playwright project directory
- Check that test files exist
- Review console logs for specific errors
- Try CLI version: `npm run contract:generate`

### **Cache Build Fails**

- Ensure contract exists first
- Verify application URLs are accessible
- Check network connectivity
- Review error message in job status card

### **Integrity Gates Failing**

- **Contract Invalid**: Regenerate contract
- **Cache Invalid**: Rebuild cache
- **Drift Detected**: Rebuild cache to sync with contract

### **API Connection Error**

```bash
# Verify UI server is running
curl http://localhost:3001/api/health

# Should return: {"status":"ok"}
```

### **MCP Connection Failed**

```bash
# Check MCP server logs in ui-server terminal
# Should see: "MCP client connected successfully"

# If not, rebuild shared packages
npm run build
```

---

## 📚 Next Steps

Now that you're up and running:

1. **Explore the UI** - Click through each page to understand the system
2. **Read [How It Works](docs/HOW_IT_WORKS.md)** - Understand the operational model
3. **Review [Architecture](docs/architecture/overview.md)** - Learn system design
4. **Configure CI/CD** - See [TeamCity Integration](docs/TEAMCITY.md)
5. **Customize** - Explore contract customization options

---

## 💬 Getting Help

- **Documentation**: Check the `docs/` directory
- **Issues**: https://github.com/DYaj/MindTrace/issues
- **Architecture Questions**: See `docs/architecture/`

---

## 🎉 You're Ready!

You now have a fully operational governance-first test automation platform.

The system will:
- ✅ Validate contracts before execution
- ✅ Detect drift automatically
- ✅ Generate deterministic artifacts
- ✅ Provide complete audit trails
- ✅ Give you operational clarity at every step

Welcome to governed test automation.
