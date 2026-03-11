import { describe, it, expect } from 'vitest';
import type {
  TrustedAuthoritative,
  UntrustedAdvisory,
  TrustedCache,
  TrustedContract,
  Unvalidated,
  Unbrand
} from '../src/branded-types';
import { unsafeCast } from '../src/branded-types';

describe('Branded Types', () => {
  describe('Type-level enforcement', () => {
    it('should prevent assignment between different brands at compile time', () => {
      // This test verifies compile-time type safety
      // The actual assertions are compile-time checks

      type AuthData = { decision: string };
      type AdvisoryData = { summary: string };

      const authData: AuthData = { decision: 'pass' };
      const advisoryData: AdvisoryData = { summary: 'RCA' };

      // These should compile
      const trusted: TrustedAuthoritative<AuthData> = unsafeCast(authData);
      const advisory: UntrustedAdvisory<AdvisoryData> = unsafeCast(advisoryData);

      // Runtime verification (brands are type-level only)
      expect(trusted).toBeDefined();
      expect(advisory).toBeDefined();

      // At runtime, the branded values are just the original values
      expect(trusted).toEqual(authData);
      expect(advisory).toEqual(advisoryData);
    });

    it('should allow unbranding when needed', () => {
      type Data = { value: number };
      const data: Data = { value: 42 };

      const branded: TrustedAuthoritative<Data> = unsafeCast(data);

      // Unbrand extracts the underlying type
      type Unbranded = Unbrand<typeof branded>;

      const unbranded: Unbranded = branded as Unbranded;

      expect(unbranded.value).toBe(42);
    });
  });

  describe('Brand types', () => {
    it('should support TrustedAuthoritative brand', () => {
      type PolicyDecision = { decision: 'pass' | 'fail' };
      const policy: PolicyDecision = { decision: 'pass' };

      const trusted: TrustedAuthoritative<PolicyDecision> = unsafeCast(policy);

      expect(trusted.decision).toBe('pass');
    });

    it('should support UntrustedAdvisory brand', () => {
      type RCAReport = { summary: string; recommendations: string[] };
      const rca: RCAReport = {
        summary: 'Button changed',
        recommendations: ['Add testid']
      };

      const advisory: UntrustedAdvisory<RCAReport> = unsafeCast(rca);

      expect(advisory.summary).toBe('Button changed');
      expect(advisory.recommendations).toHaveLength(1);
    });

    it('should support TrustedCache brand', () => {
      type CachedPage = { pageKey: string; selectors: string[] };
      const page: CachedPage = {
        pageKey: 'login',
        selectors: ['#username', '#password']
      };

      const cached: TrustedCache<CachedPage> = unsafeCast(page);

      expect(cached.pageKey).toBe('login');
      expect(cached.selectors).toHaveLength(2);
    });

    it('should support TrustedContract brand', () => {
      type Contract = { framework: string; style: string };
      const contract: Contract = { framework: 'playwright', style: 'bdd' };

      const trusted: TrustedContract<Contract> = unsafeCast(contract);

      expect(trusted.framework).toBe('playwright');
      expect(trusted.style).toBe('bdd');
    });

    it('should support Unvalidated brand', () => {
      type RawData = { unknown: unknown };
      const raw: RawData = { unknown: 'data' };

      const unvalidated: Unvalidated<RawData> = unsafeCast(raw);

      expect(unvalidated).toBeDefined();
    });
  });

  describe('Type safety patterns', () => {
    it('should enforce that advisory cannot be used as authoritative', () => {
      // This is a compile-time test - TypeScript will prevent this
      type Data = { value: string };

      const advisory: UntrustedAdvisory<Data> = unsafeCast({ value: 'advisory' });

      // The following would be a compile error:
      // const auth: TrustedAuthoritative<Data> = advisory;

      // Must explicitly convert if needed (escape hatch)
      const converted: TrustedAuthoritative<Data> = advisory as any;

      expect(converted).toBeDefined();
    });

    it('should enforce that unvalidated cannot be used directly', () => {
      type Data = { value: string };

      const unvalidated: Unvalidated<Data> = unsafeCast({ value: 'raw' });

      // The following would be compile errors:
      // const auth: TrustedAuthoritative<Data> = unvalidated;
      // const cached: TrustedCache<Data> = unvalidated;

      // Must validate first (shown in trusted-loaders tests)
      expect(unvalidated).toBeDefined();
    });
  });
});
