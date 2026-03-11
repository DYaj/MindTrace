import { writeFileSync, appendFileSync, mkdirSync } from 'fs';
import { dirname, normalize, resolve } from 'path';
import type { WriteAuthorityRegistry } from './write-authority-registry';
import type { WriteViolation } from './types';

export class FileSystemGuardError extends Error {
  constructor(
    message: string,
    public writerId: string,
    public attemptedPath: string,
    public exitCode: number = 3
  ) {
    super(message);
    this.name = 'FileSystemGuardError';
  }
}

export class FileSystemGuard {
  private violations: WriteViolation[] = [];

  constructor(private registry: WriteAuthorityRegistry) {}

  guardedWriteFile(writerId: string, targetPath: string, content: string | Buffer): void {
    this.checkWritePermission(writerId, targetPath);

    // Ensure directory exists
    const dir = dirname(targetPath);
    mkdirSync(dir, { recursive: true });

    // Perform the write
    writeFileSync(targetPath, content, 'utf-8');
  }

  guardedAppendFile(writerId: string, targetPath: string, content: string): void {
    this.checkWritePermission(writerId, targetPath);

    // Ensure directory exists
    const dir = dirname(targetPath);
    mkdirSync(dir, { recursive: true });

    // Perform the append
    appendFileSync(targetPath, content, 'utf-8');
  }

  getViolations(): WriteViolation[] {
    return [...this.violations];
  }

  clearViolations(): void {
    this.violations = [];
  }

  private checkWritePermission(writerId: string, targetPath: string): void {
    // Normalize and resolve path to prevent bypass attempts
    const normalizedPath = normalize(targetPath);
    const resolvedPath = resolve(normalizedPath);

    // Check against registry
    const canWrite = this.registry.canWrite(writerId, normalizedPath);

    if (!canWrite) {
      const violation: WriteViolation = {
        writerId,
        attemptedPath: normalizedPath,
        reason: `Writer '${writerId}' is not authorized to write to '${normalizedPath}'`,
        timestamp: new Date().toISOString()
      };

      this.violations.push(violation);

      throw new FileSystemGuardError(
        `FILESYSTEM_GUARD_VIOLATION: ${violation.reason}`,
        writerId,
        normalizedPath,
        3 // Exit code for policy/compliance violation
      );
    }
  }
}
