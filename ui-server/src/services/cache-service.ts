import { existsSync, readFileSync, readdirSync } from 'fs';
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

        // Read contract hash (v1 format uses 'contract_hash')
        cacheHash = meta.contract_hash || meta.contractSha256;

        // Load pages from pages/ directory
        const pagesDir = join(cachePath, 'pages');
        if (existsSync(pagesDir)) {
          const pageFiles = readdirSync(pagesDir).filter((f: string) => f.endsWith('.json'));

          for (const file of pageFiles) {
            try {
              const pageContent = readFileSync(join(pagesDir, file), 'utf-8');
              const pageData = JSON.parse(pageContent);

              // Extract page key from filename (e.g., "pages.json" -> "pages")
              const key = file.replace('.json', '');

              pages.push({
                key,
                path: pageData.path || file
              });
            } catch {
              // Skip malformed page files
            }
          }
        }
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
        // Read current contract hash (try both file names)
        const contractPath = PathValidator.getContractPath();
        let currentContractHash: string | undefined;

        if (PathValidator.exists(contractPath)) {
          // Try contract.fingerprint.sha256 first (v1 format), then automation-contract.hash (legacy)
          const fingerprintPath = join(contractPath, 'contract.fingerprint.sha256');
          const hashPath = join(contractPath, 'automation-contract.hash');

          if (existsSync(fingerprintPath)) {
            currentContractHash = readFileSync(fingerprintPath, 'utf-8').trim();
          } else if (existsSync(hashPath)) {
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

  /**
   * Get cache page file content
   *
   * DEFENSIVE: Returns null if file not found or read fails
   */
  static getCachePageContent(pageKey: string): string | null {
    try {
      const cachePath = PathValidator.getCachePath();

      if (!PathValidator.exists(cachePath)) {
        return null;
      }

      // Cache page files are stored as {pageKey}.json
      const pageFilePath = join(cachePath, 'pages', `${pageKey}.json`);

      if (!existsSync(pageFilePath)) {
        return null;
      }

      return readFileSync(pageFilePath, 'utf-8');
    } catch (error) {
      return null;
    }
  }
}
