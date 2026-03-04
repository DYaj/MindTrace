// mindtrace-ai-runtime/src/contract-awareness/types.ts
//
// Phase 2.0: Contract-Awareness Module — Type Definitions
// Non-goals: No behavior, only types

export type ContractAwarenessErrorCode =
  | "CA_CONTRACT_DIR_MISSING"
  | "CA_MISSING_FILE"
  | "CA_JSON_PARSE_ERROR"
  | "CA_SCHEMA_INVALID"
  | "CA_HASH_MISMATCH"
  | "CA_LEGACY_PATH"
  | "CA_CACHE_DIR_MISSING"
  | "CA_CACHE_HASH_MISMATCH";

export type IssueCategory = "contract" | "cache" | "system";
export type IssueSeverity = "ERROR" | "WARN";

export type ContractAwarenessIssue = {
  code: ContractAwarenessErrorCode;
  category: IssueCategory;
  severity: IssueSeverity;
  message: string;
  context?: Record<string, unknown>;
};

export type LoadContractBundleResult =
  | {
      ok: true;
      contractDir: string;
      isLegacy: boolean;
      contractHash: string;
      files: Record<string, unknown>;
      issues: ContractAwarenessIssue[];
    }
  | {
      ok: false;
      contractDir: null;
      isLegacy: boolean;
      contractHash: null;
      files: Record<string, unknown>;
      issues: ContractAwarenessIssue[];
    };

export type ContractValidationResult = {
  ok: boolean;
  issues: ContractAwarenessIssue[];
};

export type PageCacheBindResult = {
  ok: boolean;
  cacheDir: string | null;
  cacheHash: string | null;
  issues: ContractAwarenessIssue[];
};

export type RuntimeStrategyContext = {
  ok: boolean;
  contractHash: string | null;
  cacheHash: string | null;
  selectorPolicy: Record<string, unknown>;
  healingPolicy: Record<string, unknown>;
  pageCacheBySite: Record<string, unknown>;
  issues: ContractAwarenessIssue[];
};

export type ComplianceMode = "COMPLIANCE" | "BEST_EFFORT";
