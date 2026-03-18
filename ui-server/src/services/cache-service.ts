import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import type { CacheStatus, CachePage } from '@breakline/ui-types';
import { PathValidator } from '../utils/paths.js';

/**
 * Cache data service
 *
 * DEFENSIVE: This is a read-only visibility layer.
 * Does NOT implement drift detection logic.
 * Displays what exists, delegates drift checks to integrity services.
 */
export class CacheService {
  /**
   * Get cache status including drift indication
   *
   * DEFENSIVE: Returns empty status if cache directory missing
   */
  static getCacheStatus(): CacheStatus {
    try {
      const cachePath = PathValidator.getCachePath();

      // DEFENSIVE: Cache directory is optional
      if (!PathValidator.exists(cachePath)) {
        return {
          exists: false,
          pageCount: 0,
          pages: []
        };
      }

      // Read cache metadata
      const metaPath = join(cachePath, 'meta.json');
      if (!existsSync(metaPath)) {
        return {
          exists: true,
          pageCount: 0,
          pages: []
        };
      }

      let cacheHash: string | undefined;
      let pages: CachePage[] = [];

      try {
        const metaContent = readFileSync(metaPath, 'utf-8');
        const meta = JSON.parse(metaContent);

        cacheHash = meta.contractSha256;
        pages = meta.pages || [];
      } catch {
        // If meta.json is malformed, return minimal status
        return {
          exists: true,
          pageCount: 0,
          pages: []
        };
      }

      // Check contract binding (simple hash comparison)
      let binding: CacheStatus['binding'];
      if (cacheHash) {
        // Read current contract hash
        const contractPath = PathValidator.getContractPath();
        let currentContractHash: string | undefined;

        if (PathValidator.exists(contractPath)) {
          const hashPath = join(contractPath, 'automation-contract.hash');
          if (existsSync(hashPath)) {
            currentContractHash = readFileSync(hashPath, 'utf-8').trim();
          }
        }

        binding = {
          contractSha256: cacheHash,
          match: cacheHash === currentContractHash,
          currentContractHash
        };
      }

      return {
        exists: true,
        binding,
        pageCount: pages.length,
        pages
      };
    } catch (error) {
      return {
        exists: false,
        pageCount: 0,
        pages: []
      };
    }
  }
}
