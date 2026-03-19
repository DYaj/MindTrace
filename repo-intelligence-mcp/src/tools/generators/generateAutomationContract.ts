import type { AutomationContract, Entrypoint, StyleKey, Evidence } from "../../types/contract.js";
import type { RepoTopologyJSON } from "../../types/topology.js";
import type { DetectFrameworkOutput, InferStructureOutput, DetectLocatorStyleOutput, DetectAssertionStyleOutput } from "../../types/contract.js";
import { buildPaths } from "./buildPaths.js";

export function generateAutomationContract(params: {
  topology: RepoTopologyJSON;
  framework: DetectFrameworkOutput;
  structure: InferStructureOutput;
  locatorStyle: DetectLocatorStyleOutput;
  assertionStyle: DetectAssertionStyleOutput;
  stylesDetected: string[];
  entrypoints: Entrypoint[];
  primaryStyle: StyleKey;
}): AutomationContract {
  // CORRECTED: buildPaths() no longer takes framework parameter
  const paths = buildPaths({
    topology: params.topology,
    stylesDetected: params.stylesDetected
  });

  // ============================================================================
  // CANONICAL CONTRACT FIELDS - BreakLine Official Standard
  // ============================================================================
  // See: docs/standards/contract-bundle-schema.md
  //
  // REQUIRED CANONICAL FIELD NAMES (exact casing):
  // - schemaVersion (camelCase) - NOT schema_version
  // - contractVersion (camelCase) - NOT contract_version
  // - generated_by (snake_case for legacy compatibility)
  // - framework (lowercase)
  // ============================================================================
  return {
    schemaVersion: "0.1.0",
    contractVersion: "0.1.0",
    framework: params.framework.framework,
    stylesDetected: params.stylesDetected,
    primaryStyle: params.primaryStyle,
    architecture: params.structure.style,
    entrypoints: params.entrypoints,

    paths,

    refs: {
      selectorStrategyRef: "./selector-strategy.json",
      assertionStyleRef: "./assertion-style.json",
      pageKeyPolicyRef: "./page-key-policy.json"
    },

    page_identity: {
      mode: "hybrid",
      primary: params.primaryStyle,
      ref: "./page-key-policy.json"
    },

    generated_by: {
      name: "repo-intelligence-mcp",
      version: "0.1.0"
    },

    evidence: mapFrameworkEvidence(params.framework, params.structure)
  };
}

function mapFrameworkEvidence(framework: DetectFrameworkOutput, structure: InferStructureOutput): Evidence[] {
  // TODO(Phase 2+): Map repoSignals to Evidence format
  return [];
}
