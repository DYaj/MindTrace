import { describe, it, expect } from 'vitest';
import {
  loadTrustedAuthoritative,
  loadTrustedAdvisory,
  loadTrustedCache,
  loadTrustedContract,
  TrustedLoadError
} from '../src/trusted-loaders';
import type {
  TrustedAuthoritative,
  UntrustedAdvisory,
  TrustedCache,
  TrustedContract
} from '../src/branded-types';

describe('Layer 4 Integration: Runtime Type Guards', () => {
  describe('Complete GSL Stack: Layers 1-4', () => {
    it('should enforce complete type safety from load to execution', () => {
      // Layer 1: Schema validation (simulated)
      const schemaValidator = (data: unknown) => {
        const obj = data as any;
        return (
          obj.artifactClass === 'authoritative' &&
          obj.decision &&
          obj.timestamp
        );
      };

      // Layer 2: Audit trail (directory separation handled at write)

      // Layer 3: Filesystem guards (permission checked at write)

      // Layer 4: Type guards (compile-time + runtime enforcement)
      const rawData = {
        artifactClass: 'authoritative',
        decision: 'pass',
        timestamp: '2026-03-10T10:00:00Z'
      };

      const trusted: TrustedAuthoritative<typeof rawData> =
        loadTrustedAuthoritative(rawData, schemaValidator);

      // At compile time, TypeScript enforces that only TrustedAuthoritative
      // can be used in execution-sensitive contexts
      function executeDecision(decision: TrustedAuthoritative<any>) {
        return decision.decision === 'pass' ? 0 : 1;
      }

      const exitCode = executeDecision(trusted);
      expect(exitCode).toBe(0);

      // The following would be compile errors:
      // executeDecision(rawData); // Error: not branded
      // executeDecision({ decision: 'pass' }); // Error: not branded
    });

    it('should prevent AI-generated content from execution pipeline', () => {
      const advisoryValidator = (data: unknown) => {
        const obj = data as any;
        return obj.artifactClass === 'advisory';
      };

      const aiGenerated = {
        artifactClass: 'advisory',
        summary: 'AI-generated RCA',
        recommendations: ['Fix suggested by AI']
      };

      const advisory: UntrustedAdvisory<typeof aiGenerated> =
        loadTrustedAdvisory(aiGenerated, advisoryValidator);

      // Advisory artifacts should NEVER be passed to execution functions
      function executeDecision(_decision: TrustedAuthoritative<any>) {
        return 0;
      }

      // The following is a compile error:
      // executeDecision(advisory); // Type error: UntrustedAdvisory != TrustedAuthoritative

      // Must explicitly violate type safety (anti-pattern)
      const dangerous = advisory as any;
      executeDecision(dangerous); // Compiles, but defeats the type system

      expect(advisory.summary).toContain('AI-generated');
    });
  });

  describe('Contract-Cache-Runtime Trust Chain', () => {
    it('should enforce trust chain from contract to cache to runtime', () => {
      // Step 1: Load trusted contract
      const contractData = {
        framework: 'playwright',
        style: 'bdd',
        contractVersion: '1.0.0',
        contractHash: 'abc123'
      };

      const contract: TrustedContract<typeof contractData> =
        loadTrustedContract(contractData, (d: unknown) => {
          const obj = d as any;
          return obj.framework && obj.contractVersion && obj.contractHash;
        });

      // Step 2: Load cache that's bound to contract
      const cacheData = {
        pageKey: 'login',
        contractHash: contract.contractHash, // Must match!
        selectors: ['#username', '#password']
      };

      const cache: TrustedCache<typeof cacheData> =
        loadTrustedCache(cacheData, (d: unknown) => {
          const obj = d as any;
          return obj.contractHash === contract.contractHash && obj.selectors;
        });

      // Step 3: Use cache in runtime
      function healSelector(_cache: TrustedCache<any>, _selector: string) {
        // Healing logic uses trusted cache
        return true;
      }

      const healed = healSelector(cache, '#old-selector');
      expect(healed).toBe(true);

      // Cannot use unvalidated cache
      const untrustedCache = { pageKey: 'fake', selectors: [] };
      // healSelector(untrustedCache); // Compile error!

      expect(cache.contractHash).toBe(contract.contractHash);
    });

    it('should reject cache with mismatched contract hash', () => {
      const contractHash = 'abc123';

      const cacheData = {
        pageKey: 'login',
        contractHash: 'xyz789', // Mismatch!
        selectors: []
      };

      const validator = (d: unknown) => {
        const obj = d as any;
        return obj.contractHash === contractHash; // This will fail
      };

      expect(() => {
        loadTrustedCache(cacheData, validator);
      }).toThrow(TrustedLoadError);
    });
  });

  describe('Authority Boundary Enforcement', () => {
    it('should enforce that advisory never becomes authoritative', () => {
      const advisoryData = {
        artifactClass: 'advisory',
        summary: 'Failure analysis',
        suggestedFix: 'Change selector to #new-button'
      };

      const advisory = loadTrustedAdvisory(advisoryData, (d: unknown) => {
        const obj = d as any;
        return obj.artifactClass === 'advisory';
      });

      // Advisory can be used for display/analysis
      function displayRCA(rca: UntrustedAdvisory<any>) {
        console.log(rca.summary);
      }

      displayRCA(advisory);

      // But NOT for execution decisions
      function applyFix(_fix: TrustedAuthoritative<any>) {
        // Apply the fix to production
      }

      // applyFix(advisory); // Compile error: UntrustedAdvisory != TrustedAuthoritative

      expect(advisory.artifactClass).toBe('advisory');
    });

    it('should require explicit validation to promote advisory to authoritative', () => {
      const advisoryData = {
        artifactClass: 'advisory',
        suggestedSelector: '#new-button'
      };

      const advisory = loadTrustedAdvisory(advisoryData, (d: unknown) => {
        const obj = d as any;
        return obj.artifactClass === 'advisory';
      });

      // If human explicitly approves the AI suggestion
      const humanApproved = {
        artifactClass: 'authoritative',
        selector: advisory.suggestedSelector,
        approvedBy: 'human',
        timestamp: new Date().toISOString()
      };

      // Must re-validate as authoritative
      const trusted = loadTrustedAuthoritative(humanApproved, (d: unknown) => {
        const obj = d as any;
        return obj.artifactClass === 'authoritative' && obj.approvedBy === 'human';
      });

      function applySelector(_sel: TrustedAuthoritative<any>) {
        // Apply to production
      }

      applySelector(trusted); // Now safe!

      expect(trusted.artifactClass).toBe('authoritative');
      expect(trusted.approvedBy).toBe('human');
    });
  });

  describe('Exit Code Enforcement', () => {
    it('should use exit code 3 for type validation failures', () => {
      const invalidData = {
        artifactClass: 'wrong',
        invalid: true
      };

      const validator = (d: unknown) => {
        const obj = d as any;
        return obj.artifactClass === 'authoritative';
      };

      try {
        loadTrustedAuthoritative(invalidData, validator);
        throw new Error('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(TrustedLoadError);
        expect((error as TrustedLoadError).exitCode).toBe(3);
        expect((error as TrustedLoadError).brand).toBe('TrustedAuthoritative');
      }
    });
  });

  describe('Type-Level Safety Examples', () => {
    it('should prevent common anti-patterns at compile time', () => {
      // Anti-pattern 1: Using raw data as trusted
      const rawData = { decision: 'pass' };
      function execute(_d: TrustedAuthoritative<any>) {}

      // execute(rawData); // Compile error!

      // Anti-pattern 2: Using AI output as authoritative
      const aiOutput = { suggestion: 'fix' };
      function apply(_fix: TrustedAuthoritative<any>) {}

      // apply(aiOutput); // Compile error!

      // Anti-pattern 3: Bypassing validation
      // const fake: TrustedAuthoritative<any> = rawData; // Compile error!

      // Only way to create branded types is through loaders
      const trusted = loadTrustedAuthoritative(rawData, () => true);
      execute(trusted); // OK!

      expect(trusted).toBeDefined();
    });

    it('should allow escape hatches when explicitly needed', () => {
      type Data = { value: string };

      // Escape hatch 1: unsafeCast (dangerous!)
      const raw: Data = { value: 'test' };
      const unsafe: TrustedAuthoritative<Data> = raw as any;

      // Escape hatch 2: Type assertion (dangerous!)
      const alsoUnsafe = raw as TrustedAuthoritative<Data>;

      // Both compile, but defeat the type system
      expect(unsafe.value).toBe('test');
      expect(alsoUnsafe.value).toBe('test');
    });
  });

  describe('Integration with Schema Validation (Layer 1)', () => {
    it('should integrate with AJV-style schema validators', () => {
      // Simulate AJV validator
      const schemaValidator = (data: unknown) => {
        const obj = data as any;

        // Check required fields
        if (!obj.artifactClass || !obj.decision || !obj.timestamp) {
          return { valid: false, errors: ['Missing required fields'] };
        }

        // Check types
        if (obj.artifactClass !== 'authoritative') {
          return { valid: false, errors: ['Invalid artifactClass'] };
        }

        return { valid: true };
      };

      const validData = {
        artifactClass: 'authoritative',
        decision: 'pass',
        timestamp: '2026-03-10T10:00:00Z'
      };

      const invalidData = {
        decision: 'pass'
        // Missing required fields
      };

      // Valid data loads successfully
      const valid = loadTrustedAuthoritative(validData, (d) => schemaValidator(d).valid);
      expect(valid.decision).toBe('pass');

      // Invalid data throws
      expect(() => {
        loadTrustedAuthoritative(invalidData, (d) => schemaValidator(d).valid);
      }).toThrow(TrustedLoadError);
    });
  });
});
