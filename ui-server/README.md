# BreakLine UI Server (V1 Scaffold)

Fastify-based control API for BreakLine governance control plane.

## Status: V1 First Working Slice

✅ **Complete:**
- Path validation layer (prevents traversal attacks)
- Services layer (reuses existing logic, no duplication)
- `GET /api/runs` - List runs from history
- `GET /api/system/status` - System health check

🚧 **Scaffold Only:**
- Action endpoints (CLI/MCP integration not yet wired)
- Job model (for async actions)
- Contract/Cache/Integrity endpoints

## Development

```bash
# Start dev server (from repo root)
npm run dev:server

# Or from ui-server directory
cd ui-server
npm run dev
```

Runs on `http://localhost:3001`

## Build

```bash
npm run build
```

## API Endpoints

### Read-Only (Working)
- `GET /health` - Health check
- `GET /api/runs` - List all runs
- `GET /api/system/status` - System status

### Actions (Scaffold)
- `POST /api/actions/run` - Run tests (not yet wired)
- `POST /api/actions/generate-contract` - Generate contract (not yet wired)
- `POST /api/actions/build-cache` - Build cache (not yet wired)

## Architecture

- **Framework:** Fastify + TypeScript
- **Safety:** Path validation, no arbitrary commands
- **Services:** Centralized logic (runs-service, system-service)
- **Types:** Shared via `@breakline/ui-types`

## Safety Guarantees

- Path traversal protection
- No direct artifact writes
- No arbitrary shell execution
- Read-only filesystem access for UI purposes
