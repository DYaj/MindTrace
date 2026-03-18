import { readFileSync, statSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import type { RunListItem, AuditEvent, RunDetail, ArtifactListItem } from '@breakline/ui-types';
import { PathValidator } from '../utils/paths.js';

/**
 * Runs data service
 *
 * Aggregates run data from multiple sources:
 * - history/run-index.jsonl (runId, timestamp)
 * - audit/final.json (exitCode)
 * - normalized-results.json (test counts)
 */
export class RunsService {
  private static readonly HISTORY_PATH = 'history/run-index.jsonl';

  /**
   * Get all runs from history index
   * Augments with data from run artifacts
   */
  static getRunList(): RunListItem[] {
    const historyPath = PathValidator.validateRepoPath(this.HISTORY_PATH);

    if (!existsSync(historyPath)) {
      return [];
    }

    const content = readFileSync(historyPath, 'utf-8');
    const lines = content.trim().split('\n').filter(line => line.length > 0);

    const runs: RunListItem[] = [];

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);

        // Handle both old and new format
        const runId = entry.runId || entry.runName;
        const timestamp = entry.timestamp || entry.ts || entry.indexed_at;

        if (!runId || !timestamp) continue;

        // Try to augment with artifact data
        const augmented = this.augmentRunData(runId, timestamp);
        if (augmented) {
          runs.push(augmented);
        }
      } catch (error) {
        // Skip invalid lines
        continue;
      }
    }

    // Most recent first
    return runs.reverse();
  }

  /**
   * Augment basic run data with info from artifacts
   *
   * IMPORTANT: NEVER assume artifact presence.
   * All artifact reads are defensive with safe fallbacks.
   * Missing or malformed artifacts must not break UI.
   */
  private static augmentRunData(runId: string, timestamp: string): RunListItem | null {
    try {
      const runPath = PathValidator.getRunPath(runId);

      // DEFENSIVE: Run path must exist
      if (!existsSync(runPath)) {
        return null;
      }

      // DEFENSIVE: audit/final.json is optional
      // Fallback: exitCode = 0 (success)
      let exitCode: 0 | 1 | 2 | 3 = 0;
      const auditFinalPath = join(runPath, 'audit/final.json');
      if (existsSync(auditFinalPath)) {
        const auditFinal = JSON.parse(readFileSync(auditFinalPath, 'utf-8'));
        exitCode = auditFinal.exitCode ?? 0;
      }

      // DEFENSIVE: normalized-results.json is optional
      // Fallback: testsPassed = 0, testsFailed = 0
      let testsPassed = 0;
      let testsFailed = 0;
      let duration = 0;

      const normalizedPath = join(runPath, 'artifacts/normalized-results.json');
      if (existsSync(normalizedPath)) {
        const normalized = JSON.parse(readFileSync(normalizedPath, 'utf-8'));
        testsPassed = normalized.summary?.passed ?? 0;
        testsFailed = normalized.summary?.failed ?? 0;
      }

      // DEFENSIVE: audit/events.ndjson is optional
      // Fallback: duration = 0
      const eventsPath = join(runPath, 'audit/events.ndjson');
      if (existsSync(eventsPath)) {
        const events = this.readAuditEvents(eventsPath);
        if (events.length >= 2) {
          const startTime = new Date(events[0].timestamp).getTime();
          const endTime = new Date(events[events.length - 1].timestamp).getTime();
          duration = endTime - startTime;
        }
      }

      return {
        runId,
        runName: runId,
        timestamp,
        exitCode,
        testsPassed,
        testsFailed,
        duration
      };
    } catch (error) {
      // If augmentation fails, skip this run
      return null;
    }
  }

  /**
   * Read audit events from NDJSON file
   * Transforms raw events to match AuditEvent interface
   */
  private static readAuditEvents(path: string): AuditEvent[] {
    const content = readFileSync(path, 'utf-8');
    const lines = content.trim().split('\n').filter(line => line.length > 0);
    const events: AuditEvent[] = [];

    for (const line of lines) {
      try {
        const raw = JSON.parse(line);
        // Transform to match AuditEvent interface
        events.push({
          timestamp: raw.at || raw.timestamp,
          type: raw.type,
          message: raw.message || this.generateMessageFromEvent(raw),
          details: raw
        });
      } catch {
        // Skip invalid lines
      }
    }

    return events;
  }

  /**
   * Generate human-readable message from raw event data
   */
  private static generateMessageFromEvent(event: any): string {
    switch (event.type) {
      case 'gate_start':
        return `Integrity gate started for run ${event.runName || 'unknown'}`;
      case 'gate_end':
        return `Integrity gate completed - Policy: ${event.policySaysFail ? 'FAIL' : 'PASS'}, Artifacts: ${event.artifactValidationFail ? 'INVALID' : 'VALID'}`;
      default:
        return JSON.stringify(event);
    }
  }

  /**
   * Get detailed run information including artifacts and audit events
   *
   * DEFENSIVE: All artifact reads are optional with safe fallbacks
   */
  static getRunDetail(runId: string): RunDetail | null {
    try {
      const runPath = PathValidator.getRunPath(runId);

      // DEFENSIVE: Run path must exist
      if (!existsSync(runPath)) {
        return null;
      }

      // Get basic run data first (reuses augmentRunData logic)
      const historyPath = PathValidator.validateRepoPath(this.HISTORY_PATH);
      if (!existsSync(historyPath)) {
        return null;
      }

      // Find the run entry in history
      const content = readFileSync(historyPath, 'utf-8');
      const lines = content.trim().split('\n').filter(line => line.length > 0);
      let timestamp = '';

      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          const entryRunId = entry.runId || entry.runName;
          if (entryRunId === runId) {
            timestamp = entry.timestamp || entry.ts || entry.indexed_at;
            break;
          }
        } catch {
          continue;
        }
      }

      if (!timestamp) {
        return null;
      }

      // Get augmented data (exitCode, testCounts, duration)
      const baseData = this.augmentRunData(runId, timestamp);
      if (!baseData) {
        return null;
      }

      // DEFENSIVE: Read artifacts list
      const artifacts = this.listArtifacts(runPath);

      // DEFENSIVE: Read audit events
      const eventsPath = join(runPath, 'audit/events.ndjson');
      const auditEvents = existsSync(eventsPath)
        ? this.readAuditEvents(eventsPath)
        : [];

      return {
        ...baseData,
        artifacts,
        auditEvents
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * List all artifact files in a run's artifacts directory
   *
   * DEFENSIVE: Returns empty array if directory missing
   */
  private static listArtifacts(runPath: string): ArtifactListItem[] {
    const artifacts: ArtifactListItem[] = [];
    const artifactsPath = join(runPath, 'artifacts');

    if (!existsSync(artifactsPath)) {
      return artifacts;
    }

    try {
      const files = readdirSync(artifactsPath, { withFileTypes: true, recursive: true });

      for (const file of files) {
        if (!file.isFile()) continue;

        const fullPath = join(file.path, file.name);
        const relativePath = fullPath.substring(artifactsPath.length + 1);
        const stats = statSync(fullPath);

        let type: 'json' | 'txt' | 'other' = 'other';
        if (file.name.endsWith('.json') || file.name.endsWith('.jsonl') || file.name.endsWith('.ndjson')) {
          type = 'json';
        } else if (file.name.endsWith('.txt') || file.name.endsWith('.log') || file.name.endsWith('.md')) {
          type = 'txt';
        }

        artifacts.push({
          name: file.name,
          path: relativePath,
          size: stats.size,
          type
        });
      }
    } catch (error) {
      // If directory read fails, return empty array
      return [];
    }

    return artifacts;
  }

  /**
   * Get artifact file content
   *
   * DEFENSIVE: Returns null if file not found or read fails
   */
  static getArtifactContent(runId: string, artifactPath: string): string | null {
    try {
      PathValidator.validateRunId(runId);
      const runPath = PathValidator.getRunPath(runId);

      if (!existsSync(runPath)) {
        return null;
      }

      const artifactFullPath = join(runPath, 'artifacts', artifactPath);

      if (!existsSync(artifactFullPath)) {
        return null;
      }

      return readFileSync(artifactFullPath, 'utf-8');
    } catch (error) {
      return null;
    }
  }
}
