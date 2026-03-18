export const INTEGRITY_GATES_VERSION = '0.1.0';

// Contract integrity
export { verifyContractIntegrity } from './contract-integrity.js';

// Cache integrity
export { verifyCacheIntegrity } from './cache-integrity.js';

// Drift detection
export { detectDrift } from './drift-detector.js';

// Drift audit
export { DriftAudit } from './drift-audit.js';

// Types
export type {
  IntegrityMode,
  VerifiedContractContext,
  VerifiedCacheContext,
  ContractIntegrityResult,
  CacheIntegrityResult,
  DriftDetectionResult,
  DriftAuditEvent,
  CacheDriftReason,
  CacheSchemaInvalid,
  CacheMissing,
  CacheVersionIncompatible
} from './integrity-types.js';

// Errors
export {
  IntegrityGateError,
  ContractIntegrityError,
  CacheIntegrityError
} from './integrity-errors.js';
export type {
  ContractErrorCode,
  CacheErrorCode
} from './integrity-errors.js';

// DO NOT EXPORT: deterministic helpers (temporary, internal only)
// These will be extracted to @mindtrace/deterministic-core in Phase B
