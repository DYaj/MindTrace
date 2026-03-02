import type { PageKeyPolicy, Evidence } from "../../types/contract.js";
import type { RepoTopologyJSON } from "../../types/topology.js";

const CONFIDENCE = {
  HARDCODED: 0.95,
  DETECTED: 0.7,
  FALLBACK: 0.5
} as const;

export function generatePageKeyPolicy(params: { topology: RepoTopologyJSON; stylesDetected: string[] }): PageKeyPolicy {
  const patterns: Record<string, { template: string; confidence: number; source: "hardcoded" | "detected" }> = {};

  for (const style of params.stylesDetected) {
    if (style === "style1-native") {
      patterns[style] = {
        template: "<FileName>",
        confidence: CONFIDENCE.HARDCODED,
        source: "hardcoded"
      };
    } else if (style === "style2-bdd") {
      patterns[style] = {
        template: "<ScenarioName>",
        confidence: CONFIDENCE.HARDCODED,
        source: "hardcoded"
      };
    } else if (style === "style3-pom-bdd") {
      patterns[style] = {
        template: "<PageClassName>",
        confidence: CONFIDENCE.HARDCODED,
        source: "hardcoded"
      };
    } else {
      patterns[style] = {
        template: "<DetectedAnchor>",
        confidence: CONFIDENCE.DETECTED,
        source: "detected"
      };
    }
  }

  return {
    schema_version: "0.1.0",
    mode: "hybrid",
    patterns,
    collision_resolution: "deterministic_suffix",
    fallback_order: ["class_name", "route_hint", "file_basename", "dir_anchor"],
    dynamicFallback: true,
    evidence: buildPageKeyEvidence(params.topology),
    examples: buildExamples(params.topology)
  };
}

function buildPageKeyEvidence(topology: RepoTopologyJSON): Evidence[] {
  // TODO: Extract evidence from topology
  return [];
}

function buildExamples(topology: RepoTopologyJSON): Array<{ path: string; pageKey: string; style: string }> {
  // TODO: Extract examples from topology
  return [];
}
