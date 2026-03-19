# UI System Architecture

Documentation for the MindTrace web interface built during Stage 5.

---

## 🎯 Overview

The MindTrace UI is a **production-ready operational dashboard** that provides complete visibility and control over the governance-first test automation platform.

**Built with:**
- React 18 + TypeScript
- Vite (build tool)
- TailwindCSS (styling)
- React Router (navigation)
- TanStack Query (data fetching)
- Lucide React (icons)

**Hosted on:**
- **UI Client**: Port 5173 (Vite dev server)
- **UI Server**: Port 3001 (Express API)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    UI Client (React)                         │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Pages      │  │  Components  │  │    Hooks     │      │
│  │              │  │              │  │              │      │
│  │ • System     │  │ • InfoTooltip│  │ • useSystem  │      │
│  │ • Runs       │  │ • StatusBadge│  │ • useRuns    │      │
│  │ • Contract   │  │ • JobStatus  │  │ • useContract│      │
│  │ • Cache      │  │ • ExitCode   │  │ • useCache   │      │
│  │ • Integrity  │  │ • FileViewer │  │ • useIntegrity│     │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                              │
└────────────────────────┬─────────────────────────────────────┘
                         │ HTTP (REST)
┌────────────────────────▼─────────────────────────────────────┐
│                 UI Server (Express)                          │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Routes     │  │   Services   │  │  MCP Client  │      │
│  │              │  │              │  │              │      │
│  │ • /api/system│  │ • system     │  │ • stdio      │      │
│  │ • /api/runs  │  │ • integrity  │  │ • prompts    │      │
│  │ • /api/contract│ • jobs        │  │              │      │
│  │ • /api/cache │  │              │  │              │      │
│  │ • /api/integrity│             │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└────────────────────────┬─────────────────────────────────────┘
                         │ stdio (MCP Protocol)
┌────────────────────────▼─────────────────────────────────────┐
│          Repo Intelligence MCP (Node.js)                     │
│                                                              │
│  • Contract generation                                       │
│  • Cache building                                            │
│  • Integrity verification                                    │
│  • File system operations                                    │
└──────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
ui-client/
├── src/
│   ├── pages/
│   │   ├── SystemPage.tsx        # System status dashboard
│   │   ├── RunsPage.tsx          # Test execution history
│   │   ├── RunDetailPage.tsx     # Single run deep dive
│   │   ├── ContractPage.tsx      # Contract management
│   │   ├── CachePage.tsx         # Cache operations
│   │   └── IntegrityPage.tsx     # Integrity gates
│   ├── components/
│   │   ├── Layout.tsx            # Main layout with nav
│   │   ├── InfoTooltip.tsx       # Reusable tooltip
│   │   ├── JobStatusCard.tsx     # Job monitoring
│   │   ├── ExitCodeBadge.tsx     # Exit code display
│   │   └── run/                  # Run-specific components
│   ├── hooks/
│   │   ├── useSystemStatus.ts    # System data fetching
│   │   ├── useRuns.ts            # Runs data fetching
│   │   ├── useRunDetail.ts       # Single run data
│   │   ├── useContract.ts        # Contract data
│   │   ├── useCache.ts           # Cache data
│   │   └── useIntegrity.ts       # Integrity gates data
│   ├── api/
│   │   └── client.ts             # API client configuration
│   └── main.tsx                  # App entry point

ui-server/
├── src/
│   ├── routes/
│   │   ├── system.ts             # /api/system/* endpoints
│   │   ├── runs.ts               # /api/runs/* endpoints
│   │   ├── actions.ts            # /api/actions/* endpoints
│   │   └── integrity.ts          # /api/integrity endpoint
│   ├── services/
│   │   ├── system-service.ts     # System status logic
│   │   ├── integrity-service.ts  # Integrity gate logic
│   │   └── job-service.ts        # Job management
│   ├── mcp/
│   │   └── client.ts             # MCP connection manager
│   └── index.ts                  # Server entry point

shared-packages/ui-types/
└── src/
    └── index.ts                  # Shared TypeScript types
```

---

## 🎨 Design System

### **Color Palette**

**Status Colors:**
- **Success**: Green (`bg-green-100`, `text-green-800`)
- **Warning**: Orange (`bg-orange-100`, `text-orange-800`)
- **Error**: Red (`bg-red-100`, `text-red-800`)
- **Info**: Blue (`bg-blue-100`, `text-blue-800`)
- **Neutral**: Gray (`bg-gray-100`, `text-gray-800`)

**Exit Code Colors:**
- **0 (Success)**: Green
- **1 (Test Failure)**: Red
- **2 (Infrastructure)**: Orange
- **3 (Policy Violation)**: Dark Red (bold)

---

### **Typography**

**Page Titles:**
```tsx
className="text-2xl sm:text-3xl font-bold text-gray-900"
```

**Section Headings:**
```tsx
className="text-lg font-semibold text-gray-900"
```

**Body Text:**
```tsx
className="text-sm sm:text-base text-gray-600"
```

**Labels:**
```tsx
className="text-sm font-medium text-gray-600"
```

---

### **Spacing**

**Container Padding:**
```tsx
className="p-4 sm:p-6"  // Responsive: 16px → 24px
```

**Gap Between Elements:**
```tsx
className="gap-3"  // 12px - consistent across all pages
className="gap-6"  // 24px - for larger sections
```

**Card Borders:**
```tsx
className="rounded-lg border-2"  // Consistent border radius + width
```

---

### **Components**

#### **Status Badge**
Used on System and Integrity pages for operational status.

```tsx
interface StatusBadgeProps {
  icon: React.ElementType;
  label: string;
  tooltipContent: string;
  bgColor: string;
  textColor: string;
}
```

**Pattern:**
- Inline-flex with gap
- Circular icon background
- Tooltip on hover/click
- Consistent sizing

**Example:**
```tsx
<StatusBadge
  icon={CheckCircle}
  label="System Ready"
  tooltipContent="All components operational..."
  bgColor="bg-green-100"
  textColor="text-green-800"
/>
```

---

#### **Info Tooltip**
Reusable tooltip for page headers and contextual help.

```tsx
interface InfoTooltipProps {
  title: string;
  content: string | ReactNode;
  icon?: LucideIcon;
  className?: string;
}
```

**Pattern:**
- Small (?) icon button
- Popover on hover or click
- Supports rich content (ReactNode)
- Optional custom icon

**Example:**
```tsx
<InfoTooltip
  title="What is the Contract?"
  content={<p>The contract is your test automation's source of truth...</p>}
  icon={FileCode}
/>
```

---

#### **Job Status Card**
Real-time job monitoring with status updates.

```tsx
interface JobStatusCardProps {
  jobId: string;
  onComplete?: (job: JobStatus) => void;
}
```

**Features:**
- Auto-polling (1s interval while running)
- Status icons (pending, running, completed, failed)
- Progress indication
- Output display
- Auto-dismisses or shows error

---

#### **Exit Code Badge**
Standardized exit code display.

```tsx
interface ExitCodeBadgeProps {
  exitCode: 0 | 1 | 2 | 3;
}
```

**Mapping:**
- 0 → "Success" (green)
- 1 → "Test Failure" (red)
- 2 → "Infrastructure" (orange)
- 3 → "Policy Violation" (dark red, bold)

---

### **Empty States**

**Pattern (Stage 5 Phase 6):**

```tsx
<div className="p-12 text-center">
  <div className="flex flex-col items-center gap-3">
    {/* Icon */}
    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
      <Icon size={32} className="text-gray-400" />
    </div>

    {/* Title */}
    <h3 className="text-lg font-semibold text-gray-900">
      Title Here
    </h3>

    {/* Description (1-2 sentences max) */}
    <p className="text-sm text-gray-600 max-w-md">
      Concise explanation of what this state means.
    </p>

    {/* Optional action button */}
    <button className="mt-2 ...">
      Action Button
    </button>
  </div>
</div>
```

**Key Principles:**
- Centered layout
- Large icon (32px) in circular background (64px)
- Title explains the state
- **1 sentence ideal, 2 max** for description
- Optional action button below

---

### **Error States**

**Pattern (Stage 5 Phase 6):**

```tsx
<div className="bg-red-50 border border-red-200 rounded-lg p-6">
  <div className="flex items-start gap-3">
    {/* Icon */}
    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
      <XCircle size={20} className="text-red-600" />
    </div>

    {/* Content */}
    <div className="flex-1">
      <h3 className="text-base font-semibold text-red-900 mb-1">
        Failed to Load [Resource]
      </h3>
      <p className="text-sm text-red-800 mb-4">
        Clear error message explaining what went wrong.
      </p>

      {/* Actions */}
      <button className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg ...">
        <RefreshCw size={16} />
        Retry
      </button>
    </div>
  </div>
</div>
```

**Key Principles:**
- Consistent error UI across all pages
- Icon in circular background (red)
- Clear title: "Failed to Load [Resource]"
- Detailed error message
- **Always include Retry button**
- Additional navigation if helpful (e.g., Back button)

---

## 🔄 Data Flow

### **Data Fetching Pattern**

All pages use **React Query** (TanStack Query) for:
- Automatic caching
- Background refetching
- Loading states
- Error handling

**Example Hook:**
```typescript
export function useSystemStatus() {
  return useQuery({
    queryKey: ['system-status'],
    queryFn: async () => {
      const response = await fetch('http://localhost:3001/api/system/status');
      const data = await response.json();
      if (!data.success) throw new Error(data.error);
      return data.data as SystemStatus;
    },
    refetchInterval: 5000, // Poll every 5 seconds
  });
}
```

---

### **Job Status Polling**

For long-running operations (contract generation, cache building):

```typescript
export function useJobStatus(jobId: string | null) {
  return useQuery({
    queryKey: ['job-status', jobId],
    queryFn: async () => {
      const response = await fetch(`http://localhost:3001/api/jobs/${jobId}`);
      const data = await response.json();
      return data.data as JobStatus;
    },
    enabled: !!jobId, // Only run if jobId exists
    refetchInterval: (query) => {
      const data = query.state.data;
      // Poll every 1s while running, stop when complete/failed
      return data?.status === 'running' || data?.status === 'pending' ? 1000 : false;
    },
  });
}
```

---

### **State Management**

**Global State:**
- Minimal - most state lives in React Query cache
- URL parameters for navigation (React Router)
- Session storage for job IDs (persistence across refreshes)

**Local State:**
- Component-specific UI state (modals, tabs, selected items)
- Form inputs
- Temporary UI flags

**Example Session Storage:**
```typescript
const STORAGE_KEY = 'breakline:contract:currentJobId';

// Save job ID
sessionStorage.setItem(STORAGE_KEY, jobId);

// Retrieve on mount
const [currentJobId, setCurrentJobId] = useState<string | null>(() => {
  return sessionStorage.getItem(STORAGE_KEY);
});
```

---

## 🎯 Page Architecture

### **System Status Page**

**Purpose:** Operational dashboard showing system health at a glance.

**Components:**
- Status badge (System Ready | Setup Required | Warnings | Critical Issues)
- Component status grid (Contract, Cache, Runtime, MCP)
- Recent runs table (last 10 runs)
- Quick actions (Generate Contract, Build Cache, Run Tests)
- Contextual banners (setup guidance, warnings, critical issues)

**Situation Awareness:**
- Detects "not created" state (no run history + missing components)
- Shows "Setup Required" (blue, welcoming) vs "Critical Issues" (red, urgent)
- Banners only appear for real issues or first-time setup

**Status Badge Logic:**
```typescript
const isNotCreated = !hasRunHistory && (contractMissing || cacheMissing);
const hasCritical = contractMissing || cacheMissing || integrityFailed;
const hasWarnings = !hasCritical && (driftDetected || otherIssues);

// Badge: Setup Required | System Ready | System Warnings | Critical Issues
```

---

### **Runs Page**

**Purpose:** Test execution history with quick access to run details.

**Components:**
- Run history table (sortable by date)
- Exit code badges
- Test result summary
- Delete run action
- Prerequisite warning (if contract/cache missing)
- Job status card (when test running)

**Empty State:**
- "No Test Runs Yet" with context-aware message
- Different guidance if prerequisites ready vs not ready
- No scary "failed" messaging

**Prerequisite Warning:**
```tsx
{(!contract?.exists || !cache?.exists) && (
  <div className="bg-blue-50 border border-blue-200 ...">
    <h3>Prerequisites Required</h3>
    <ol>
      <li>Generate Contract {contract?.exists && '✓'}</li>
      <li>Build Cache {cache?.exists && '✓'}</li>
    </ol>
  </div>
)}
```

---

### **Run Detail Page**

**Purpose:** Deep dive into a single test execution.

**Tabs:**
- **Overview**: Summary stats, exit code, duration
- **Artifacts**: Categorized files (Core, Integrity, Healing, Debug)
- **Audit**: Event timeline

**Artifact Categories:**
```typescript
const grouped = categorizeArtifacts(artifacts);
// Returns: { core: [], integrity: [], healing: [], debug: [] }
```

**Empty States:**
- "No Artifacts" - Explains what artifacts are
- "No Audit Events" - Simple, not alarming

**Error State:**
- Prominent error UI with Retry + Back buttons

---

### **Contract Page**

**Purpose:** Contract generation and management.

**States:**
- **No Contract**: "Generate Contract" button with guidance
- **Contract Exists**: File list, validation status, regenerate option
- **Generating**: Job status card with progress

**Features:**
- File viewer modal (click contract files)
- Success banner after generation (links to Integrity page)
- InfoTooltip explaining what contracts are

**Empty State:**
```tsx
<div className="text-center">
  <FileCode size={48} />
  <h2>No Contract Found</h2>
  <p>Generate your first contract to begin</p>
  <p className="text-xs">.mcp-contract/</p>
  <button>Generate Contract</button>
</div>
```

---

### **Cache Page**

**Purpose:** Cache building and drift management.

**States:**
- **No Cache**: "Build Cache" button (blocked if no contract)
- **Cache Exists**: Page list, binding status, drift warnings
- **Building**: Job status card with progress

**Features:**
- Page viewer modal (click page files)
- Drift warning banner (prominent if detected)
- Contract binding visualization (fingerprint comparison)
- Rebuild button (appears when drift detected or cache invalid)

**Drift Warning:**
```tsx
{hasDrift && (
  <div className="bg-orange-50 border-2 border-orange-200 ...">
    <AlertTriangle />
    <h3>Drift Detected</h3>
    <p>Your cache was built from an older contract version...</p>
    <button>Rebuild Cache Now</button>
  </div>
)}
```

**No Pages Detected:**
```tsx
{cache.pages.length === 0 && (
  <div className="text-center">
    <FileText size={32} className="text-orange-600" />
    <h3>No Pages Detected</h3>
    <p>Cache built successfully but detected zero pages — verify your application is accessible.</p>
    <button>Rebuild Cache</button>
  </div>
)}
```

---

### **Integrity Page**

**Purpose:** Integrity gate verification and drift detection.

**Components:**
- Status badge (All Gates Passed | Setup Required | Warnings | Critical Failures)
- EnhancedGateCard for each gate:
  - Contract Integrity Gate
  - Cache Integrity Gate
  - Drift Check
- Technical details (expandable)
- Explanation sections ("What this means" + "What to do")

**Situation Awareness:**
```typescript
// Detect "not created" vs "failed"
const isNotCreated = gateResult.status === 'invalid' &&
  (reason.includes('missing') ||
   reason.includes('not found') ||
   reason.includes('not generated'));

// Show appropriate status:
// - "Not Created" (gray, neutral) for missing resources
// - "Failed" (red, critical) for actual validation errors
```

**Status Badge Logic:**
```typescript
const allPassed = contractValid && cacheValid && !drift;
const hasCritical = contractInvalid || cacheInvalid;
const isSetup = contractNotCreated || cacheNotCreated;

// Badge: All Gates Passed | Setup Required | Critical Failures | Warnings Detected
```

---

## 🧩 Shared Types

Located in `shared-packages/ui-types/src/index.ts`:

```typescript
// System Status
export interface SystemStatus {
  runtime: ComponentStatus;
  contract: ComponentStatus;
  cache: ComponentStatus;
  mcp: ComponentStatus;
}

export interface ComponentStatus {
  state: 'available' | 'missing' | 'error';
  detail?: string;
}

// Integrity Gates
export type GateResult =
  | { status: 'valid' }
  | { status: 'invalid'; reason: string }
  | { status: 'warning'; reason: string };

export interface IntegrityStatus {
  contractGate: GateResult;
  cacheGate: GateResult;
  driftCheck: DriftResult;
}

// Job Status
export interface JobStatus {
  jobId: string;
  type: 'generate-contract' | 'build-cache' | 'run-tests';
  status: 'pending' | 'running' | 'completed' | 'failed';
  output?: string;
  error?: string;
  progress?: number;
}

// Run History
export interface TestRun {
  runId: string;
  runName: string;
  timestamp: string;
  exitCode: 0 | 1 | 2 | 3;
  duration: number;
  testsPassed: number;
  testsFailed: number;
  artifacts: Artifact[];
  auditEvents: AuditEvent[];
}
```

---

## 🎓 Design Decisions

### **Why Situation Awareness?**

**Problem:** First-time users saw "Failed" status when nothing was created yet.

**Solution:** Distinguish "not created" from "failed":
- "Not Created" (gray, neutral) → First-time setup
- "Failed" (red, critical) → Actual validation error

**Result:** Welcoming first-time experience, no scary error messages for empty states.

---

### **Why Status Badge Tooltips?**

**Problem:** Large success banners cluttered UI when everything worked.

**Solution:** Compact status badge with integrated tooltip:
- Success states → Badge + tooltip (no banner)
- Issue states → Badge + banner with actions

**Result:** Clean UI when things work, actionable guidance when they don't.

---

### **Why Progressive Disclosure?**

**Problem:** Too much information overwhelms users.

**Solution:** Three-tier hierarchy:
- **UI** → Shows what matters
- **Tooltips** → Explain on demand
- **Expandable sections** → Reveal technical details

**Result:** Simple interface for most users, depth for advanced users.

---

### **Why Text Discipline (1-2 Sentences)?**

**Problem:** Verbose explanations become noise.

**Solution:** Strict limit on empty state text:
- 1 sentence ideal
- 2 sentences max
- No educational text creep

**Result:** Users read and understand messages instead of skipping them.

---

### **Why Retry on Every Error?**

**Problem:** Users got stuck with no recovery path.

**Solution:** Every error state has Retry button.

**Result:** Users can attempt recovery without refreshing or restarting.

---

## 🔄 Evolution: Stage 5

### **Phase 1-2: Job Visibility & Run Detail**
- Job status monitoring
- Run history table
- Artifact viewing

### **Phase 3: Integrity Clarity**
- Integrity gates page
- Gate explanations
- Technical details

### **Phase 4: Contract & Cache Clarity**
- Dedicated contract/cache pages
- File viewing
- Drift detection UI

### **Phase 5: System Operational Summary**
- System status dashboard
- Component health monitoring
- Status-aware messaging

### **Phase 6: Empty State & Failure Pass**
- Polished empty states (1-2 sentence limit)
- Error recovery patterns
- Visual consistency
- Final UX polish

---

## ✅ Quality Standards

### **Accessibility**
- Semantic HTML
- ARIA labels on interactive elements
- Keyboard navigation support
- Color contrast compliance

### **Responsiveness**
- Mobile-first approach
- Breakpoints: `sm:` (640px), `md:` (768px), `lg:` (1024px)
- Flexible layouts with Flexbox/Grid

### **Performance**
- Code splitting (React Router lazy loading)
- Optimized bundle size
- Efficient re-renders (React Query caching)

### **TypeScript**
- Strict mode enabled
- Shared types from `ui-types` package
- Discriminated unions for state modeling

---

## 📚 Further Reading

- [React Query Documentation](https://tanstack.com/query/latest)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)
- [Lucide React Icons](https://lucide.dev/guide/packages/lucide-react)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

**Built with care during Stage 5 (Operational Clarity)**
**Production-ready**: March 2026
