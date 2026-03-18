# BreakLine UI Client (V1 Scaffold)

React + Vite + TypeScript frontend for BreakLine governance control plane.

## Status: V1 First Working Slice

✅ **Complete:**
- Layout with sidebar + top bar
- SystemPage (4 status cards + quick actions)
- RunsPage (run history table with exit code badges)
- System status indicators in top bar
- API client with TanStack Query

🚧 **Scaffold Only:**
- Action buttons (not yet wired)
- Run detail page
- Contract/Cache/Integrity pages

## Development

```bash
# Start dev server (from repo root)
npm run dev:client

# Or from ui-client directory
cd ui-client
npm run dev
```

Runs on `http://localhost:3000` with API proxy to `http://localhost:3001`

## Build

```bash
npm run build
```

## Architecture

- **Framework:** Vite + React 18 + TypeScript
- **Styling:** Tailwind CSS
- **State:** TanStack Query (React Query)
- **Router:** React Router v6
- **Icons:** lucide-react

## Safety Guarantees

- Frontend is read-only (no direct filesystem access)
- All mutations go through backend API
- Typed API contracts from `@breakline/ui-types`
