// mindtrace-ai-runtime/src/healing-engine/failure-classifier.ts

import { createHash } from "crypto";
import { FailureClass, FailureCategory } from "./types";

const CLASSIFIER_VERSION = "1.0.0";

/**
 * Classifies a Playwright error into a failure category using deterministic rules.
 * NO network, NO AI, NO randomness - same error always produces same classification.
 */
export function classifyFailure(error: Error): FailureClass {
  // Validate input
  const errMessage = error?.message ? normalizeMessage(error.message) : "";

  // Empty message defaults to unknown
  if (!errMessage) {
    return {
      category: "unknown",
      healable: false,
      confidence: 0.0,
      source: "playwright_error",
      reasonCode: "UNKNOWN_ERROR",
      errorFingerprint: "0000000000000000",
      classifierVersion: CLASSIFIER_VERSION
    };
  }

  const category = classifyCategory(errMessage);
  const healable = isHealable(category, errMessage);
  const confidence = deriveConfidence(category);
  const reasonCode = deriveReasonCode(category);
  const errorFingerprint = computeErrorFingerprint(errMessage);

  // Extract matched patterns for debugging
  const matchedPatterns: string[] = [];
  for (const pattern of getPatterns(category)) {
    if (errMessage.includes(pattern.toLowerCase())) {
      matchedPatterns.push(pattern);
    }
  }

  return {
    category,
    healable,
    confidence,
    source: "playwright_error",
    reasonCode,
    errorFingerprint,
    matchedPatterns: matchedPatterns.length > 0 ? matchedPatterns : undefined,
    classifierVersion: CLASSIFIER_VERSION,
  };
}

/**
 * Normalizes error message for deterministic matching:
 * - Trim whitespace
 * - Collapse multiple spaces
 * - Lowercase for case-insensitive matching
 */
function normalizeMessage(message: string): string {
  return message.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Classify error category using fixed pattern matching.
 *
 * PRECEDENCE ORDER (first match wins):
 * 1. Assertion - highest priority, never healable
 * 2. Network - client errors, never healable
 * 3. Environment - setup issues, never healable
 * 4. Test Code - JavaScript errors, never healable
 * 5. Timeout - conditionally healable (only if selector-related)
 * 6. Selector Missing - healable
 * 7. Element Detached - healable
 * 8. Unknown - default fallback, not healable
 *
 * @param normalized - Normalized (lowercase, trimmed) error message
 * @returns FailureCategory enum value
 */
function classifyCategory(normalized: string): FailureCategory {
  // Assertion errors (highest priority - never healable)
  if (
    normalized.includes("expect(") ||
    normalized.includes("assertion") ||
    normalized.includes("expected:") ||
    normalized.includes("received:")
  ) {
    return "assertion";
  }

  // Network errors (4xx client errors - never healable)
  if (
    normalized.includes("net::err_") ||
    normalized.includes("status code 4") ||
    normalized.includes("network error") ||
    normalized.includes("fetch failed")
  ) {
    return "network4xx";
  }

  // Environment errors (never healable)
  if (
    normalized.includes("econnrefused") ||
    normalized.includes("environment variable") ||
    normalized.includes("permission denied") ||
    normalized.includes("cannot connect to")
  ) {
    return "environment";
  }

  // Test code errors (never healable)
  if (
    normalized.includes("typeerror:") ||
    normalized.includes("referenceerror:") ||
    normalized.includes("is not a function") ||
    normalized.includes("is undefined")
  ) {
    return "testCodeError";
  }

  // Selector missing (healable)
  if (
    normalized.includes("resolved to 0 elements") ||
    normalized.includes("selector not found") ||
    normalized.includes("could not find element") ||
    normalized.includes("element not found")
  ) {
    return "selectorMissing";
  }

  // Element detached (healable)
  if (
    normalized.includes("element is not attached") ||
    normalized.includes("detached from the dom") ||
    normalized.includes("stale element")
  ) {
    return "elementDetached";
  }

  // Timeout (conditionally healable - only if selector-related)
  if (
    normalized.includes("timeout") &&
    (normalized.includes("waiting for selector") || normalized.includes("waiting for locator"))
  ) {
    return "timeout";
  }

  // Unknown (never healable by default)
  return "unknown";
}

/**
 * Determines if error is healable based on category and message content.
 * Hard-stop rules: assertion, network, environment, test code errors are NEVER healable.
 */
function isHealable(category: FailureCategory, normalized: string): boolean {
  // Never healable categories
  if (
    category === "assertion" ||
    category === "network4xx" ||
    category === "environment" ||
    category === "testCodeError" ||
    category === "unknown"
  ) {
    return false;
  }

  // Healable categories
  if (category === "selectorMissing" || category === "elementDetached") {
    return true;
  }

  // Timeout is only healable if selector-related
  if (category === "timeout") {
    return (
      normalized.includes("waiting for selector") || normalized.includes("waiting for locator")
    );
  }

  return false;
}

/**
 * Derives confidence score:
 * - 1.0 for known patterns (deterministic match)
 * - 0.0 for unknown errors
 */
function deriveConfidence(category: FailureCategory): number {
  return category === "unknown" ? 0.0 : 1.0;
}

/**
 * Derives machine-readable error code from category.
 */
function deriveReasonCode(category: FailureCategory): string {
  const codeMap: Record<FailureCategory, string> = {
    selectorMissing: "SELECTOR_MISSING",
    elementDetached: "ELEMENT_DETACHED",
    timeout: "TIMEOUT_SELECTOR",
    assertion: "ASSERTION_FAILED",
    network4xx: "NETWORK_4XX",
    environment: "ENVIRONMENT_ERROR",
    testCodeError: "TEST_CODE_ERROR",
    unknown: "UNKNOWN_ERROR",
  };
  return codeMap[category];
}

/**
 * Computes stable SHA-256 hash of normalized message for deduplication.
 * Same normalized message always produces same fingerprint.
 */
function computeErrorFingerprint(normalized: string): string {
  const hash = createHash("sha256").update(normalized).digest("hex");
  return hash.substring(0, 16); // First 16 chars for brevity
}

/**
 * Returns patterns used for matching a given category (for debugging).
 */
function getPatterns(category: FailureCategory): string[] {
  const patternMap: Record<FailureCategory, string[]> = {
    selectorMissing: [
      "resolved to 0 elements",
      "selector not found",
      "could not find element",
      "element not found",
    ],
    elementDetached: [
      "element is not attached",
      "detached from the dom",
      "stale element",
    ],
    timeout: ["waiting for selector", "waiting for locator"],
    assertion: ["expect(", "assertion", "expected:", "received:"],
    network4xx: ["net::err_", "status code 4", "network error", "fetch failed"],
    environment: [
      "econnrefused",
      "environment variable",
      "permission denied",
      "cannot connect to",
    ],
    testCodeError: [
      "typeerror:",
      "referenceerror:",
      "is not a function",
      "is undefined",
    ],
    unknown: [],
  };
  return patternMap[category] || [];
}
