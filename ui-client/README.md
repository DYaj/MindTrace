# BreakLine UI Client

Production-ready React web interface for MindTrace governance and operational control.

## Status: Production-Ready (Stage 8 Complete)

✅ **Operational:**
- Complete operational dashboard with real-time updates
- All pages fully functional (System, Runs, Contract, Cache, Integrity)
- Job status monitoring with live polling
- Run comparison and filtering
- External repository support with clear indicators
- Situation-aware UI with context-specific messaging
- Responsive design for desktop and mobile

---

## Quick Start

```bash
# From ui-client directory
npm run dev
```

**Opens at:** `http://localhost:5173`

**Requires:** UI server running at `http://localhost:3001`

---

## Full Development Setup

```bash
# Terminal 1: Start API server
cd ui-server
npm start

# Terminal 2: Start UI client
cd ui-client
npm run dev
```

---

## Build for Production

```bash
npm run build       # Build to dist/
npm run preview     # Preview production build locally
```

---

## Pages & Features

### **System Page** (`/`)
- **Active Repository** display with external repo indicator
- **System Status** cards (Runtime, Contract, Cache, MCP)
- **Prerequisites** warnings with guided workflows
- **Quick Actions** for common operations
- **Onboarding** guidance for first-time users

### **Runs Page** (`/runs`)
- **Run History** table with filtering (All, Passed, Failed)
- **Job Status** monitoring with live updates
- **Run Comparison** tool for side-by-side analysis
- **Delete Runs** with confirmation modal
- **Empty State** guidance when no runs exist
- **Filter logic:** Runs with 0 tests excluded from "Passed" filter

### **Run Detail Page** (`/runs/:runId`)
- **Run Summary** header with status indicator
- **Test Results** breakdown
- **Artifacts** browser with file viewer
- **Audit Trail** timeline
- **Failure Analysis** (when applicable)

### **Contract Page** (`/contract`)
- **Contract Status** validation
- **Contract Files** list with content viewer
- **Generate Contract** action
- **Fingerprint** display
- **Schema Validation** results

### **Cache Page** (`/cache`)
- **Cache Status** with binding information
- **Cached Pages** list
- **Build Cache** action
- **Drift Detection** warnings
- **Binding Verification** to contract

### **Integrity Page** (`/integrity`)
- **Contract Gate** validation results
- **Cache Gate** validation results
- **Drift Check** with detailed analysis
- **Gate Status** indicators (Valid, Invalid, Warning)
- **Resolution Actions** for each issue

---

## Architecture

### **Technology Stack**
- **Framework:** Vite 5 + React 18 + TypeScript 5
- **Styling:** Tailwind CSS 3
- **State Management:** TanStack Query (React Query) v5
- **Routing:** React Router v6
- **Icons:** Lucide React
- **Date Formatting:** date-fns
- **Types:** Shared via `@breakline/ui-types`

### **Project Structure**
```
src/
├── api/                  # API client and endpoints
│   └── client.ts         # Axios instance with query hooks
├── components/           # Reusable components
│   ├── ExitCodeBadge.tsx
│   ├── JobStatusCard.tsx
│   ├── runs/             # Runs-specific components
│   │   ├── RunFilterBar.tsx
│   │   ├── RunComparisonPanel.tsx
│   │   └── RunSummaryHeader.tsx
│   └── ...
├── hooks/                # Custom React hooks
│   ├── useRuns.ts
│   ├── useSystemStatus.ts
│   ├── useJobStatus.ts
│   └── ...
├── pages/                # Route pages
│   ├── SystemPage.tsx
│   ├── RunsPage.tsx
│   ├── RunDetailPage.tsx
│   ├── ContractPage.tsx
│   ├── CachePage.tsx
│   └── IntegrityPage.tsx
├── App.tsx               # App root with router
├── Layout.tsx            # Shared layout with sidebar
└── main.tsx              # Entry point
```

### **Data Flow**
1. **React Query hooks** fetch data from API (`/api/runs`, `/api/system/status`, etc.)
2. **Polling** for real-time updates (2-second intervals for active jobs)
3. **Optimistic updates** for mutations
4. **Cache invalidation** after mutations
5. **Error handling** with user-friendly messages

---

## Key Components

### **JobStatusCard**
Real-time job monitoring with:
- Status indicator (pending, running, completed, failed)
- Live duration counter
- Result summary on completion
- Auto-refresh every 2 seconds

### **RunSummaryHeader**
Intelligent run status display:
- Success: Green with test counts
- No Tests Found: Yellow warning (exitCode 0, 0 tests)
- Test Failure: Orange with failure count
- Infrastructure Failure: Red (exitCode 2)
- Policy Violation: Purple (exitCode 3)
- Run Failed - No Tests Found: Red (exitCode ≠ 0, 0 tests)

### **RunFilterBar**
Filter controls with counts:
- All: Total runs
- Passed: exitCode 0 AND tests > 0
- Failed: exitCode ≠ 0

### **RunComparisonPanel**
Side-by-side run comparison:
- Select 2 runs from checkboxes
- Compare test results
- Identify new failures or regressions
- Modal overlay with detailed diff

---

## Design System

### **Colors & Status**
- **Success/Valid:** Green (`green-600`, `green-50`)
- **Warning:** Yellow (`yellow-600`, `yellow-50`)
- **Error/Failed:** Red (`red-600`, `red-50`)
- **Info:** Blue (`blue-600`, `blue-50`)
- **Policy Violation:** Purple (`purple-600`, `purple-50`)
- **Infrastructure:** Orange (`orange-600`, `orange-50`)

### **Typography**
- **Headings:** Bold, gray-900
- **Body:** Regular, gray-600
- **Code/Paths:** Mono, gray-700
- **Labels:** Uppercase, small, gray-500

### **Spacing**
- Page padding: `p-4 sm:p-6` (responsive)
- Card spacing: `space-y-6`
- Grid gaps: `gap-4` or `gap-6`

---

## Situation-Aware Messaging

The UI adapts its messaging based on system state:

### **Prerequisites Not Met**
Shows:
- What's missing (Contract, Cache)
- Why it's needed
- How to fix it (clickable links to relevant pages)
- What's already complete

### **Empty States**
Every empty state answers:
- **What?** (No runs yet, no contract files, etc.)
- **Why?** (Haven't generated yet, tests haven't run)
- **What to do?** (Clear next action button)

### **Error States**
All errors show:
- What failed
- Why it failed (when known)
- What to do next (actionable recovery)
- Who to contact (for system errors)

### **External Repository**
- Badge shows "External Repo" when `BREAKLINE_TARGET_REPO` is set
- Repository name and path clearly displayed
- Prevents confusion about which repo is active

---

## Accessibility

- **Keyboard Navigation:** All interactive elements focusable
- **Screen Readers:** Semantic HTML with ARIA labels
- **Color Contrast:** WCAG AA compliant
- **Focus Indicators:** Clear visual focus states
- **Test IDs:** All major elements have `data-testid` attributes

---

## Performance

- **Code Splitting:** Route-based lazy loading
- **Query Caching:** React Query caches API responses
- **Optimistic Updates:** UI updates before API confirms
- **Polling Strategy:** Only active jobs are polled
- **Bundle Size:** ~340KB (gzipped: ~93KB)

---

## Development

### **Hot Reload**
```bash
npm run dev  # Vite HMR enabled
```

### **Type Checking**
```bash
npm run type-check  # TypeScript validation
```

### **Linting**
```bash
npm run lint        # ESLint check
npm run lint:fix    # Auto-fix issues
```

### **Building**
```bash
npm run build       # Production build
npm run preview     # Preview build locally
```

---

## Environment Configuration

The UI client is configured via `vite.config.ts`:

```typescript
server: {
  port: 5173,
  proxy: {
    '/api': 'http://localhost:3001'  // Proxy API requests to backend
  }
}
```

**No environment variables needed for the client.** All configuration is build-time.

---

## API Integration

### **Base URL**
Development: Proxied through Vite (`/api` → `http://localhost:3001/api`)
Production: Configured in `src/api/client.ts`

### **Query Hooks**
```typescript
// Example: useRuns hook
const { data: runs, isLoading, refetch } = useRuns();

// Polls every 2s when enabled
const { data: job } = useJobStatus(jobId, { enabled: !!jobId });
```

### **Mutations**
```typescript
// Example: Run tests
const runTests = async () => {
  const response = await api.runTests();
  setCurrentJobId(response.jobId);
};
```

---

## Troubleshooting

### White Screen
1. Check browser console (F12)
2. Verify API server is running (`http://localhost:3001/health`)
3. Clear browser cache (Cmd+Shift+R / Ctrl+Shift+R)
4. Rebuild: `npm run build && npm run dev`

### API Connection Failed
```bash
# Verify server is running
curl http://localhost:3001/health

# Check proxy configuration in vite.config.ts
```

### Module Not Found
```bash
# Rebuild shared packages
cd ../shared-packages/ui-types && npm run build
cd ../ui-client && npm install
```

See [TROUBLESHOOTING.md](../TROUBLESHOOTING.md) for more solutions.

---

## Browser Support

- **Chrome/Edge:** Latest 2 versions
- **Firefox:** Latest 2 versions
- **Safari:** Latest 2 versions
- **Mobile:** iOS Safari, Chrome Android

**Not supported:** IE11, legacy browsers

---

## Testing

Tests are located in `src/**/__tests__/` (if present).

```bash
# Run tests (when available)
npm test

# Watch mode
npm test -- --watch
```

---

## Deployment

### **Static Hosting**
```bash
npm run build
# Deploy dist/ folder to:
# - Vercel, Netlify, GitHub Pages
# - S3 + CloudFront
# - Any static host
```

### **With Backend**
Serve `dist/` from Express:
```typescript
app.use(express.static('dist'));
app.get('*', (req, res) => res.sendFile('dist/index.html'));
```

---

## Versioning

**Current Version:** 1.1 (Stage 8 - Trust & Polish)

**Changelog:**
- v1.1: External repo support, run filter improvements, situation-aware UI
- v1.0: Initial production release (Stage 5)

---

## License

MIT License - See [LICENSE](../LICENSE) for details

---

**Last Updated:** 2026-03-20
**Status:** Production-ready
