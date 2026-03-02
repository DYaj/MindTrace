export type Framework = "cypress" | "playwright" | "selenium" | "unknown";
export type Style = "native" | "pom" | "bdd" | "hybrid";

export type DetectFrameworkOutput = {
  framework: Framework;
  confidence: number;
  signalsUsed: string[];
  notes: string[];
};

export type InferStructureOutput = {
  style: Style;
  confidence: number;
  signalsUsed: string[];
  structure: {
    pageObjects: {
      present: boolean;
      paths: string[];
      pattern: "class-based" | "function-factory" | "unknown";
    };
    bdd: {
      present: boolean;
      featurePaths: string[];
      stepDefPaths: string[];
      glueStyle: "cucumber" | "custom" | "unknown";
    };
  };
};

export type DetectLocatorStyleOutput = {
  preferenceOrder: Array<
    "data-testid" | "data-qa" | "data-cy" | "role" | "labelText" | "placeholder" | "css" | "xpath"
  >;
  confidence: number;
  signalsUsed: string[];
  orgConventions: {
    stableAttributeKeys: string[];
    customLocatorHelpers: string[]; // heuristic only (Phase 0.2)
  };
};

export type DetectAssertionStyleOutput = {
  primary: "expect" | "should" | "assert" | "wrapper" | "unknown";
  confidence: number;
  wrappers: Array<{ name: string; path: string; confidence: number }>;
  signalsUsed: string[];
};

export type WrapperKind =
  | "cypress-command"
  | "ts-function"
  | "js-function"
  | "unknown";

export type DiscoveredWrapper = {
  name: string;
  kind: WrapperKind;
  category: "locator" | "assertion" | "retry";
  path: string; // repo-relative posix
  evidence: string; // short snippet token
  confidence: number; // 0..1
};

export type WrapperDiscoveryOutput = {
  toolVersion: "0.1.0";
  discoveredAt: string;
  repoRoot: string;
  locatorWrappers: DiscoveredWrapper[];
  assertionWrappers: DiscoveredWrapper[];
  retrySignals: DiscoveredWrapper[];
  warnings: string[];
};

export type FrameworkPatternContract = {
  contractVersion: "0.1.0";
  framework: Framework;
  style: Style;
  confidence: number;
  repoSignals: string[];
  detectedPaths: {
    tests: string[];
    pages: string[];
    steps: string[];
    support: string[];
  };
};

export type SelectorStrategyContract = {
  contractVersion: "0.1.0";
  preferenceOrder: string[];
  wrappers: Array<{ name: string; kind: WrapperKind; path: string; confidence: number }>;
  riskRules: {
    allowXPath: boolean;
    cssLastResort: boolean;
    requireStableIdsWhenAvailable: boolean;
  };
  confidence: number;
  repoSignals: string[];
};

export type AssertionStyleContract = {
  contractVersion: "0.1.0";
  primary: string;
  wrappers: Array<{ name: string; path: string; confidence: number }>;
  confidence: number;
  repoSignals: string[];
};

export type GenerateContractOutput = {
  written: string[];
  contractSummary: {
    framework: Framework;
    style: Style;
    confidence: number;
  };
};

/**
 * Architecture is the high-level test automation architecture.
 * StyleKey is the repo style family key (style1-native / style2-bdd / style3-pom-bdd / unknown).
 */
export type Architecture = "native" | "pom" | "bdd" | "hybrid" | "unknown";
export type StyleKey = `style${number}-${string}` | "unknown";

export type EvidenceKind =
  | "config"
  | "dependency"
  | "wrapper"
  | "pattern"
  | "entrypoint"
  | "structure";

export type Evidence = {
  kind: EvidenceKind;
  /**
   * POSIX normalized, repo-relative. May be "" during initial retrofit stage.
   */
  file: string;
  sample?: string;
};

export type Entrypoint = {
  style: string;
  entrypoint: string;
  confidence?: number;
};

export type AutomationContract = {
  schema_version: string;
  contractVersion: string; // legacy compat
  framework: Framework;

  stylesDetected: string[];
  primaryStyle: StyleKey;

  architecture: Architecture;

  entrypoints: Entrypoint[];

  paths: Record<string, unknown>;

  refs: {
    selectorStrategyRef: string;
    assertionStyleRef: string;
    pageKeyPolicyRef: string;
  };

  page_identity: {
    mode: "hybrid" | "detected" | "hardcoded";
    primary: string;
    ref: string;
  };

  generated_by: {
    name: string;
    version: string;
  };

  evidence: Evidence[];
};

export type PageKeyPolicy = {
  schema_version: string;
  mode: "hybrid" | "detected" | "hardcoded";

  patterns: Record<
    string,
    {
      template: string;
      confidence: number;
      source: "hardcoded" | "detected";
    }
  >;

  collision_resolution: "deterministic_suffix" | "error" | "warn";
  fallback_order: string[];
  dynamicFallback: boolean;

  evidence: Evidence[];

  examples?: Array<{
    path: string;
    pageKey: string;
    style: string;
  }>;
};

export type ContractMeta = {
  schema_version: string;
  generated_at: string;

  scan_summary: {
    files_scanned: number;
    directories: number;
    signals_detected: number;
  };

  tool_versions: Record<string, string>;

  /**
   * Sorted list of contract files in the fingerprint set (excluding meta + hash).
   */
  contract_inputs: string[];

  warnings?: string[];
};
