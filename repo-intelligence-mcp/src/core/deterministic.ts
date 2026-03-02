/**
 * Canonical JSON stringify with deep recursive key sorting.
 * Ensures byte-identical output for same input (deterministic).
 *
 * @param obj - Any JSON-serializable object
 * @returns Canonical JSON string (2-space indent, sorted keys at all depths)
 */
export function canonicalStringify(obj: any): string {
  return JSON.stringify(canonicalize(obj), null, 2);
}

function canonicalize(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(canonicalize);
  }

  // Recursively sort keys at ALL depths
  const sorted: any = {};
  Object.keys(obj)
    .sort((a, b) => a.localeCompare(b))
    .forEach(key => {
      sorted[key] = canonicalize(obj[key]);
    });

  return sorted;
}
