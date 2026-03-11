import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ViolationLogger } from '../src/violation-logger';
import { existsSync, rmSync, mkdirSync, readFileSync } from 'fs';

describe('ViolationLogger', () => {
  const logDir = 'test-violations';
  const logFile = `${logDir}/violations.jsonl`;
  let logger: ViolationLogger;

  beforeEach(() => {
    mkdirSync(logDir, { recursive: true });
    logger = new ViolationLogger(logFile);
  });

  afterEach(() => {
    if (existsSync(logDir)) {
      rmSync(logDir, { recursive: true, force: true });
    }
  });

  it('should log violations to JSONL file', () => {
    logger.logViolation({
      writerId: 'test-writer',
      attemptedPath: 'forbidden/path.json',
      reason: 'Unauthorized access',
      timestamp: '2026-03-10T10:00:00Z'
    });

    expect(existsSync(logFile)).toBe(true);

    const content = readFileSync(logFile, 'utf-8');
    const lines = content.trim().split('\n');

    expect(lines.length).toBe(1);

    const logged = JSON.parse(lines[0]);
    expect(logged.writerId).toBe('test-writer');
    expect(logged.attemptedPath).toBe('forbidden/path.json');
    expect(logged.reason).toBe('Unauthorized access');
  });

  it('should append multiple violations', () => {
    logger.logViolation({
      writerId: 'writer-1',
      attemptedPath: 'path1.json',
      reason: 'Reason 1',
      timestamp: '2026-03-10T10:00:00Z'
    });

    logger.logViolation({
      writerId: 'writer-2',
      attemptedPath: 'path2.json',
      reason: 'Reason 2',
      timestamp: '2026-03-10T10:01:00Z'
    });

    const content = readFileSync(logFile, 'utf-8');
    const lines = content.trim().split('\n');

    expect(lines.length).toBe(2);

    const v1 = JSON.parse(lines[0]);
    const v2 = JSON.parse(lines[1]);

    expect(v1.writerId).toBe('writer-1');
    expect(v2.writerId).toBe('writer-2');
  });

  it('should read violations from log file', () => {
    logger.logViolation({
      writerId: 'writer-1',
      attemptedPath: 'path1.json',
      reason: 'Reason 1',
      timestamp: '2026-03-10T10:00:00Z'
    });

    logger.logViolation({
      writerId: 'writer-2',
      attemptedPath: 'path2.json',
      reason: 'Reason 2',
      timestamp: '2026-03-10T10:01:00Z'
    });

    const violations = logger.readViolations();

    expect(violations.length).toBe(2);
    expect(violations[0].writerId).toBe('writer-1');
    expect(violations[1].writerId).toBe('writer-2');
  });

  it('should filter violations by writer ID', () => {
    logger.logViolation({
      writerId: 'writer-1',
      attemptedPath: 'path1.json',
      reason: 'Reason 1',
      timestamp: '2026-03-10T10:00:00Z'
    });

    logger.logViolation({
      writerId: 'writer-2',
      attemptedPath: 'path2.json',
      reason: 'Reason 2',
      timestamp: '2026-03-10T10:01:00Z'
    });

    logger.logViolation({
      writerId: 'writer-1',
      attemptedPath: 'path3.json',
      reason: 'Reason 3',
      timestamp: '2026-03-10T10:02:00Z'
    });

    const filtered = logger.readViolations('writer-1');

    expect(filtered.length).toBe(2);
    expect(filtered.every(v => v.writerId === 'writer-1')).toBe(true);
  });

  it('should generate summary report', () => {
    logger.logViolation({
      writerId: 'writer-1',
      attemptedPath: 'path1.json',
      reason: 'Unauthorized access',
      timestamp: '2026-03-10T10:00:00Z'
    });

    logger.logViolation({
      writerId: 'writer-1',
      attemptedPath: 'path2.json',
      reason: 'Unauthorized access',
      timestamp: '2026-03-10T10:01:00Z'
    });

    logger.logViolation({
      writerId: 'writer-2',
      attemptedPath: 'path3.json',
      reason: 'Path traversal attempt',
      timestamp: '2026-03-10T10:02:00Z'
    });

    const summary = logger.getSummary();

    expect(summary.totalViolations).toBe(3);
    expect(summary.violationsByWriter['writer-1']).toBe(2);
    expect(summary.violationsByWriter['writer-2']).toBe(1);
  });
});
