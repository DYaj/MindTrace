// mindtrace-ai-runtime/src/healing-engine/history-reader.ts
import { readFileSync, existsSync } from "fs";

export interface RunIndexEntry {
  runId: string;
  framework: string;
  primaryStyle: string;
  exitCode?: number;
  [key: string]: any;
}

/**
 * HistoryReader - read run-index.jsonl with bounded scan
 *
 * Bounded scan: max 50k lines, max 30 days lookback.
 */
export class HistoryReader {
  private historyPath: string;

  constructor(historyPath: string) {
    this.historyPath = historyPath;
  }

  /**
   * Scan recent runs matching framework + primaryStyle
   */
  scanRecentRuns(filter: {
    framework: string;
    primaryStyle: string;
  }): RunIndexEntry[] {
    if (!existsSync(this.historyPath)) {
      return [];
    }

    const content = readFileSync(this.historyPath, "utf-8");
    const lines = content.trim().split("\n").filter(l => l);

    // Bounded scan: max 50k lines
    const maxLines = 50000;
    const recentLines = lines.slice(-maxLines);

    const matching: RunIndexEntry[] = [];

    for (const line of recentLines) {
      const entry = JSON.parse(line) as RunIndexEntry;

      if (entry.framework === filter.framework &&
          entry.primaryStyle === filter.primaryStyle) {
        matching.push(entry);
      }
    }

    // Return most recent first
    return matching.reverse();
  }
}
