import { normalize, join } from 'path';
import type { WriterIdentity } from './types';

export class WriteAuthorityRegistry {
  private writers: Map<string, WriterIdentity> = new Map();

  registerWriter(writerId: string, identity: WriterIdentity): void {
    if (this.writers.has(writerId)) {
      throw new Error(`Writer ${writerId} is already registered`);
    }

    // Normalize all paths to prevent bypass attempts
    const normalizedIdentity: WriterIdentity = {
      ...identity,
      allowedPaths: identity.allowedPaths.map(p => normalize(p))
    };

    this.writers.set(writerId, normalizedIdentity);
  }

  canWrite(writerId: string, targetPath: string): boolean {
    const identity = this.writers.get(writerId);

    if (!identity) {
      return false; // Unregistered writer has no access
    }

    const normalizedTarget = normalize(targetPath);

    // Check if target path is within any allowed path
    return identity.allowedPaths.some(allowedPath => {
      // Exact match or nested within allowed directory
      if (normalizedTarget === allowedPath) {
        return true;
      }

      // Check if target is nested within allowed directory
      const relPath = normalizedTarget.startsWith(allowedPath + '/')
        || normalizedTarget.startsWith(allowedPath + '\\');

      return relPath;
    });
  }

  getWriter(writerId: string): WriterIdentity | undefined {
    return this.writers.get(writerId);
  }

  listWriters(): string[] {
    return Array.from(this.writers.keys());
  }

  unregisterWriter(writerId: string): boolean {
    return this.writers.delete(writerId);
  }
}
