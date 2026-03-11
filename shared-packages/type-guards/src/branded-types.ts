/**
 * Layer 4: Runtime Type Guards
 *
 * Branded types ensure that AI-generated content cannot be used as
 * authoritative execution input at compile-time.
 */

// Brand symbol for nominal typing
declare const __brand: unique symbol;

/**
 * Brand a type to make it nominally distinct
 */
export type Brand<T, BrandName extends string> = T & {
  readonly [__brand]: BrandName;
};

/**
 * Authoritative artifact - validated and trusted for execution
 */
export type TrustedAuthoritative<T = unknown> = Brand<T, 'TrustedAuthoritative'>;

/**
 * Advisory artifact - AI-generated, never for execution
 */
export type UntrustedAdvisory<T = unknown> = Brand<T, 'UntrustedAdvisory'>;

/**
 * Cached artifact - validated against contract
 */
export type TrustedCache<T = unknown> = Brand<T, 'TrustedCache'>;

/**
 * Contract artifact - source of truth
 */
export type TrustedContract<T = unknown> = Brand<T, 'TrustedContract'>;

/**
 * Unvalidated data - must be validated before use
 */
export type Unvalidated<T = unknown> = Brand<T, 'Unvalidated'>;

/**
 * Type guard to check if value is branded with specific brand
 */
export function isBranded<T, B extends string>(
  value: unknown,
  expectedBrand: B
): value is Brand<T, B> {
  // At runtime, brands don't exist - this is a compile-time check only
  // For runtime validation, use the validation functions
  return true; // Type-level only
}

/**
 * Remove brand from a type (escape hatch - use sparingly)
 */
export type Unbrand<T> = T extends Brand<infer U, any> ? U : T;

/**
 * Assert that a value is branded (unsafe - use only when you're certain)
 */
export function unsafeCast<T, B extends string>(value: T): Brand<T, B> {
  return value as Brand<T, B>;
}
