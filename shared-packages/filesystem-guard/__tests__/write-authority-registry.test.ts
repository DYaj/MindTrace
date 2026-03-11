import { describe, it, expect, beforeEach } from 'vitest';
import { WriteAuthorityRegistry } from '../src/write-authority-registry';

describe('WriteAuthorityRegistry', () => {
  let registry: WriteAuthorityRegistry;

  beforeEach(() => {
    registry = new WriteAuthorityRegistry();
  });

  it('should register writer with allowed paths', () => {
    registry.registerWriter('runtime-writer', {
      allowedPaths: ['artifacts/runtime'],
      capability: 'write-authoritative'
    });

    const hasAccess = registry.canWrite('runtime-writer', 'artifacts/runtime/policy.json');
    expect(hasAccess).toBe(true);
  });

  it('should deny access to unregistered writer', () => {
    const hasAccess = registry.canWrite('unknown-writer', 'artifacts/runtime/policy.json');
    expect(hasAccess).toBe(false);
  });

  it('should deny access to path outside allowed scope', () => {
    registry.registerWriter('runtime-writer', {
      allowedPaths: ['artifacts/runtime'],
      capability: 'write-authoritative'
    });

    const hasAccess = registry.canWrite('runtime-writer', 'artifacts/advisory/rca.json');
    expect(hasAccess).toBe(false);
  });

  it('should allow nested paths within allowed directory', () => {
    registry.registerWriter('runtime-writer', {
      allowedPaths: ['artifacts/runtime'],
      capability: 'write-authoritative'
    });

    const hasAccess = registry.canWrite('runtime-writer', 'artifacts/runtime/phase1/cache.json');
    expect(hasAccess).toBe(true);
  });

  it('should prevent duplicate writer registration', () => {
    registry.registerWriter('runtime-writer', {
      allowedPaths: ['artifacts/runtime'],
      capability: 'write-authoritative'
    });

    expect(() => {
      registry.registerWriter('runtime-writer', {
        allowedPaths: ['artifacts/advisory'],
        capability: 'write-advisory'
      });
    }).toThrow('Writer runtime-writer is already registered');
  });
});
