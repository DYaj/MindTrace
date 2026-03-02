/**
 * Detect primary style from detected styles using semantic priority.
 * Deterministic: stable priority + alphabetical tiebreak.
 */
export function detectPrimaryStyle(stylesDetected: string[]): string {
  if (stylesDetected.length === 0) return "unknown";

  // Stable priority rule (highest architectural complexity wins)
  const STYLE_PRIORITY: Record<string, number> = {
    "style3-pom-bdd": 3,
    "style2-bdd": 2,
    "style1-native": 1,
    unknown: 0
  };

  // Sort by priority (descending), then alphabetically for ties
  const sorted = stylesDetected.slice().sort((a, b) => {
    const priorityA = STYLE_PRIORITY[a] ?? 0;
    const priorityB = STYLE_PRIORITY[b] ?? 0;

    if (priorityA !== priorityB) {
      return priorityB - priorityA; // Higher priority first
    }

    return a.localeCompare(b); // Alphabetical for ties
  });

  return sorted[0];
}
