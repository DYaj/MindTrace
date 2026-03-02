import type { Evidence } from "../../types/contract.js";
import type { RepoTopologyJSON } from "../../types/topology.js";

export function retrofitEvidenceBundle(
  contracts: {
    framework: any;
    selector: any;
    assertion: any;
  },
  topology: RepoTopologyJSON
): {
  framework: any;
  selector: any;
  assertion: any;
} {
  return {
    framework: retrofitSingleContract(contracts.framework, topology, "framework"),
    selector: retrofitSingleContract(contracts.selector, topology, "selector"),
    assertion: retrofitSingleContract(contracts.assertion, topology, "assertion")
  };
}

function retrofitSingleContract(contract: any, topology: RepoTopologyJSON, type: "framework" | "selector" | "assertion"): any {
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
