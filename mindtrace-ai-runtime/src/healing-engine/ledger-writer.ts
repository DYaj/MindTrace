// mindtrace-ai-runtime/src/healing-engine/ledger-writer.ts
import { appendFileSync, mkdirSync, existsSync } from "fs";
import { dirname } from "path";
import type { AttemptRecord } from "./types.js";

/**
 * LedgerWriter - append-only writer for healing-attempts.jsonl
 *
 * Writes canonical JSON (sorted keys) to ensure deterministic output.
 */
export class LedgerWriter {
  private ledgerPath: string;
  private writerVersion: string;

  constructor(ledgerPath: string, writerVersion: string) {
    this.ledgerPath = ledgerPath;
    this.writerVersion = writerVersion;

    // Ensure parent directory exists
    const dir = dirname(ledgerPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Append attempt record (canonical JSON)
   */
  append(record: AttemptRecord): void {
    // Clone record and set writerVersion (avoid mutating input)
    const recordToWrite = { ...record, writerVersion: this.writerVersion };

    // Convert to canonical JSON (recursively sorted keys)
    const canonical = this.toCanonicalJSON(recordToWrite);

    // Append to ledger
    appendFileSync(this.ledgerPath, canonical + "\n", "utf-8");
  }

  /**
   * Convert object to canonical JSON (recursively sorted keys)
   *
   * - Object keys sorted alphabetically at all nesting levels
   * - Arrays and primitives preserved as-is
   */
  private toCanonicalJSON(obj: unknown): string {
    return JSON.stringify(this.canonicalSort(obj));
  }

  /**
   * Recursively sort object keys (deterministic output)
   */
  private canonicalSort(obj: unknown): unknown {
    if (obj === null || typeof obj !== "object") {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.canonicalSort(item));
    }

    const sorted: Record<string, unknown> = {};
    const keys = Object.keys(obj).sort();
    for (const key of keys) {
      sorted[key] = this.canonicalSort((obj as Record<string, unknown>)[key]);
    }
    return sorted;
  }
}
