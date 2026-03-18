import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DriftAudit } from '../src/drift-audit';
import { existsSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

describe('Drift Audit (Append-Only I/O)', () => {
  const testDir = join(process.cwd(), '__tests__/fixtures/drift-audit-test');
  const auditFile = join(testDir, 'drift-events.jsonl');

  beforeEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should append drift event to new JSONL file', () => {
    const audit = new DriftAudit(testDir);

    audit.appendDriftEvent({
      eventType: 'cache_contract_mismatch',
      previousHash: 'abc123',
      currentHash: 'def456',
      driftType: 'hash_mismatch',
      cacheInvalidated: true,
      executionMode: 'default',
      actionTaken: 'continue_without_cache',
      timestamp: '2026-03-11T10:00:00.000Z',
      runId: 'test-run'
    });

    expect(existsSync(auditFile)).toBe(true);

    const content = readFileSync(auditFile, 'utf-8');
    const lines = content.trim().split('\n');
    expect(lines).toHaveLength(1);

    const event = JSON.parse(lines[0]);
    expect(event.previousHash).toBe('abc123');
    expect(event.currentHash).toBe('def456');
    expect(event.actionTaken).toBe('continue_without_cache');
  });

  it('should append to existing JSONL file', () => {
    const audit = new DriftAudit(testDir);

    // Append first event
    audit.appendDriftEvent({
      eventType: 'cache_contract_mismatch',
      previousHash: 'abc123',
      currentHash: 'def456',
      driftType: 'hash_mismatch',
      cacheInvalidated: true,
      executionMode: 'default',
      actionTaken: 'continue_without_cache',
      timestamp: '2026-03-11T10:00:00.000Z'
    });

    // Append second event
    audit.appendDriftEvent({
      eventType: 'cache_contract_mismatch',
      previousHash: 'def456',
      currentHash: 'ghi789',
      driftType: 'hash_mismatch',
      cacheInvalidated: true,
      executionMode: 'strict',
      actionTaken: 'fail_hard',
      timestamp: '2026-03-11T11:00:00.000Z'
    });

    const content = readFileSync(auditFile, 'utf-8');
    const lines = content.trim().split('\n');
    expect(lines).toHaveLength(2);

    const event1 = JSON.parse(lines[0]);
    const event2 = JSON.parse(lines[1]);

    expect(event1.currentHash).toBe('def456');
    expect(event2.currentHash).toBe('ghi789');
  });

  it('should read all drift events', () => {
    const audit = new DriftAudit(testDir);

    audit.appendDriftEvent({
      eventType: 'cache_contract_mismatch',
      previousHash: 'abc',
      currentHash: 'def',
      driftType: 'hash_mismatch',
      cacheInvalidated: true,
      executionMode: 'default',
      actionTaken: 'continue_without_cache',
      timestamp: '2026-03-11T10:00:00.000Z'
    });

    audit.appendDriftEvent({
      eventType: 'cache_contract_mismatch',
      previousHash: 'def',
      currentHash: 'ghi',
      driftType: 'hash_mismatch',
      cacheInvalidated: true,
      executionMode: 'strict',
      actionTaken: 'fail_hard',
      timestamp: '2026-03-11T11:00:00.000Z'
    });

    const events = audit.readDriftEvents();
    expect(events).toHaveLength(2);
    expect(events[0].previousHash).toBe('abc');
    expect(events[1].previousHash).toBe('def');
  });

  it('should get drift summary', () => {
    const audit = new DriftAudit(testDir);

    audit.appendDriftEvent({
      eventType: 'cache_contract_mismatch',
      previousHash: 'abc',
      currentHash: 'def',
      driftType: 'hash_mismatch',
      cacheInvalidated: true,
      executionMode: 'default',
      actionTaken: 'continue_without_cache',
      timestamp: '2026-03-11T10:00:00.000Z'
    });

    audit.appendDriftEvent({
      eventType: 'cache_contract_mismatch',
      previousHash: 'def',
      currentHash: 'ghi',
      driftType: 'hash_mismatch',
      cacheInvalidated: true,
      executionMode: 'strict',
      actionTaken: 'fail_hard',
      timestamp: '2026-03-11T11:00:00.000Z'
    });

    const summary = audit.getSummary();

    expect(summary.totalDriftEvents).toBe(2);
    expect(summary.firstDrift).toBe('2026-03-11T10:00:00.000Z');
    expect(summary.lastDrift).toBe('2026-03-11T11:00:00.000Z');
    expect(summary.actionsTaken.continue_without_cache).toBe(1);
    expect(summary.actionsTaken.fail_hard).toBe(1);
  });

  it('should handle corrupt JSONL gracefully', () => {
    // Manually write JSONL with one corrupt line
    writeFileSync(auditFile, '{"valid": true}\nCORRUPT LINE\n{"alsoValid": true}\n');

    const audit = new DriftAudit(testDir);
    const events = audit.readDriftEvents();

    // Should skip corrupt line, return 2 valid events
    expect(events).toHaveLength(2);
  });

  it('should create directory if missing', () => {
    rmSync(testDir, { recursive: true, force: true });
    expect(existsSync(testDir)).toBe(false);

    const audit = new DriftAudit(testDir);
    audit.appendDriftEvent({
      eventType: 'cache_contract_mismatch',
      previousHash: 'abc',
      currentHash: 'def',
      driftType: 'hash_mismatch',
      cacheInvalidated: true,
      executionMode: 'default',
      actionTaken: 'continue_without_cache',
      timestamp: '2026-03-11T10:00:00.000Z'
    });

    expect(existsSync(testDir)).toBe(true);
    expect(existsSync(auditFile)).toBe(true);
  });
});
