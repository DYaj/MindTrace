# BreakLine UI — V1 Quick Start

## Start the System

### 1. Open Two Terminals

**Terminal 1 — Backend:**
```bash
cd /Users/davidyang/Desktop/MindTrace\ Inc/mindtrace-for-playwright
npm run dev:server
```

You should see:
```
✅ BreakLine UI Server running on http://localhost:3001
📊 Health check: http://localhost:3001/health
📋 Runs API: http://localhost:3001/api/runs
⚙️  System API: http://localhost:3001/api/system/status
```

**Terminal 2 — Frontend:**
```bash
cd /Users/davidyang/Desktop/MindTrace\ Inc/mindtrace-for-playwright
npm run dev:client
```

You should see:
```
  VITE v5.x.x  ready in XXX ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
```

### 2. Open Browser

Navigate to: **http://localhost:3000**

You should see:
- **Left sidebar:** System, Runs navigation
- **Top bar:** "Run Tests" button + system indicators
- **Main content:** System Status page with 4 cards

### 3. Test the UI

**System Page (default):**
- Shows Runtime, Contract, Cache, Drift status cards
- Quick actions (buttons disabled - scaffold only)

**Runs Page:**
- Click "Runs" in sidebar
- Shows table of past test runs
- Exit code badges (green/red/orange)
- Timestamp, test counts, duration

## Verify Backend API

```bash
# Health check
curl http://localhost:3001/health

# Get runs
curl http://localhost:3001/api/runs

# Get system status
curl http://localhost:3001/api/system/status
```

## What's Working

✅ **Backend:**
- Reads `history/run-index.jsonl`
- Augments with artifact data (exit code, test counts)
- System health aggregation
- Path validation enforced

✅ **Frontend:**
- Layout with navigation
- SystemPage with status cards
- RunsPage with table
- System indicators in top bar
- Automatic refresh (system status every 5s)

## What's NOT Working (Expected)

🚧 **Action buttons disabled:**
- "Run Tests" - scaffold only
- "Generate Contract" - scaffold only
- "Build Cache" - scaffold only

These will be wired in Stage 3 (job model + CLI integration).

## Troubleshooting

**Backend won't start:**
- Check port 3001 is not in use: `lsof -i :3001`
- Check logs for errors

**Frontend won't start:**
- Check port 3000 is not in use: `lsof -i :3000`
- Ensure backend is running first (API proxy requires it)

**No runs showing:**
- Normal if `history/run-index.jsonl` is empty
- Run tests with mindtrace CLI to generate runs

**System status shows all missing:**
- Normal if contract/cache don't exist yet
- Runtime should show "Available" if mindtrace-ai-runtime is built

## Next Steps

After verifying V1 works:
1. Review implementation with team
2. Continue to Stage 2 (remaining read pages)
3. Add job model + actions (Stage 3)
4. Wire MCP integration (Stage 4)
