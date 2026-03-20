# BreakLine UI Server

Express-based REST API for MindTrace governance and operational control.

## Status: Production-Ready (Stage 8 Complete)

✅ **Operational:**
- Full REST API for MindTrace operations
- System status and health monitoring
- Run management and job orchestration
- Contract, Cache, and Integrity operations
- External repository support
- Real-time job status polling

---

## Quick Start

```bash
# From ui-server directory
npm run build
npm start

# Or development mode with hot reload
npm run dev
```

**Server runs at:** `http://localhost:3001`

**Health check:** http://localhost:3001/health

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `BREAKLINE_TARGET_REPO` | Target repository for operations | Current directory |
| `BREAKLINE_ROOT` | BreakLine installation root | Auto-detected |
| `PORT` | Server port | 3001 |

### **External Repository Mode**

To operate on an external Playwright project:

```bash
export BREAKLINE_TARGET_REPO=/path/to/your/playwright/project
npm start
```

All operations (contract, cache, runs) will use the external repository.

---

## API Endpoints

### **System**
- `GET /health` - Health check
- `GET /api/system/status` - System status (runtime, contract, cache, MCP, repository)

### **Runs**
- `GET /api/runs` - List all runs
- `GET /api/runs/:runId` - Get run details
- `POST /api/runs` - Trigger new test run
- `DELETE /api/runs/:runId` - Delete a run

### **Jobs** (Async Operations)
- `POST /api/jobs/run` - Start test run job
- `POST /api/jobs/generate-contract` - Start contract generation job
- `POST /api/jobs/build-cache` - Start cache build job
- `GET /api/jobs/:jobId` - Get job status

### **Contract**
- `GET /api/contract/status` - Contract status and validation
- `GET /api/contract/files` - List contract files
- `POST /api/contract/generate` - Generate contract

### **Cache**
- `GET /api/cache/status` - Cache status and binding info
- `GET /api/cache/pages` - List cached pages
- `POST /api/cache/build` - Build cache

### **Integrity**
- `GET /api/integrity` - Complete integrity status
  - Contract gate validation
  - Cache gate validation
  - Drift detection

### **Artifacts**
- `GET /api/runs/:runId/artifacts` - List run artifacts
- `GET /api/runs/:runId/artifacts/:path` - Get artifact content

---

## Architecture

### **Technology Stack**
- **Framework:** Express.js + TypeScript
- **Routing:** RESTful API design
- **Types:** Shared via `@breakline/ui-types`
- **Services:** Layered architecture (routes → services → utilities)

### **Service Layer**
```
routes/           # Express route handlers
  ├── runs.ts     # Run management endpoints
  ├── jobs.ts     # Job orchestration endpoints
  ├── system.ts   # System status endpoints
  ├── contract.ts # Contract operations
  ├── cache.ts    # Cache operations
  └── integrity.ts # Integrity verification

services/         # Business logic layer
  ├── runs-service.ts      # Run data aggregation
  ├── system-service.ts    # System health checks
  ├── cli-service.ts       # Runtime CLI execution
  ├── job-service.ts       # Job state management
  ├── contract-service.ts  # Contract operations
  ├── cache-service.ts     # Cache operations
  └── integrity-service.ts # Integrity gates

utils/            # Shared utilities
  ├── paths.ts            # Path validation and safety
  ├── breakline-root.ts   # Installation root resolution
  └── target-repo-root.ts # Target repo resolution
```

### **Path Resolution**
- **BreakLine Root:** Installation directory (where MindTrace is installed)
- **Target Repo Root:** Repository being operated on (can be external)
- **Contracts:** Located in `BREAKLINE_ROOT/contracts/`
- **Runtime:** Located in `BREAKLINE_ROOT/mindtrace-ai-runtime/`
- **Artifacts:** Located in `TARGET_REPO/.mcp-contract/`, `.mcp-cache/`, `runs/`, etc.

---

## Safety Guarantees

### **Path Validation**
- All file paths validated against traversal attacks
- Paths constrained to target repository or BreakLine root
- No arbitrary filesystem access

### **Process Isolation**
- CLI spawned as separate process
- Environment variables controlled
- Working directory set explicitly
- No shell injection vulnerabilities

### **Read-Only by Default**
- GET endpoints are read-only
- POST endpoints require explicit validation
- No direct artifact writes (only via CLI)
- No arbitrary command execution

---

## Development

### **Build**
```bash
npm run build  # Compile TypeScript to dist/
```

### **Development Mode**
```bash
npm run dev    # Watch mode with nodemon
```

### **Testing**
```bash
# Start server
npm start

# In another terminal, test endpoints
curl http://localhost:3001/health
curl http://localhost:3001/api/system/status
curl http://localhost:3001/api/runs
```

---

## Integration

### **With UI Client**
The UI client (`ui-client/`) consumes this API:
- Base URL: `http://localhost:3001`
- Auto-polling for job status (2 second intervals)
- React Query for data fetching and caching

### **With Runtime CLI**
The server spawns the runtime CLI for test execution:
```typescript
spawn('node', [runtimeCli, 'run'], {
  cwd: targetRepoRoot,
  env: { ...process.env, BREAKLINE_ROOT: getBreaklineRoot() }
})
```

### **With MCP**
The server integrates with repo-intelligence-mcp for:
- Contract generation
- Cache building
- Integrity verification

---

## Troubleshooting

### Port Already in Use
```bash
# Find and kill process
lsof -ti:3001 | xargs kill -9

# Or use different port
PORT=3002 npm start
```

### Cannot Find Module Errors
```bash
# Rebuild shared packages
cd ../shared-packages/ui-types && npm run build
cd ../ui-server && npm run build
```

### External Repo Not Working
```bash
# Verify environment variable is set
echo $BREAKLINE_TARGET_REPO

# Use absolute path
export BREAKLINE_TARGET_REPO=/Users/you/full/path/to/project
```

See [TROUBLESHOOTING.md](../TROUBLESHOOTING.md) for more solutions.

---

## API Response Format

All endpoints return JSON with this structure:

```typescript
// Success
{
  "success": true,
  "data": { /* endpoint-specific data */ }
}

// Error
{
  "success": false,
  "error": "Error message here"
}
```

---

## Versioning

**Current Version:** 1.1 (Stage 8 - Trust & External Repo Support)

**Changelog:**
- v1.1: External repo support, runtime infrastructure repair
- v1.0: Initial production release (Stage 5)

---

## License

MIT License - See [LICENSE](../LICENSE) for details

---

**Last Updated:** 2026-03-20
**Status:** Production-ready
