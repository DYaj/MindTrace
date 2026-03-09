// mindtrace-ai-runtime/src/healing-engine/key-derivation.ts

/**
 * Derive siteKey from sourcePath (deterministic)
 * Format: frameworks__style1-native
 */
export function deriveSiteKey(sourcePath: string): string {
  // Extract framework path (first 2 segments)
  const parts = sourcePath.split("/");
  if (parts.length < 2) {
    return "unknown";
  }

  return `${parts[0]}__${parts[1]}`;
}

/**
 * Derive pageKey from cache entry (deterministic)
 */
export function derivePageKey(cacheEntry: any): string {
  return cacheEntry.inferredName || cacheEntry.pageId || "unknown";
}
