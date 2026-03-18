// ============================================================================
// API ENVELOPE
// ============================================================================
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================================================
// RUN TYPES (verified against real artifacts)
// ============================================================================

/**
 * Run list item for runs table
 *
 * Data sources:
 * - runId, timestamp: history/run-index.jsonl
 * - exitCode: audit/final.json
 * - testsPassed, testsFailed: normalized-results.json summary
 * - duration: calculated from timestamps in audit
 */
export interface RunListItem {
  runId: string;
  runName: string;
  timestamp: string;
  exitCode: 0 | 1 | 2 | 3;
  testsPassed: number;
  testsFailed: number;
  duration: number; // milliseconds
}

/**
 * Run detail (extends list item with artifacts + audit)
 */
export interface RunDetail extends RunListItem {
  artifacts: ArtifactListItem[];
  auditEvents: AuditEvent[];
}

/**
 * Artifact file entry
 */
export interface ArtifactListItem {
  name: string;
  path: string; // relative to artifacts dir (e.g. "playwright-report.json", "runtime/healing-attempts.jsonl")
  size: number;
  type: 'json' | 'txt' | 'other';
}

/**
 * Audit event from audit/events.ndjson
 */
export interface AuditEvent {
  timestamp: string;
  type: string;
  message: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// CONTRACT TYPES (to be verified against @mindtrace/contracts)
// ============================================================================

export interface ContractStatus {
  exists: boolean;
  fingerprint?: string;
  valid: boolean;
  errors?: string[];
  files: ContractFile[];
}

export interface ContractFile {
  name: string;
  content: unknown; // Use unknown - safer than any
}

// ============================================================================
// CACHE TYPES (verified against .mcp-cache/v1/meta.json shape)
// ============================================================================

export interface CacheStatus {
  exists: boolean;
  binding?: {
    contractSha256: string;
    match: boolean; // Does cache binding match current contract?
    currentContractHash?: string;
  };
  pageCount: number;
  pages: CachePage[];
}

export interface CachePage {
  key: string;
  path: string;
}

// ============================================================================
// INTEGRITY TYPES (must match @mindtrace/integrity-gates return shapes)
// ============================================================================

/**
 * Gate result - mapped from @mindtrace/integrity-gates
 * CORRECTED: Simple status field, no artificial codes
 */
export type GateResult =
  | {
      status: 'valid';
      details?: string;  // Human-readable supplementary info
    }
  | {
      status: 'invalid';
      reason: string;    // Human-readable error
      details?: string;  // Additional context
    };

/**
 * Drift detection result - mapped from @mindtrace/integrity-gates
 * CORRECTED: drift can be true, false, or null (not determinable)
 */
export type DriftResult =
  | {
      drift: true;
      expectedHash: string;
      actualHash: string;
      driftType: 'hash_mismatch' | 'binding_missing';
      details?: string;
    }
  | {
      drift: false;
      currentHash: string;
      details?: string;
    }
  | {
      drift: null;  // Cannot determine (contract invalid, cache missing, etc.)
      reason: string;
    };

/**
 * Complete integrity status from @mindtrace/integrity-gates
 */
export interface IntegrityStatus {
  contractGate: GateResult;
  cacheGate: GateResult;
  driftCheck: DriftResult;
}

// ============================================================================
// SYSTEM STATUS (aggregated health - derived from services)
// ============================================================================

/**
 * System status - aggregated view only
 * CORRECTED: drift field removed - use /api/integrity endpoint instead
 */
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

// ============================================================================
// ACTION / JOB TYPES
// ============================================================================

export interface RunTestsRequest {
  runName?: string;
  allowOverwrite?: boolean;
}

export interface JobResponse {
  jobId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

export interface JobStatus {
  jobId: string;
  type: 'run' | 'generate-contract' | 'build-cache';
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  duration?: number; // milliseconds - calculated from startedAt to completedAt (or now if running)
  result?: JobResult;
}

/**
 * Job result - exit code and runId are authoritative
 * stdout/stderr are supplemental diagnostics only
 */
export interface JobResult {
  exitCode?: number;
  runId?: string;
  error?: string;
  stdout?: string; // Supplemental only
  stderr?: string; // Supplemental only
}

// ============================================================================
// EXIT CODE HELPERS
// ============================================================================

export type ExitCode = 0 | 1 | 2 | 3;

export const EXIT_CODE_LABELS: Record<ExitCode, string> = {
  0: 'Success',
  1: 'Test Failure',
  2: 'Infrastructure Error',
  3: 'Policy Violation'
};

export const EXIT_CODE_COLORS: Record<ExitCode, 'green' | 'red' | 'orange'> = {
  0: 'green',
  1: 'red',
  2: 'orange',
  3: 'red'
};
