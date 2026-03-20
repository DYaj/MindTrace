# MindTrace Installation Guide

Complete step-by-step installation instructions.

---

## System Requirements

### **Required**
- **Node.js** 18.0+ or 20.0+ (LTS recommended)
- **npm** 9.0+
- **Git** 2.0+
- **Operating System:** macOS, Linux, or Windows (WSL2 recommended for Windows)

### **Recommended**
- **Terminal:** iTerm2 (macOS), Windows Terminal, or modern shell
- **Browser:** Chrome, Firefox, or Safari (for UI)
- **Editor:** VS Code with TypeScript support

### **Check your versions:**
```bash
node --version   # Should show v18.x.x or v20.x.x
npm --version    # Should show 9.x.x or higher
git --version    # Should show 2.x.x or higher
```

**Don't have Node.js?** Download from https://nodejs.org/ (choose LTS version)

---

## Installation Steps

### **1. Clone the Repository**

```bash
# Clone from GitHub
git clone https://github.com/DYaj/MindTrace.git

# Navigate into the directory
cd MindTrace
```

**Alternative:** If you have SSH configured:
```bash
git clone git@github.com:DYaj/MindTrace.git
cd MindTrace
```

---

### **2. Install Dependencies**

This step installs all packages for the monorepo (may take 2-5 minutes on first run):

```bash
npm install
```

**What this does:**
- Installs dependencies for all workspaces (`ui-client`, `ui-server`, shared packages, etc.)
- Sets up internal package links
- Prepares the build environment

**Troubleshooting:** If you see errors:
- Try `npm cache clean --force` then `npm install` again
- Ensure you're using Node.js 18+ or 20+
- Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for specific error messages

---

### **3. Build Shared Packages**

MindTrace uses internal shared packages that must be built before the UI can run:

```bash
npm run build
```

**What this does:**
- Builds `@breakline/ui-types` (shared TypeScript types)
- Builds `@mindtrace/contracts` (contract definitions)
- Builds `@mindtrace/integrity-gates` (integrity verification)
- Compiles runtime and server code

**This step is required.** Without it, the UI and server won't find their dependencies.

---

### **4. Verify Installation**

Check that everything built correctly:

```bash
# Check that build artifacts exist
ls ui-server/dist/
ls ui-client/dist/
ls shared-packages/ui-types/dist/

# You should see JavaScript files in each dist/ folder
```

---

## First Run

### **Option A: Development Mode (Recommended for first time)**

Run the UI in development mode for hot reload:

```bash
# Terminal 1: Start UI client
cd ui-client
npm run dev
```

You should see:
```
  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

```bash
# Terminal 2: Start API server
cd ui-server
npm start
```

You should see:
```
✅ BreakLine UI Server running on http://localhost:3001
```

**Open your browser:** http://localhost:5173

---

### **Option B: Production Mode**

Build and serve the production-optimized UI:

```bash
# Build UI client for production
cd ui-client
npm run build

# Serve production build (requires separate server or nginx)
# Or preview with:
npm run preview
```

---

## Initial Configuration

### **First Time Workflow**

When you open http://localhost:5173 for the first time:

1. **System Page** (default)
   - Shows system status
   - All components should show "available" or "missing"
   - Repository will show "mindtrace-for-playwright" (the MindTrace repo itself)

2. **Generate Contract**
   - Navigate to **Contract** page (left sidebar)
   - Click "Generate Contract" button
   - Wait for contract generation to complete (~10-30 seconds)
   - Status should change from "Missing" to "Available"

3. **Build Cache**
   - Navigate to **Cache** page
   - Click "Build Cache" button
   - Wait for cache build (~20-60 seconds depending on project size)
   - Status should change to "Available"

4. **Verify Integrity**
   - Navigate to **Integrity** page
   - All gates should show "Valid" or "Pass"
   - If you see drift, rebuild the cache

5. **Run Tests**
   - Navigate to **Runs** page
   - Click "Run Tests" button
   - Watch the job status card for progress
   - Run should appear in the list when complete

**Congratulations!** Your MindTrace installation is working.

---

## External Repository Setup

To use MindTrace with your own Playwright project:

### **1. Verify Your Project**

Your project must:
- Have a `playwright.config.ts` (or `.js`) file
- Have test files (typically in `tests/` or `e2e/` directory)
- Be a valid Playwright project

```bash
# Check your project structure
cd /path/to/your/playwright/project
ls playwright.config.ts    # Should exist
ls tests/*.spec.ts         # Should show your test files
```

### **2. Set Environment Variable**

```bash
# Set target repository (use absolute path)
export BREAKLINE_TARGET_REPO=/Users/you/path/to/your/playwright/project

# Verify it's set
echo $BREAKLINE_TARGET_REPO
```

**Important:** Use absolute paths, not relative paths like `~/projects/myapp`

### **3. Start UI Server with External Repo**

```bash
# Make sure BREAKLINE_TARGET_REPO is set (from step 2)
# Then start the server
cd ui-server
npm start
```

The UI server will now operate on your external repository.

### **4. Start UI Client**

```bash
# In a separate terminal
cd ui-client
npm run dev
```

### **5. Verify External Repo is Active**

Open http://localhost:5173 and check:
- **System page** should show your repository name
- **"External Repo"** badge should appear
- Repository path should match your `BREAKLINE_TARGET_REPO`

### **6. Run the Workflow**

Follow the same workflow as "First Time Workflow" above:
1. Generate Contract (will create `.mcp-contract/` in your project)
2. Build Cache (will create `.mcp-cache/v1/` in your project)
3. Verify Integrity
4. Run Tests (will create `runs/` and `history/` in your project)

**Your project will now have:**
```
your-playwright-project/
├── .mcp-contract/              # Generated contract
├── .mcp-cache/v1/              # Page detection cache
├── runs/                       # Test execution artifacts
├── history/                    # Run index
└── playwright.config.ts        # Your existing config
```

---

## Persistent Configuration

### **Make External Repo Default**

To avoid setting `BREAKLINE_TARGET_REPO` every time:

**Option 1: Shell Profile**
```bash
# Add to ~/.zshrc (macOS) or ~/.bashrc (Linux)
echo 'export BREAKLINE_TARGET_REPO=/path/to/your/project' >> ~/.zshrc
source ~/.zshrc
```

**Option 2: .env File** (in ui-server/)
```bash
cd ui-server
echo 'BREAKLINE_TARGET_REPO=/path/to/your/project' > .env.local
```

**Option 3: npm script** (in ui-server/package.json)
```json
{
  "scripts": {
    "start:external": "BREAKLINE_TARGET_REPO=/path/to/your/project node dist/server.js"
  }
}
```

Then run: `npm run start:external`

---

## Verification Checklist

After installation, verify everything works:

- [ ] ✅ `npm install` completed without errors
- [ ] ✅ `npm run build` completed without errors
- [ ] ✅ UI client runs at http://localhost:5173
- [ ] ✅ API server runs at http://localhost:3001
- [ ] ✅ System page loads and shows component status
- [ ] ✅ Contract can be generated
- [ ] ✅ Cache can be built
- [ ] ✅ Integrity page shows all gates valid
- [ ] ✅ Tests can run and appear in Runs page
- [ ] ✅ (Optional) External repo works when `BREAKLINE_TARGET_REPO` is set

**All checked?** You're ready to use MindTrace!

**Something not working?** See [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

---

## Next Steps

### **Learn the System**
- Read [GETTING_STARTED.md](GETTING_STARTED.md) for guided walkthrough
- Review [docs/HOW_IT_WORKS.md](docs/HOW_IT_WORKS.md) for operational model
- Explore the UI to understand each page's purpose

### **Integrate with Your Project**
- Set up external repo (see "External Repository Setup" above)
- Configure your `playwright.config.ts` if needed
- Generate contract and cache for your application
- Run your first governed test execution

### **Configure for Your Workflow**
- Review [docs/SETUP.md](docs/SETUP.md) for advanced configuration
- Set up CI/CD integration (see [docs/TEAMCITY.md](docs/TEAMCITY.md))
- Customize compliance rules in your contract

---

## Upgrading

To update to the latest version:

```bash
# Pull latest changes
git pull origin main

# Reinstall dependencies (in case package.json changed)
npm install

# Rebuild shared packages
npm run build

# Restart servers
cd ui-server && npm start
cd ui-client && npm run dev
```

---

## Uninstallation

To completely remove MindTrace:

```bash
# Navigate to project directory
cd /path/to/MindTrace

# Stop all running servers (Ctrl+C in terminals)

# Remove node_modules and build artifacts
rm -rf node_modules
rm -rf */node_modules
rm -rf */dist
rm -rf .mcp-contract .mcp-cache runs history

# Remove project directory
cd ..
rm -rf MindTrace
```

**To uninstall from external repo:**
```bash
cd /your/external/repo
rm -rf .mcp-contract .mcp-cache runs history
```

---

## Support

**Issues?** Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

**Questions?** Create an issue at https://github.com/DYaj/MindTrace/issues

**Documentation:** See [README.md](README.md) for full documentation index

---

**Installation Guide Version:** 1.1
**Last Updated:** 2026-03-20 (Stage 8)
**Status:** Production-ready
