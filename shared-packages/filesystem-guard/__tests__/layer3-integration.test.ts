import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WriteAuthorityRegistry } from '../src/write-authority-registry';
import { FileSystemGuard } from '../src/filesystem-guard';
import { ViolationLogger } from '../src/violation-logger';
import { existsSync, rmSync, mkdirSync, readFileSync } from 'fs';

describe('Layer 3 Integration: Filesystem Guards', () => {
  const testDir = 'test-layer3-integration';

  beforeEach(() => {
    mkdirSync(`${testDir}/artifacts/runtime`, { recursive: true });
    mkdirSync(`${testDir}/artifacts/advisory`, { recursive: true });
    mkdirSync(`${testDir}/logs`, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should enforce complete 3-layer protection stack', () => {
    // Layer 1: Schema validation (handled by artifact-writer)
    // Layer 2: Audit trail enforcement (directory separation)
    // Layer 3: Filesystem guards

    const registry = new WriteAuthorityRegistry();
    const guard = new FileSystemGuard(registry);
    const logger = new ViolationLogger(`${testDir}/logs/violations.jsonl`);

    // Register authorized writers
    registry.registerWriter('runtime-writer', {
      allowedPaths: [`${testDir}/artifacts/runtime`],
      capability: 'write-authoritative'
    });

    registry.registerWriter('advisory-writer', {
      allowedPaths: [`${testDir}/artifacts/advisory`],
      capability: 'write-advisory'
    });

    // ✅ Allowed: Runtime writer → runtime directory
    guard.guardedWriteFile(
      'runtime-writer',
      `${testDir}/artifacts/runtime/policy.json`,
      JSON.stringify({ decision: 'pass' })
    );

    expect(existsSync(`${testDir}/artifacts/runtime/policy.json`)).toBe(true);

    // ✅ Allowed: Advisory writer → advisory directory
    guard.guardedWriteFile(
      'advisory-writer',
      `${testDir}/artifacts/advisory/rca.json`,
      JSON.stringify({ summary: 'RCA summary' })
    );

    expect(existsSync(`${testDir}/artifacts/advisory/rca.json`)).toBe(true);

    // ❌ Blocked: Runtime writer → advisory directory
    try {
      guard.guardedWriteFile(
        'runtime-writer',
        `${testDir}/artifacts/advisory/evil.json`,
        'data'
      );
      throw new Error('Should have thrown FILESYSTEM_GUARD_VIOLATION');
    } catch (error: any) {
      expect(error.message).toContain('FILESYSTEM_GUARD_VIOLATION');
      expect(error.exitCode).toBe(3);
    }

    // ❌ Blocked: Advisory writer → runtime directory
    try {
      guard.guardedWriteFile(
        'advisory-writer',
        `${testDir}/artifacts/runtime/evil.json`,
        'data'
      );
      throw new Error('Should have thrown FILESYSTEM_GUARD_VIOLATION');
    } catch (error: any) {
      expect(error.message).toContain('FILESYSTEM_GUARD_VIOLATION');
      expect(error.exitCode).toBe(3);
    }

    // Verify violations were tracked
    const violations = guard.getViolations();
    expect(violations.length).toBe(2);

    // Log violations
    violations.forEach(v => logger.logViolation(v));

    const loggedViolations = logger.readViolations();
    expect(loggedViolations.length).toBe(2);
  });

  it('should prevent path traversal attacks', () => {
    const registry = new WriteAuthorityRegistry();
    const guard = new FileSystemGuard(registry);

    registry.registerWriter('runtime-writer', {
      allowedPaths: [`${testDir}/artifacts/runtime`],
      capability: 'write-authoritative'
    });

    // Try path traversal attack
    const maliciousPath = `${testDir}/artifacts/runtime/../advisory/evil.json`;

    expect(() => {
      guard.guardedWriteFile('runtime-writer', maliciousPath, 'data');
    }).toThrow('FILESYSTEM_GUARD_VIOLATION');
  });

  it('should support multiple writers with different capabilities', () => {
    const registry = new WriteAuthorityRegistry();
    const guard = new FileSystemGuard(registry);

    // Register multiple writers with different scopes
    registry.registerWriter('contract-writer', {
      allowedPaths: [`${testDir}/.mcp-contract`],
      capability: 'write-contract'
    });

    registry.registerWriter('cache-writer', {
      allowedPaths: [`${testDir}/.mcp-cache`],
      capability: 'write-cache'
    });

    registry.registerWriter('runtime-writer', {
      allowedPaths: [`${testDir}/artifacts/runtime`],
      capability: 'write-authoritative'
    });

    mkdirSync(`${testDir}/.mcp-contract`, { recursive: true });
    mkdirSync(`${testDir}/.mcp-cache`, { recursive: true });

    // Each writer can only write to its designated area
    guard.guardedWriteFile('contract-writer', `${testDir}/.mcp-contract/contract.json`, '{}');
    guard.guardedWriteFile('cache-writer', `${testDir}/.mcp-cache/cache.json`, '{}');
    guard.guardedWriteFile('runtime-writer', `${testDir}/artifacts/runtime/runtime.json`, '{}');

    expect(existsSync(`${testDir}/.mcp-contract/contract.json`)).toBe(true);
    expect(existsSync(`${testDir}/.mcp-cache/cache.json`)).toBe(true);
    expect(existsSync(`${testDir}/artifacts/runtime/runtime.json`)).toBe(true);

    // Cross-scope writes are blocked
    expect(() => {
      guard.guardedWriteFile('contract-writer', `${testDir}/.mcp-cache/evil.json`, '{}');
    }).toThrow('FILESYSTEM_GUARD_VIOLATION');

    expect(() => {
      guard.guardedWriteFile('cache-writer', `${testDir}/artifacts/runtime/evil.json`, '{}');
    }).toThrow('FILESYSTEM_GUARD_VIOLATION');
  });

  it('should generate comprehensive violation summary', () => {
    const registry = new WriteAuthorityRegistry();
    const guard = new FileSystemGuard(registry);
    const logger = new ViolationLogger(`${testDir}/logs/violations.jsonl`);

    registry.registerWriter('writer-1', {
      allowedPaths: [`${testDir}/dir1`],
      capability: 'write-authoritative'
    });

    registry.registerWriter('writer-2', {
      allowedPaths: [`${testDir}/dir2`],
      capability: 'write-advisory'
    });

    // Generate multiple violations
    const attempts = [
      { writer: 'writer-1', path: `${testDir}/dir2/file1.json` },
      { writer: 'writer-1', path: `${testDir}/dir2/file2.json` },
      { writer: 'writer-2', path: `${testDir}/dir1/file3.json` },
      { writer: 'unknown', path: `${testDir}/dir1/file4.json` }
    ];

    attempts.forEach(({ writer, path }) => {
      try {
        guard.guardedWriteFile(writer, path, 'data');
      } catch (error) {
        // Expected
      }
    });

    // Log all violations
    guard.getViolations().forEach(v => logger.logViolation(v));

    const summary = logger.getSummary();

    expect(summary.totalViolations).toBe(4);
    expect(summary.violationsByWriter['writer-1']).toBe(2);
    expect(summary.violationsByWriter['writer-2']).toBe(1);
    expect(summary.violationsByWriter['unknown']).toBe(1);
  });

  it('should handle nested directory structures', () => {
    const registry = new WriteAuthorityRegistry();
    const guard = new FileSystemGuard(registry);

    registry.registerWriter('runtime-writer', {
      allowedPaths: [`${testDir}/artifacts/runtime`],
      capability: 'write-authoritative'
    });

    // Allow nested paths within allowed directory
    guard.guardedWriteFile(
      'runtime-writer',
      `${testDir}/artifacts/runtime/phase1/cache.json`,
      '{}'
    );

    guard.guardedWriteFile(
      'runtime-writer',
      `${testDir}/artifacts/runtime/phase2/deep/nested/file.json`,
      '{}'
    );

    expect(existsSync(`${testDir}/artifacts/runtime/phase1/cache.json`)).toBe(true);
    expect(existsSync(`${testDir}/artifacts/runtime/phase2/deep/nested/file.json`)).toBe(true);
  });

  it('should support JSONL append operations', () => {
    const registry = new WriteAuthorityRegistry();
    const guard = new FileSystemGuard(registry);

    registry.registerWriter('stream-writer', {
      allowedPaths: [`${testDir}/streams`],
      capability: 'write-authoritative'
    });

    mkdirSync(`${testDir}/streams`, { recursive: true });

    const streamPath = `${testDir}/streams/events.jsonl`;

    // Append multiple entries
    guard.guardedAppendFile('stream-writer', streamPath, '{"event":"start"}\n');
    guard.guardedAppendFile('stream-writer', streamPath, '{"event":"middle"}\n');
    guard.guardedAppendFile('stream-writer', streamPath, '{"event":"end"}\n');

    const content = readFileSync(streamPath, 'utf-8');
    const lines = content.trim().split('\n');

    expect(lines.length).toBe(3);
    expect(JSON.parse(lines[0]).event).toBe('start');
    expect(JSON.parse(lines[1]).event).toBe('middle');
    expect(JSON.parse(lines[2]).event).toBe('end');
  });
});
