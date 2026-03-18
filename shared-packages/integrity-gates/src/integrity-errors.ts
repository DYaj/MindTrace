// src/integrity-errors.ts

export type ContractErrorCode =
  | 'CONTRACT_DIR_NOT_FOUND'
  | 'CONTRACT_FILE_MISSING'
  | 'CONTRACT_SCHEMA_INVALID'
  | 'CONTRACT_FINGERPRINT_MISMATCH'
  | 'CONTRACT_FINGERPRINT_FILE_MISSING'
  | 'CONTRACT_VERSION_INCOMPATIBLE';

export type CacheErrorCode =
  | 'CACHE_DIR_NOT_FOUND'
  | 'CACHE_META_MISSING'
  | 'CACHE_SCHEMA_INVALID'
  | 'CACHE_VERSION_INCOMPATIBLE'
  | 'CACHE_HASH_MISMATCH'
  | 'CACHE_BINDING_MISSING'
  | 'CACHE_REQUIRED_BUT_INVALID';

export abstract class IntegrityGateError extends Error {
  constructor(
    public code: string,
    message: string,
    public context: Record<string, unknown>,
    public severity: 'fatal' | 'recoverable' | 'warning',
    public classification: 'contract' | 'cache' | 'drift' | 'audit'
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ContractIntegrityError extends IntegrityGateError {
  public readonly recommendedAction = 'fail_hard';
  public readonly failureExitCode = 3;

  constructor(
    code: ContractErrorCode,
    message: string,
    context: Record<string, unknown>
  ) {
    super(code, message, context, 'fatal', 'contract');
  }
}

export class CacheIntegrityError extends IntegrityGateError {
  public readonly recommendedAction: 'continue_without_cache' | 'fail_hard';
  public readonly failureExitCode?: 3;

  constructor(
    code: CacheErrorCode,
    message: string,
    context: Record<string, unknown>,
    mode: 'default' | 'strict',
    cacheRequired: boolean
  ) {
    const severity = (mode === 'strict' && cacheRequired) ? 'fatal' : 'recoverable';
    super(code, message, context, severity, 'cache');

    this.recommendedAction = (mode === 'strict' && cacheRequired)
      ? 'fail_hard'
      : 'continue_without_cache';
    this.failureExitCode = (this.recommendedAction === 'fail_hard') ? 3 : undefined;
  }
}
