import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FileSystemGuard } from '../src/filesystem-guard';
import { WriteAuthorityRegistry } from '../src/write-authority-registry';
import { existsSync, rmSync, mkdirSync, readFileSync } from 'fs';

describe('FileSystemGuard', () => {
  let registry: WriteAuthorityRegistry;
  let guard: FileSystemGuard;
  const testDir = 'test-guard-runs';

  beforeEach(() => {
    registry = new WriteAuthorityRegistry();
    guard = new FileSystemGuard(registry);

    // Register test writers
    registry.registerWriter('runtime-writer', {
      allowedPaths: ['test-guard-runs/artifacts/runtime'],
      capability: 'write-authoritative'
    });

    registry.registerWriter('advisory-writer', {
      allowedPaths: ['test-guard-runs/artifacts/advisory'],
      capability: 'write-advisory'
    });

    mkdirSync(`${testDir}/artifacts/runtime`, { recursive: true });
    mkdirSync(`${testDir}/artifacts/advisory`, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Guarded Writes', () => {
    it('should allow write to authorized path', () => {
      const content = JSON.stringify({ test: 'data' });
      const targetPath = `${testDir}/artifacts/runtime/test.json`;

      guard.guardedWriteFile('runtime-writer', targetPath, content);

      expect(existsSync(targetPath)).toBe(true);
      const written = readFileSync(targetPath, 'utf-8');
      expect(JSON.parse(written)).toEqual({ test: 'data' });
    });

    it('should deny write to unauthorized path', () => {
      const content = JSON.stringify({ test: 'data' });
      const targetPath = `${testDir}/artifacts/advisory/test.json`;

      expect(() => {
        guard.guardedWriteFile('runtime-writer', targetPath, content);
      }).toThrow('FILESYSTEM_GUARD_VIOLATION');
    });

    it('should deny write from unregistered writer', () => {
      const content = JSON.stringify({ test: 'data' });
      const targetPath = `${testDir}/artifacts/runtime/test.json`;

      expect(() => {
        guard.guardedWriteFile('unknown-writer', targetPath, content);
      }).toThrow('FILESYSTEM_GUARD_VIOLATION');
    });

    it('should allow append to authorized file', () => {
      const targetPath = `${testDir}/artifacts/runtime/stream.jsonl`;

      guard.guardedAppendFile('runtime-writer', targetPath, '{"line":1}\n');
      guard.guardedAppendFile('runtime-writer', targetPath, '{"line":2}\n');

      const content = readFileSync(targetPath, 'utf-8');
      expect(content).toBe('{"line":1}\n{"line":2}\n');
    });

    it('should deny append to unauthorized path', () => {
      const targetPath = `${testDir}/artifacts/advisory/stream.jsonl`;

      expect(() => {
        guard.guardedAppendFile('runtime-writer', targetPath, '{"line":1}\n');
      }).toThrow('FILESYSTEM_GUARD_VIOLATION');
    });
  });

  describe('Violation Tracking', () => {
    it('should record violations', () => {
      const targetPath = `${testDir}/artifacts/advisory/test.json`;

      try {
        guard.guardedWriteFile('runtime-writer', targetPath, 'data');
      } catch (error) {
        // Expected to throw
      }

      const violations = guard.getViolations();
      expect(violations.length).toBe(1);
      expect(violations[0].writerId).toBe('runtime-writer');
      expect(violations[0].attemptedPath).toContain('advisory/test.json');
      expect(violations[0].reason).toContain('not authorized');
    });

    it('should clear violations', () => {
      try {
        guard.guardedWriteFile('runtime-writer', `${testDir}/artifacts/advisory/test.json`, 'data');
      } catch (error) {
        // Expected
      }

      expect(guard.getViolations().length).toBe(1);

      guard.clearViolations();
      expect(guard.getViolations().length).toBe(0);
    });
  });

  describe('Path Normalization', () => {
    it('should prevent path traversal attacks', () => {
      const maliciousPath = `${testDir}/artifacts/runtime/../advisory/evil.json`;

      expect(() => {
        guard.guardedWriteFile('runtime-writer', maliciousPath, 'data');
      }).toThrow('FILESYSTEM_GUARD_VIOLATION');
    });

    it('should handle absolute paths correctly', () => {
      const absolutePath = `${process.cwd()}/${testDir}/artifacts/runtime/test.json`;

      // Should work if the absolute path resolves to an allowed path
      guard.guardedWriteFile('runtime-writer', absolutePath, '{"test": true}');

      expect(existsSync(absolutePath)).toBe(true);
    });
  });
});
