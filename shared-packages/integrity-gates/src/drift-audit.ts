// src/drift-audit.ts
import { existsSync, readFileSync, appendFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { DriftAuditEvent } from './integrity-types.js';

/**
 * Drift audit - append-only JSONL event trail
 *
 * Critical Rules:
 * - Append-only - never modifies existing lines
 * - JSONL format - one event per line
 * - Side effect boundary - separated from pure drift detection logic
 * - Audit write failure does NOT restore cache usability
 */
export class DriftAudit {
  private auditFile: string;

  constructor(private auditDir: string) {
    this.auditFile = join(auditDir, 'drift-events.jsonl');
  }

  /**
   * Append drift event to JSONL audit trail
   * Creates directory if missing
   */
  appendDriftEvent(event: DriftAuditEvent): void {
    // Ensure directory exists
    if (!existsSync(this.auditDir)) {
      mkdirSync(this.auditDir, { recursive: true });
    }

    // Append event as JSONL (one line)
    const line = JSON.stringify(event) + '\n';
    appendFileSync(this.auditFile, line, 'utf-8');
  }

  /**
   * Read all drift events (non-authoritative reporting helper)
   * Skips malformed lines with warning
   */
  readDriftEvents(): DriftAuditEvent[] {
    if (!existsSync(this.auditFile)) {
      return [];
    }

    const content = readFileSync(this.auditFile, 'utf-8');
    const lines = content.trim().split('\n').filter(line => line.length > 0);

    const events: DriftAuditEvent[] = [];

    for (const line of lines) {
      try {
        const event = JSON.parse(line);
        events.push(event);
      } catch (error) {
        // Skip malformed line, log warning
        console.warn(`Skipping malformed drift event line: ${line.substring(0, 50)}...`);
      }
    }

    return events;
  }

  /**
   * Get drift summary (non-authoritative reporting helper)
   */
  getSummary(): {
    totalDriftEvents: number;
    firstDrift?: string;
    lastDrift?: string;
    actionsTaken: Record<'continue_without_cache' | 'fail_hard', number>;
  } {
    const events = this.readDriftEvents();

    const actionsTaken: Record<'continue_without_cache' | 'fail_hard', number> = {
      continue_without_cache: 0,
      fail_hard: 0
    };

    events.forEach(event => {
      actionsTaken[event.actionTaken] = (actionsTaken[event.actionTaken] || 0) + 1;
    });

    return {
      totalDriftEvents: events.length,
      firstDrift: events[0]?.timestamp,
      lastDrift: events[events.length - 1]?.timestamp,
      actionsTaken
    };
  }
}
