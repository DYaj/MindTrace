# MindTrace Troubleshooting Guide

Quick solutions to common issues.

---

## Installation Issues

### `npm install` fails

**Symptom:** Errors during `npm install` in the root directory.

**Solution:**
```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

**Still failing?** Check Node.js version:
```bash
node --version  # Should be 18+ or 20+
npm --version   # Should be 9+
```

### Workspace packages not building

**Symptom:** Import errors like "Cannot find module '@breakline/ui-types'"

**Solution:**
```bash
# Build all shared packages first
npm run build

# Then build specific packages
cd ui-server && npm run build
cd ui-client && npm run build
```

---

## Server Issues

### Port already in use (EADDRINUSE)

**Symptom:**
```
Error: listen EADDRINUSE: address already in use 0.0.0.0:3001
```

**Solution:**
```bash
# Find and kill process on port 3001
lsof -ti:3001 | xargs kill -9

# Or use a different port
PORT=3002 npm start
```

### UI server won't start

**Symptom:** Server crashes immediately or shows TypeScript errors

**Solution:**
```bash
# Rebuild the server
cd ui-server
npm run build
npm start

# Check for missing environment variables
echo $BREAKLINE_ROOT
echo $BREAKLINE_TARGET_REPO
```

### UI client shows white screen

**Symptom:** Browser shows blank white page at http://localhost:5173

**Solutions:**
1. **Check browser console** for errors (F12 → Console tab)
2. **Verify API connection:**
   ```bash
   curl http://localhost:3001/api/system/status
   ```
3. **Rebuild UI client:**
   ```bash
   cd ui-client
   npm run build
   npm run dev
   ```
4. **Clear browser cache** (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)

---

## Runtime Issues

### Runtime CLI fails with "Cannot find module"

**Symptom:**
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../loader'
```

**Solution:** This was fixed in Stage 8. Make sure you're on the latest version:
```bash
git pull origin main
npm install
npm run build
```

### Tests run but show 0 passed, 0 failed

**Symptom:** Job completes successfully but no test results

**Possible causes:**

1. **No tests found in your project**
   ```bash
   # Check if your project has tests
   ls tests/*.spec.ts  # or wherever your tests are
   ```

2. **Wrong test directory configured**
   - Check `playwright.config.ts` → `testDir` setting
   - Ensure tests match the configured pattern

3. **Tests are being skipped**
   - Look for `.skip()` or `.only()` in your tests
   - Check test file naming (must end with `.spec.ts` or `.test.ts`)

**Expected behavior:** Runs with 0 tests will NOT appear in the "Passed" filter (this is correct). They show in "All" filter with a "No Tests Found" label.

### Contract generation fails

**Symptom:** "Missing compliance contract" or contract validation errors

**Solution:**
```bash
# For MindTrace repo (uses its own contracts)
npm run contract:generate

# For external repo
export BREAKLINE_TARGET_REPO=/path/to/your/project
cd ui-server && npm start
# Then use UI to generate contract
```

**Still failing?** Check that:
- Your project has a `playwright.config.ts` file
- The config file is valid TypeScript
- Your project structure matches Playwright conventions

---

## External Repository Issues

### "Repository not found" or path errors

**Symptom:** UI shows wrong repository or can't find files

**Solution:**
```bash
# Use absolute paths
export BREAKLINE_TARGET_REPO=/Users/you/full/path/to/project

# Verify the path exists
ls $BREAKLINE_TARGET_REPO/playwright.config.ts

# Restart UI server
cd ui-server && npm start
```

### External repo shows "Contract Missing" but it exists

**Symptom:** UI says contract is missing but you can see `.mcp-contract/` folder

**Cause:** Contract must have actual files, not just the directory

**Solution:**
```bash
# Check contract contents
ls -la $BREAKLINE_TARGET_REPO/.mcp-contract/

# Should see files like:
# - automation-contract.json
# - automation-contract.hash
# - contract.fingerprint.sha256
```

If empty, generate contract through the UI.

### Runs don't appear in UI for external repo

**Symptom:** Tests run successfully but UI shows "No Runs Yet"

**Checklist:**
1. Verify `BREAKLINE_TARGET_REPO` is set when starting UI server
2. Check that run folder exists:
   ```bash
   ls $BREAKLINE_TARGET_REPO/runs/
   ```
3. Verify history index:
   ```bash
   cat $BREAKLINE_TARGET_REPO/history/run-index.jsonl
   ```
4. Restart UI server with correct environment variable

---

## UI Filter Issues

### Runs appear in wrong filter

**Expected behavior (as of Stage 8):**
- **All:** Shows all runs (including those with 0 tests)
- **Passed:** Shows only runs with `exitCode: 0` AND tests executed
- **Failed:** Shows runs with `exitCode !== 0`

**Runs with 0 tests:**
- Will NOT appear in "Passed" filter
- WILL appear in "All" filter
- Show "No Tests Found" label

If you see different behavior, you may be on an old version. Update to latest:
```bash
git pull origin main
cd ui-client && npm run build
```

---

## Integration Gate Issues

### Cache drift detected

**Symptom:** Integrity page shows "Cache drift detected"

**Meaning:** Your contract has changed since the cache was built

**Solution:**
```bash
# Rebuild the cache to sync with current contract
npm run cache:build

# Or use UI: Cache page → "Build Cache" button
```

### Invalid contract error

**Symptom:** Integrity gate shows contract as "Invalid"

**Causes:**
- Contract files are corrupted
- Contract schema validation failed
- Missing required contract files

**Solution:**
```bash
# Regenerate contract
npm run contract:generate

# Verify contract files exist
ls .mcp-contract/
```

---

## Performance Issues

### UI is slow or unresponsive

**Solutions:**
1. **Check for large run history:**
   ```bash
   ls runs/ | wc -l  # Shows number of runs
   ```
   Consider archiving old runs if > 100

2. **Reduce polling frequency** (for development):
   - React Query polls every 2 seconds by default
   - This is normal and shouldn't cause issues

3. **Check system resources:**
   ```bash
   # Monitor Node.js processes
   ps aux | grep node

   # Check memory usage
   top -o mem
   ```

### Build is slow

**Expected:** First build takes 2-5 minutes (normal for monorepo)

**To speed up:**
```bash
# Build only what you need
cd ui-client && npm run build  # Just UI
cd ui-server && npm run build  # Just server

# Skip type checking (faster, but risky)
cd ui-client && vite build --mode development
```

---

## Getting Help

If you've tried these solutions and still have issues:

1. **Check the logs:**
   - Browser console (F12)
   - Server logs in terminal
   - Runtime output in UI

2. **Verify your setup:**
   ```bash
   # Run diagnostics
   node --version          # Should be 18+
   npm --version           # Should be 9+
   git status              # Check for uncommitted changes
   git branch              # Ensure you're on main or a feature branch
   ```

3. **Create an issue:**
   - Go to https://github.com/DYaj/MindTrace/issues
   - Include:
     - Error message (full text)
     - Steps to reproduce
     - Node.js/npm versions
     - Operating system

---

## Common Error Messages Decoded

| Error | Meaning | Fix |
|-------|---------|-----|
| `ERR_MODULE_NOT_FOUND` | Missing ESM module | Update to latest version (Stage 8 fix) |
| `EADDRINUSE` | Port already in use | Kill process: `lsof -ti:3001 \| xargs kill -9` |
| `Cannot find module '@breakline/ui-types'` | Shared packages not built | Run `npm run build` in root |
| `Contract validation failed` | Invalid contract structure | Regenerate: `npm run contract:generate` |
| `Missing compliance contract` | Contract path issue | Set `BREAKLINE_ROOT` or regenerate contract |
| `listen EADDRINUSE` | Port conflict | Use different port or kill existing process |

---

## FAQ

**Q: Do I need to rebuild after every git pull?**
A: Only if shared packages changed. Safe to run `npm install && npm run build` after each pull.

**Q: Can I run MindTrace on multiple projects simultaneously?**
A: Not currently. Use `BREAKLINE_TARGET_REPO` to switch between projects. Multiple instances would require different ports.

**Q: Why does the UI show "External Repo" badge?**
A: This indicates `BREAKLINE_TARGET_REPO` is set and you're operating on a different repository than the MindTrace installation. This is correct and expected.

**Q: What's the difference between Contract and Cache?**
A: **Contract** = what should be tested (your source code structure). **Cache** = what can be tested (actual pages detected in your app). Cache is built from the Contract.

**Q: Can I skip the Contract or Cache?**
A: No. The system requires both for governed execution. This is intentional to ensure compliance and traceability.

---

**Last Updated:** 2026-03-20 (Stage 8 complete)
