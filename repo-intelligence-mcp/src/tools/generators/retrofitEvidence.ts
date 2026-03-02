import type { Evidence } from "../../types/contract.js";
import type { RepoTopologyJSON } from "../../types/topology.js";

/**
 * Contract that can be retrofitted with evidence.
 * Contracts may have existing evidence arrays and repoSignals for mapping.
 */
type ContractWithEvidence = {
  evidence?: Evidence[];
  repoSignals?: string[];
  [key: string]: unknown;
};

/**
 * Retrofits evidence fields across all contract types in a bundle.
 *
 * Preserves existing evidence while:
 * - Upgrading empty-file entries when new evidence provides file paths
 * - Preventing duplicate evidence entries
 * - Merging new evidence from repo topology signals
 *
 * @param contracts - Bundle containing framework, selector, and assertion contracts
 * @param topology - Scanned repository topology with signals
 * @returns Updated contract bundle with retrofitted evidence
 */
export function retrofitEvidenceBundle(
  contracts: {
    framework: ContractWithEvidence;
    selector: ContractWithEvidence;
    assertion: ContractWithEvidence;
  },
  topology: RepoTopologyJSON
): {
  framework: ContractWithEvidence;
  selector: ContractWithEvidence;
  assertion: ContractWithEvidence;
} {
  return {
    framework: retrofitSingleContract(contracts.framework, topology, "framework"),
    selector: retrofitSingleContract(contracts.selector, topology, "selector"),
    assertion: retrofitSingleContract(contracts.assertion, topology, "assertion")
  };
}

function retrofitSingleContract(
  contract: ContractWithEvidence,
  topology: RepoTopologyJSON,
  type: "framework" | "selector" | "assertion"
): ContractWithEvidence {
  const existingEvidence = contract.evidence || [];
  const mappedEvidence = mapRepoSignalsToEvidence(contract.repoSignals || [], topology, type);

  return {
    ...contract,
    evidence: mergeEvidence(existingEvidence, mappedEvidence)
  };
}

function mergeEvidence(existing: Evidence[], mapped: Evidence[]): Evidence[] {
  const merged = [...existing];

  for (const newEv of mapped) {
    // Upgrade empty-file entries
    const emptyFileIndex = merged.findIndex((e) => e.kind === newEv.kind && e.sample === newEv.sample && e.file === "" && newEv.file !== "");

    if (emptyFileIndex >= 0) {
      merged[emptyFileIndex] = newEv;
      continue;
    }

    // Add if not already present
    const exists = merged.some((e) => e.kind === newEv.kind && e.file === newEv.file && e.sample === newEv.sample);

    if (!exists) {
      merged.push(newEv);
    }
  }

  return merged;
}

function mapRepoSignalsToEvidence(repoSignals: string[], topology: RepoTopologyJSON, type: string): Evidence[] {
  // TODO: Map repoSignals hashes to Evidence objects with file paths
  return [];
}
