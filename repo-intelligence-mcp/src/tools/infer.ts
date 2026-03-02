import type { RepoTopologyJSON, Signal } from "../types/topology.js";
import type {
  DetectFrameworkOutput,
  InferStructureOutput,
  DetectLocatorStyleOutput,
  DetectAssertionStyleOutput,
  Framework,
  Style
} from "../types/contract.js";

function uniqSorted(xs: string[]): string[] {
  return Array.from(new Set(xs)).sort((a, b) => a.localeCompare(b));
}

function signalsByType(topology: RepoTopologyJSON, type: string): Signal[] {
  return topology.signals.filter((s) => s.type === type).sort((a, b) => a.id.localeCompare(b.id));
}

type FrameworkScore = { fw: Framework; score: number; used: string[]; notes: string[] };

function scoreFramework(topology: RepoTopologyJSON): FrameworkScore[] {
  const used: Record<Exclude<Framework, "unknown">, string[]> = { cypress: [], playwright: [], selenium: [] };
  const notes: Record<Exclude<Framework, "unknown">, string[]> = { cypress: [], playwright: [], selenium: [] };

  const configs = topology.configFiles;

  // Config file strength
  for (const f of configs) {
    if (f.startsWith("cypress.config.")) {
      used.cypress.push(f);
      notes.cypress.push("Found cypress.config.*");
    }
    if (f.startsWith("playwright.config.")) {
      used.playwright.push(f);
      notes.playwright.push("Found playwright.config.*");
    }
  }

  // Dependency/code signals
  const fwSignals = signalsByType(topology, "framework-indicator");
  for (const s of fwSignals) {
    if (s.tags.includes("cypress")) used.cypress.push(s.id);
    if (s.tags.includes("playwright")) used.playwright.push(s.id);
    if (s.tags.includes("selenium")) used.selenium.push(s.id);
  }

  // Directory concentration hints
  const dirs = topology.directories;
  if (dirs.some((d) => d === "cypress" || d.startsWith("cypress/"))) {
    used.cypress.push("dir:cypress");
    notes.cypress.push("Found cypress/ directory");
  }
  if (dirs.some((d) => d === "playwright" || d.startsWith("playwright/"))) {
    used.playwright.push("dir:playwright");
    notes.playwright.push("Found playwright/ directory");
  }

  // Scores (deterministic weights)
  const scoreCypress =
    (configs.some((f) => f.startsWith("cypress.config.")) ? 5 : 0) +
    used.cypress.filter((x) => x.startsWith("dir:")).length * 2 +
    fwSignals.filter((s) => s.tags.includes("cypress")).length;

  const scorePlaywright =
    (configs.some((f) => f.startsWith("playwright.config.")) ? 5 : 0) +
    used.playwright.filter((x) => x.startsWith("dir:")).length * 2 +
    fwSignals.filter((s) => s.tags.includes("playwright")).length;

  const scoreSelenium = fwSignals.filter((s) => s.tags.includes("selenium")).length;

  const ranked: FrameworkScore[] = [
    { fw: "cypress", score: scoreCypress, used: uniqSorted(used.cypress), notes: uniqSorted(notes.cypress) },
    { fw: "playwright", score: scorePlaywright, used: uniqSorted(used.playwright), notes: uniqSorted(notes.playwright) },
    { fw: "selenium", score: scoreSelenium, used: uniqSorted(used.selenium), notes: uniqSorted(notes.selenium) }
  ];

  return ranked.sort((a, b) => (b.score - a.score) || a.fw.localeCompare(b.fw));
}

export function detectFramework(topology: RepoTopologyJSON): DetectFrameworkOutput {
  const ranked = scoreFramework(topology);
  const top = ranked[0];

  if (!top || top.score <= 0) {
    return { framework: "unknown", confidence: 0.2, signalsUsed: [], notes: ["No strong framework indicators found"] };
  }

  // Confidence is relative to runner-up
  const second = ranked[1];
  const margin = Math.max(0, top.score - (second?.score ?? 0));
  const confidence = Math.max(0.4, Math.min(0.95, 0.5 + margin * 0.1));

  const notes: string[] = [...top.notes];
  if (second && second.score > 0) {
    notes.push(`Also detected signals for ${second.fw} (score=${second.score})`);
  }

  return {
    framework: top.fw,
    confidence,
    signalsUsed: top.used,
    notes: uniqSorted(notes)
  };
}

export function inferStructure(topology: RepoTopologyJSON): InferStructureOutput {
  const bddSignals = topology.signals
    .filter((s) => s.tags.includes("bdd") || s.type === "bdd-indicator")
    .sort((a, b) => a.id.localeCompare(b.id));

  const pomSignals = topology.signals
    .filter((s) => s.tags.includes("pom") || s.type === "pom-indicator")
    .sort((a, b) => a.id.localeCompare(b.id));

  const featurePaths = uniqSorted(topology.files.paths.filter((p) => p.endsWith(".feature")));
  const stepDefPaths = uniqSorted(
    topology.files.paths.filter((p) => p.includes("step_definitions/") || p.includes("steps/"))
  );

  const bddPresent = featurePaths.length > 0 && (stepDefPaths.length > 0 || bddSignals.length > 0);

  const pomPaths = uniqSorted(
    topology.directories.filter(
      (d) => d.includes("pageObjects") || d.endsWith("/pages") || d === "pages" || d === "pageObjects"
    )
  );
  const pomPresent = pomPaths.length > 0 || pomSignals.length > 0;

  let style: Style = "native";
  if (bddPresent && pomPresent) style = "hybrid";
  else if (bddPresent) style = "bdd";
  else if (pomPresent) style = "pom";

  const confidence = Math.max(
    0.4,
    Math.min(0.95, 0.4 + (bddPresent ? 0.25 : 0) + (pomPresent ? 0.25 : 0) + (style === "hybrid" ? 0.05 : 0))
  );

  const glueStyle =
    topology.signals.some((s) => s.evidence.value.includes("cucumber") || s.evidence.value.includes("gherkin"))
      ? "cucumber"
      : bddPresent
        ? "custom"
        : "unknown";

  return {
    style,
    confidence,
    signalsUsed: uniqSorted([...bddSignals.map((s) => s.id), ...pomSignals.map((s) => s.id)]),
    structure: {
      pageObjects: {
        present: pomPresent,
        paths: pomPaths,
        pattern: "unknown"
      },
      bdd: {
        present: bddPresent,
        featurePaths,
        stepDefPaths,
        glueStyle
      }
    }
  };
}

type LocatorPref =
  | "data-testid"
  | "data-qa"
  | "data-cy"
  | "role"
  | "labelText"
  | "placeholder"
  | "css"
  | "xpath";

function pushIf(arr: LocatorPref[], cond: boolean, val: LocatorPref) {
  if (cond) arr.push(val);
}

export function detectLocatorStyle(topology: RepoTopologyJSON): DetectLocatorStyleOutput {
  const locatorSignals = signalsByType(topology, "locator-style");
  const ids = locatorSignals.map((s) => s.id);

  const hasTestId = locatorSignals.some((s) => s.evidence.value === "data-testid");
  const hasDataQa = locatorSignals.some((s) => s.evidence.value === "data-qa");
  const hasDataCy = locatorSignals.some((s) => s.evidence.value === "data-cy");
  const hasRole =
    topology.signals.some((s) => s.evidence.value.includes("getByRole(")) || topology.signals.some((s) => s.tags.includes("role"));

  const order: LocatorPref[] = [];
  pushIf(order, hasTestId, "data-testid");
  pushIf(order, hasDataQa, "data-qa");
  pushIf(order, hasDataCy, "data-cy");
  pushIf(order, hasRole, "role");
  order.push("labelText", "placeholder", "css", "xpath");

  const preferenceOrder: LocatorPref[] =
    order.length >= 5 ? order : ["data-testid", "data-qa", "data-cy", "role", "labelText", "placeholder", "css", "xpath"];

  const stableAttributeKeys = uniqSorted([
    ...(hasTestId ? ["data-testid"] : []),
    ...(hasDataQa ? ["data-qa"] : []),
    ...(hasDataCy ? ["data-cy"] : [])
  ]);

  const helpers = uniqSorted(
    topology.signals
      .filter((s) => s.type === "dsl-indicator")
      .map((s) => s.evidence.value)
  );

  const confidence = Math.max(
    0.35,
    Math.min(0.9, 0.35 + (locatorSignals.length > 0 ? 0.35 : 0) + (stableAttributeKeys.length > 0 ? 0.1 : 0))
  );

  return {
    preferenceOrder,
    confidence,
    signalsUsed: uniqSorted(ids),
    orgConventions: {
      stableAttributeKeys,
      customLocatorHelpers: helpers
    }
  };
}

export function detectAssertionStyle(topology: RepoTopologyJSON): DetectAssertionStyleOutput {
  const assertionSignals = signalsByType(topology, "assertion-indicator");
  const used = assertionSignals.map((s) => s.id);

  const hasShould = assertionSignals.some((s) => s.evidence.value === ".should(");
  const hasExpect = assertionSignals.some((s) => s.evidence.value === "expect(");

  let primary: DetectAssertionStyleOutput["primary"] = "unknown";
  if (hasShould && !hasExpect) primary = "should";
  else if (hasExpect && !hasShould) primary = "expect";
  else if (hasExpect && hasShould) primary = "expect"; // deterministic tie-break

  const confidence = Math.max(
    0.3,
    Math.min(0.85, 0.3 + (assertionSignals.length > 0 ? 0.35 : 0) + (primary !== "unknown" ? 0.1 : 0))
  );

  return {
    primary,
    confidence,
    wrappers: [],
    signalsUsed: uniqSorted(used)
  };
}
