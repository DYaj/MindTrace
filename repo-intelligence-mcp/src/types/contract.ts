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
