import { normalize, resolve, relative } from 'path';
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

    // Normalize and resolve to handle both absolute and relative paths
    const normalizedTarget = normalize(targetPath);
    const resolvedTarget = resolve(normalizedTarget);

    // Check if target path is within any allowed path
    return identity.allowedPaths.some(allowedPath => {
      const resolvedAllowed = resolve(allowedPath);

      // Exact match
      if (resolvedTarget === resolvedAllowed) {
        return true;
      }

      // Check if target is nested within allowed directory
      const rel = relative(resolvedAllowed, resolvedTarget);

      // If relative path doesn't start with '..' and isn't absolute,
      // then target is inside allowed directory
      return !rel.startsWith('..') && !rel.startsWith('/') && rel !== '';
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
