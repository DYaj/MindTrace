import type { ContractMeta } from "../../types/contract.js";
import type { RepoTopologyJSON } from "../../types/topology.js";

export function generateContractMeta(params: { scanResult: RepoTopologyJSON; contractInputs: string[] }): ContractMeta {
  // ============================================================================
  // CANONICAL FIELD NAMES - BreakLine Official Standard
  // See: docs/standards/contract-bundle-schema.md
  // Use schemaVersion (camelCase), NOT schema_version (snake_case)
  // ============================================================================
  return {
    schemaVersion: "0.1.0",
    generated_at: new Date().toISOString(),
    scan_summary: {
      files_scanned: params.scanResult.files?.count || 0,
      directories: params.scanResult.directories?.length || 0,
      signals_detected: params.scanResult.signals?.length || 0
    },
    tool_versions: {
      "repo-intelligence-mcp": "0.1.0"
    },
    contract_inputs: params.contractInputs.slice().sort((a, b) => a.localeCompare(b))
  };
}
