import fs from "node:fs";
import path from "node:path";
import type { RepoTopologyJSON } from "../types/topology.js";
import type {
  DetectFrameworkOutput,
  InferStructureOutput,
  DetectLocatorStyleOutput,
  DetectAssertionStyleOutput,
  FrameworkPatternContract,
  SelectorStrategyContract,
  AssertionStyleContract,
  GenerateContractOutput,
  WrapperDiscoveryOutput
} from "../types/contract.js";

function writeJson(root: string, rel: string, obj: any) {
  const abs = path.join(root, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, JSON.stringify(obj, null, 2));
}

function writeText(root: string, rel: string, text: string) {
  const abs = path.join(root, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, text);
}

function uniqSorted(xs: string[]) {
  return Array.from(new Set(xs)).sort((a, b) => a.localeCompare(b));
}

export function generateContractFiles(params: {
  repoRoot: string;
  topology: RepoTopologyJSON;
  framework: DetectFrameworkOutput;
  structure: InferStructureOutput;
  locatorStyle: DetectLocatorStyleOutput;
  assertionStyle: DetectAssertionStyleOutput;
  wrappers?: WrapperDiscoveryOutput;
}): GenerateContractOutput {
  const { repoRoot, topology, framework, structure, locatorStyle, assertionStyle, wrappers } = params;

  const contractDir = ".mcp-contract";

  const tests = uniqSorted(
    topology.directories.filter((d) =>
      ["tests", "test", "e2e", "spec", "cypress", "playwright"].some((x) => d === x || d.startsWith(`${x}/`))
    )
  );
  const pages = uniqSorted(
    topology.directories.filter((d) => d === "pages" || d.startsWith("pages/") || d === "pageObjects" || d.startsWith("pageObjects/"))
  );
  const steps = uniqSorted(
    topology.directories.filter((d) => d === "steps" || d.startsWith("steps/") || d === "step_definitions" || d.startsWith("step_definitions/"))
  );
  const support = uniqSorted(
    topology.directories.filter((d) =>
      d === "support" ||
      d.startsWith("support/") ||
      d === "fixtures" ||
      d.startsWith("fixtures/") ||
      d === "utils" ||
      d.startsWith("utils/") ||
      d === "helpers" ||
      d.startsWith("helpers/")
    )
  );

  const frameworkPattern: FrameworkPatternContract = {
    contractVersion: "0.1.0",
    framework: framework.framework,
    style: structure.style,
    confidence: Math.min(framework.confidence, structure.confidence),
    repoSignals: uniqSorted([...framework.signalsUsed, ...structure.signalsUsed]),
    detectedPaths: { tests, pages, steps, support }
  };

  const wrapperLocatorList =
    wrappers?.locatorWrappers?.map((w) => ({ name: w.name, kind: w.kind, path: w.path, confidence: w.confidence })) ?? [];

  const selectorStrategy: SelectorStrategyContract = {
    contractVersion: "0.1.0",
    preferenceOrder: locatorStyle.preferenceOrder,
    wrappers: wrapperLocatorList,
    riskRules: {
      allowXPath: false,
      cssLastResort: true,
      requireStableIdsWhenAvailable: true
    },
    confidence: locatorStyle.confidence,
    repoSignals: uniqSorted(locatorStyle.signalsUsed)
  };

  const assertionWrappers =
    wrappers?.assertionWrappers?.map((w) => ({ name: w.name, path: w.path, confidence: w.confidence })) ?? assertionStyle.wrappers;

  const assertionContract: AssertionStyleContract = {
    contractVersion: "0.1.0",
    primary: assertionStyle.primary,
    wrappers: assertionWrappers,
    confidence: assertionStyle.confidence,
    repoSignals: uniqSorted(assertionStyle.signalsUsed)
  };

  // Write files (always)
  writeJson(repoRoot, `${contractDir}/repo-topology.json`, topology);
  writeJson(repoRoot, `${contractDir}/framework-pattern.json`, frameworkPattern);
  writeJson(repoRoot, `${contractDir}/selector-strategy.json`, selectorStrategy);
  writeJson(repoRoot, `${contractDir}/assertion-style.json`, assertionContract);

  if (wrappers) {
    writeJson(repoRoot, `${contractDir}/wrapper-discovery.json`, wrappers);
  }

  const md = [
    `# MindTrace Automation Contract (Phase 0)`,
    ``,
    `## Detected Framework`,
    `- framework: **${framework.framework}**`,
    `- confidence: **${framework.confidence.toFixed(2)}**`,
    framework.notes.length ? `- notes: ${framework.notes.join("; ")}` : `- notes: (none)`,
    ``,
    `## Detected Structure`,
    `- style: **${structure.style}**`,
    `- confidence: **${structure.confidence.toFixed(2)}**`,
    ``,
    `### Page Objects`,
    `- present: ${structure.structure.pageObjects.present}`,
    `- paths: ${structure.structure.pageObjects.paths.join(", ") || "(none)"}`,
    ``,
    `### BDD`,
    `- present: ${structure.structure.bdd.present}`,
    `- glueStyle: ${structure.structure.bdd.glueStyle}`,
    `- featurePaths: ${structure.structure.bdd.featurePaths.length}`,
    `- stepDefPaths: ${structure.structure.bdd.stepDefPaths.length}`,
    ``,
    `## Selector Strategy`,
    `- preferenceOrder: ${locatorStyle.preferenceOrder.join(" > ")}`,
    `- stableAttributeKeys: ${locatorStyle.orgConventions.stableAttributeKeys.join(", ") || "(none)"}`,
    `- heuristicHelpers: ${locatorStyle.orgConventions.customLocatorHelpers.join(", ") || "(none)"}`,
    `- discoveredLocatorWrappers: ${wrapperLocatorList.length}`,
    `- confidence: **${locatorStyle.confidence.toFixed(2)}**`,
    ``,
    `## Assertion Style`,
    `- primary: **${assertionStyle.primary}**`,
    `- discoveredAssertionWrappers: ${assertionWrappers.length}`,
    `- confidence: **${assertionStyle.confidence.toFixed(2)}**`,
    ``,
    `## Retry / Orchestration Signals`,
    wrappers?.retrySignals?.length ? `- signals: ${wrappers.retrySignals.length} (see wrapper-discovery.json)` : `- signals: (none)`,
    ``,
    `## Runtime Enforcement (Identity Lock)`,
    `- Runtime MUST load .mcp-contract/*.json before execution (Phase 2 integration).`,
    `- Healing/RCA MUST operate under contract preferenceOrder + discovered wrappers.`,
    `- Governance decides pass/fail; AI cannot override policy.`,
    ``,
    `## Uncertainties`,
    `- Wrapper discovery is best-effort static analysis (no AST yet).`,
    `- Page semantic cache is Phase 1.`,
    ``
  ].join("\n");

  writeText(repoRoot, `${contractDir}/automation-contract.md`, md);

  const written = [
    `${contractDir}/repo-topology.json`,
    `${contractDir}/framework-pattern.json`,
    `${contractDir}/selector-strategy.json`,
    `${contractDir}/assertion-style.json`,
    `${contractDir}/automation-contract.md`
  ];

  if (wrappers) written.push(`${contractDir}/wrapper-discovery.json`);

  return {
    written,
    contractSummary: {
      framework: framework.framework,
      style: structure.style,
      confidence: Math.min(framework.confidence, structure.confidence)
    }
  };
}
