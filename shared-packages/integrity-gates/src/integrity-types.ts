// src/integrity-types.ts

export type IntegrityMode = 'default' | 'strict';

export type VerifiedContractContext = {
  fingerprint: string;
  contractDir: string;
  files: string[];
  verificationSource: 'canonical' | 'legacy_fallback';
  version: string;
};

export type VerifiedCacheContext = {
  cacheDir: string;
  contractBinding: string;
  cacheVersion: string;
  pageCount: number;
  mode: IntegrityMode;
  cacheRequiredForPath: boolean;
};

export type ContractIntegrityResult =
  | { status: 'valid'; contract: VerifiedContractContext }
  | {
      status: 'invalid';
      error: unknown; // Will be properly typed when errors are implemented
      recommendedAction: 'fail_hard';
      failureExitCode: 3;
    };

export type CacheDriftReason = {
  type: 'drift';
  driftType: 'hash_mismatch' | 'binding_missing';
  expectedHash: string;
  actualHash: string | '<missing>';
  code: 'CACHE_HASH_MISMATCH' | 'CACHE_BINDING_MISSING';
};

export type CacheSchemaInvalid = {
  type: 'schema_invalid';
  schemaErrors: unknown[];
  code: 'CACHE_SCHEMA_INVALID';
};

export type CacheMissing = {
  type: 'missing';
  code: 'CACHE_DIR_NOT_FOUND' | 'CACHE_META_MISSING';
};

export type CacheVersionIncompatible = {
  type: 'version_incompatible';
  cacheVersion: string;
  supportedVersions: string[];
  code: 'CACHE_VERSION_INCOMPATIBLE';
};

export type CacheIntegrityResult =
  | { status: 'valid'; cache: VerifiedCacheContext }
  | {
      status: 'invalid';
      reason: CacheDriftReason | CacheSchemaInvalid | CacheMissing | CacheVersionIncompatible;
      required: boolean;
      recommendedAction: 'continue_without_cache' | 'fail_hard';
      failureExitCode?: 3;
    };

export type DriftDetectionResult =
  | {
      drift: false;
      currentFingerprint: string;
      cacheBinding: string;
    }
  | {
      drift: true;
      currentFingerprint: string;
      previousHash: string;
      currentHash: string;
      driftType: 'hash_mismatch' | 'binding_missing';
      code: 'CACHE_HASH_MISMATCH' | 'CACHE_BINDING_MISSING';
    };

export type DriftAuditEvent = {
  eventType: 'cache_contract_mismatch';
  previousHash: string;
  currentHash: string;
  driftType: 'hash_mismatch' | 'binding_missing';
  cacheInvalidated: boolean;
  executionMode: IntegrityMode;
  actionTaken: 'continue_without_cache' | 'fail_hard';
  timestamp: string;
  runId?: string;
};
