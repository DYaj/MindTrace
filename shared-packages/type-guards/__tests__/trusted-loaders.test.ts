import { describe, it, expect } from 'vitest';
import {
  loadTrustedAuthoritative,
  loadTrustedAdvisory,
  loadTrustedCache,
  loadTrustedContract,
  TrustedLoadError
} from '../src/trusted-loaders';
import type { TrustedAuthoritative, UntrustedAdvisory, TrustedCache, TrustedContract } from '../src/branded-types';

describe('Trusted Loaders', () => {
  describe('loadTrustedAuthoritative', () => {
    it('should load valid authoritative artifact with brand', () => {
      const data = {
        artifactClass: 'authoritative',
        decision: 'pass',
        timestamp: '2026-03-10T10:00:00Z'
      };

      const validator = (d: unknown) => {
        const obj = d as any;
        return obj.artifactClass === 'authoritative';
      };

      const trusted = loadTrustedAuthoritative(data, validator);

      expect(trusted.artifactClass).toBe('authoritative');
      expect(trusted.decision).toBe('pass');
    });

    it('should reject invalid authoritative artifact', () => {
      const data = {
        artifactClass: 'advisory', // Wrong class
        decision: 'pass'
      };

      const validator = (d: unknown) => {
        const obj = d as any;
        return obj.artifactClass === 'authoritative';
      };

      expect(() => {
        loadTrustedAuthoritative(data, validator);
      }).toThrow(TrustedLoadError);

      expect(() => {
        loadTrustedAuthoritative(data, validator);
      }).toThrow('Failed to load TrustedAuthoritative');
    });

    it('should include validation errors in exception', () => {
      const data = { invalid: true };

      const validator = (_: unknown) => false;

      try {
        loadTrustedAuthoritative(data, validator);
        throw new Error('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(TrustedLoadError);
        expect((error as TrustedLoadError).brand).toBe('TrustedAuthoritative');
        expect((error as TrustedLoadError).exitCode).toBe(3);
      }
    });
  });

  describe('loadTrustedAdvisory', () => {
    it('should load valid advisory artifact with brand', () => {
      const data = {
        artifactClass: 'advisory',
        summary: 'RCA summary',
        recommendations: ['Fix selector']
      };

      const validator = (d: unknown) => {
        const obj = d as any;
        return obj.artifactClass === 'advisory';
      };

      const advisory = loadTrustedAdvisory(data, validator);

      expect(advisory.artifactClass).toBe('advisory');
      expect(advisory.summary).toBe('RCA summary');
    });

    it('should reject authoritative artifact as advisory', () => {
      const data = {
        artifactClass: 'authoritative', // Wrong class
        summary: 'Not advisory'
      };

      const validator = (d: unknown) => {
        const obj = d as any;
        return obj.artifactClass === 'advisory';
      };

      expect(() => {
        loadTrustedAdvisory(data, validator);
      }).toThrow('Failed to load UntrustedAdvisory');
    });
  });

  describe('loadTrustedCache', () => {
    it('should load valid cache artifact with brand', () => {
      const data = {
        pageKey: 'login',
        contractHash: 'abc123',
        selectors: ['#username', '#password']
      };

      const validator = (d: unknown) => {
        const obj = d as any;
        return obj.contractHash && obj.selectors;
      };

      const cached = loadTrustedCache(data, validator);

      expect(cached.pageKey).toBe('login');
      expect(cached.selectors).toHaveLength(2);
    });

    it('should reject cache without contract hash', () => {
      const data = {
        pageKey: 'login',
        selectors: []
        // Missing contractHash
      };

      const validator = (d: unknown) => {
        const obj = d as any;
        return obj.contractHash && obj.selectors;
      };

      expect(() => {
        loadTrustedCache(data, validator);
      }).toThrow('Failed to load TrustedCache');
    });
  });

  describe('loadTrustedContract', () => {
    it('should load valid contract with brand', () => {
      const data = {
        framework: 'playwright',
        style: 'bdd',
        contractVersion: '1.0.0'
      };

      const validator = (d: unknown) => {
        const obj = d as any;
        return obj.framework && obj.contractVersion;
      };

      const contract = loadTrustedContract(data, validator);

      expect(contract.framework).toBe('playwright');
      expect(contract.contractVersion).toBe('1.0.0');
    });

    it('should reject contract without version', () => {
      const data = {
        framework: 'playwright'
        // Missing contractVersion
      };

      const validator = (d: unknown) => {
        const obj = d as any;
        return obj.framework && obj.contractVersion;
      };

      expect(() => {
        loadTrustedContract(data, validator);
      }).toThrow('Failed to load TrustedContract');
    });
  });

  describe('Type safety enforcement', () => {
    it('should enforce that only trusted loaders can create branded types', () => {
      const data = {
        artifactClass: 'authoritative',
        decision: 'pass'
      };

      const validator = (d: unknown) => {
        const obj = d as any;
        return obj.artifactClass === 'authoritative';
      };

      // The only way to get a TrustedAuthoritative is through the loader
      const trusted: TrustedAuthoritative<typeof data> = loadTrustedAuthoritative(data, validator);

      // Cannot create trusted types without validation:
      // const fake: TrustedAuthoritative<typeof data> = data; // Compile error

      expect(trusted).toBeDefined();
    });

    it('should prevent using advisory as authoritative at compile time', () => {
      const advisoryData = {
        artifactClass: 'advisory',
        summary: 'test'
      };

      const validator = (d: unknown) => {
        const obj = d as any;
        return obj.artifactClass === 'advisory';
      };

      const advisory: UntrustedAdvisory<typeof advisoryData> =
        loadTrustedAdvisory(advisoryData, validator);

      // The following would be a compile error:
      // const auth: TrustedAuthoritative<typeof advisoryData> = advisory;

      // Must use escape hatch explicitly (anti-pattern)
      const sneaky: TrustedAuthoritative<typeof advisoryData> = advisory as any;

      expect(sneaky).toBeDefined();
    });
  });
});
