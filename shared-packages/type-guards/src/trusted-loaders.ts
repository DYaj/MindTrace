/**
 * Layer 4: Trusted Loaders
 *
 * These functions are the ONLY way to create branded types.
 * They enforce validation before returning trusted types.
 */

import type {
  TrustedAuthoritative,
  UntrustedAdvisory,
  TrustedCache,
  TrustedContract
} from './branded-types.js';
import { unsafeCast } from './branded-types.js';

/**
 * Validation function type
 */
export type Validator<T = unknown> = (data: unknown) => data is T;

/**
 * Error thrown when trusted load fails
 */
export class TrustedLoadError extends Error {
  constructor(
    public brand: string,
    message: string,
    public data: unknown,
    public exitCode: number = 3
  ) {
    super(message);
    this.name = 'TrustedLoadError';
  }
}

/**
 * Load authoritative artifact with validation
 * This is the ONLY way to create TrustedAuthoritative types
 */
export function loadTrustedAuthoritative<T>(
  data: unknown,
  validator: Validator<T> | ((data: unknown) => boolean)
): TrustedAuthoritative<T> {
  if (!validator(data)) {
    throw new TrustedLoadError(
      'TrustedAuthoritative',
      'Failed to load TrustedAuthoritative: validation failed',
      data,
      3
    );
  }

  return unsafeCast<T, 'TrustedAuthoritative'>(data as T);
}

/**
 * Load advisory artifact with validation
 * This is the ONLY way to create UntrustedAdvisory types
 */
export function loadTrustedAdvisory<T>(
  data: unknown,
  validator: Validator<T> | ((data: unknown) => boolean)
): UntrustedAdvisory<T> {
  if (!validator(data)) {
    throw new TrustedLoadError(
      'UntrustedAdvisory',
      'Failed to load UntrustedAdvisory: validation failed',
      data,
      3
    );
  }

  return unsafeCast<T, 'UntrustedAdvisory'>(data as T);
}

/**
 * Load cached artifact with validation
 * This is the ONLY way to create TrustedCache types
 */
export function loadTrustedCache<T>(
  data: unknown,
  validator: Validator<T> | ((data: unknown) => boolean)
): TrustedCache<T> {
  if (!validator(data)) {
    throw new TrustedLoadError(
      'TrustedCache',
      'Failed to load TrustedCache: validation failed',
      data,
      3
    );
  }

  return unsafeCast<T, 'TrustedCache'>(data as T);
}

/**
 * Load contract artifact with validation
 * This is the ONLY way to create TrustedContract types
 */
export function loadTrustedContract<T>(
  data: unknown,
  validator: Validator<T> | ((data: unknown) => boolean)
): TrustedContract<T> {
  if (!validator(data)) {
    throw new TrustedLoadError(
      'TrustedContract',
      'Failed to load TrustedContract: validation failed',
      data,
      3
    );
  }

  return unsafeCast<T, 'TrustedContract'>(data as T);
}

/**
 * Type-safe validator factory for schema-based validation
 */
export function createSchemaValidator<T>(
  schemaValidator: (data: unknown) => { valid: boolean; errors?: unknown[] }
): Validator<T> {
  return (data: unknown): data is T => {
    const result = schemaValidator(data);
    return result.valid;
  };
}
