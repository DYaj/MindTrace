import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import type { ContractStatus, ContractFile } from '@breakline/ui-types';
import { PathValidator } from '../utils/paths.js';

/**
 * Contract data service
 *
 * DEFENSIVE: This is a read-only visibility layer.
 * Does NOT implement contract validation logic.
 * Displays what exists, delegates validation to integrity services.
 */
export class ContractService {
  /**
   * Get contract status and files
   *
   * DEFENSIVE: Returns empty status if contract directory missing
   */
  static getContractStatus(): ContractStatus {
    try {
      const contractPath = PathValidator.getContractPath();

      // DEFENSIVE: Contract directory is optional
      if (!PathValidator.exists(contractPath)) {
        return {
          exists: false,
          valid: false,
          files: []
        };
      }

      // Read fingerprint if available
      let fingerprint: string | undefined;
      const hashPath = join(contractPath, 'automation-contract.hash');
      if (existsSync(hashPath)) {
        fingerprint = readFileSync(hashPath, 'utf-8').trim();
      }

      // Read all JSON files in contract directory
      const files: ContractFile[] = [];
      try {
        const entries = readdirSync(contractPath, { withFileTypes: true });

        for (const entry of entries) {
          if (!entry.isFile()) continue;

          // Only read .json files (not .hash or other files)
          if (!entry.name.endsWith('.json')) continue;

          const filePath = join(contractPath, entry.name);
          const content = readFileSync(filePath, 'utf-8');

          try {
            const parsed = JSON.parse(content);
            files.push({
              name: entry.name,
              content: parsed
            });
          } catch {
            // If JSON parse fails, store raw content
            files.push({
              name: entry.name,
              content: content
            });
          }
        }
      } catch (error) {
        // If directory read fails, return minimal status
        return {
          exists: true,
          fingerprint,
          valid: false,
          errors: ['Failed to read contract files'],
          files: []
        };
      }

      // IMPORTANT: We do NOT validate the contract here.
      // Validation is delegated to integrity-gates in future stages.
      // For now, assume valid: true if files exist.
      return {
        exists: true,
        fingerprint,
        valid: files.length > 0,
        files
      };
    } catch (error) {
      return {
        exists: false,
        valid: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        files: []
      };
    }
  }
}
