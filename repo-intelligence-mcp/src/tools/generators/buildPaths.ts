import { toPosix } from "../../core/normalization.js";
import type { RepoTopologyJSON } from "../../types/topology.js";

export function buildPaths(params: { topology: RepoTopologyJSON; stylesDetected: string[] }): Record<string, unknown> {
  const { topology, stylesDetected } = params;

  // Extract detected paths from topology (deterministic)
  const detectedTests = extractDetectedPaths(topology, "tests");
  const detectedFeatures = extractDetectedPaths(topology, "features");
  const detectedPages = extractDetectedPaths(topology, "pageObjects");
  const detectedSteps = extractDetectedPaths(topology, "stepDefs");
  const detectedWrappers = extractDetectedPaths(topology, "wrappers");

  // Build style-aware entrypoints map (normalized + sorted)
  const styleEntrypoints: Record<string, { detected: string[]; fallback: string[] }> = {
    "style1-native": { detected: detectedTests, fallback: ["tests"] },
    "style2-bdd": { detected: detectedFeatures, fallback: ["features"] },
    "style3-pom-bdd": { detected: detectedTests, fallback: ["tests"] }
  };

  const entrypointsMap: Record<string, string[]> = {};
  for (const style of stylesDetected) {
    const config = styleEntrypoints[style] || { detected: detectedTests, fallback: ["tests"] };
    const paths = config.detected.length > 0 ? config.detected : config.fallback;

    entrypointsMap[style] = Array.from(new Set(paths.map(toPosix))).sort();
  }

  // Framework-specific config locations
  const configs: Record<string, string[]> = {
    playwright: [],
    cypress: [],
    selenium: []
  };

  for (const file of topology.files?.paths || []) {
    const posixPath = toPosix(file);
    if (posixPath.includes("playwright.config")) {
      configs.playwright.push(posixPath);
    } else if (posixPath.includes("cypress.config")) {
      configs.cypress.push(posixPath);
    }
  }

  configs.playwright = Array.from(new Set(configs.playwright)).sort();
  configs.cypress = Array.from(new Set(configs.cypress)).sort();
  configs.selenium = Array.from(new Set(configs.selenium)).sort();

  const normalizeAndSort = (arr: string[]) => Array.from(new Set(arr.map(toPosix))).sort();

  return {
    root: ".",
    contractDir: ".mcp-contract",
    cacheDir: ".mcp-cache",
    runsDir: "runs",

    entrypoints: entrypointsMap,

    pages: detectedPages.length > 0 ? detectedPages : normalizeAndSort(["src/pages", "pages", "tests/pages"]),

    steps: detectedSteps.length > 0 ? detectedSteps : normalizeAndSort(["features/step_definitions", "features/steps", "src/steps"]),

    wrappers: detectedWrappers.length > 0 ? detectedWrappers : normalizeAndSort(["src/support", "support", "src/utils", "utils"]),

    configs
  };
}

function extractDetectedPaths(topology: RepoTopologyJSON, category: "pageObjects" | "stepDefs" | "wrappers" | "tests" | "features"): string[] {
  const paths = new Set<string>();

  if (category === "features" && topology.files?.paths) {
    for (const file of topology.files.paths) {
      if (file.endsWith(".feature")) {
        const dir = file.substring(0, file.lastIndexOf("/"));
        if (dir) paths.add(dir);
      }
    }
  }

  if (category === "tests" && topology.testSurface?.candidateTestDirs) {
    for (const dir of topology.testSurface.candidateTestDirs) {
      paths.add(dir);
    }
  }

  if (category === "wrappers" && topology.testSurface?.candidateSupportDirs) {
    for (const dir of topology.testSurface.candidateSupportDirs) {
      paths.add(dir);
    }
  }

  // TODO(Phase 2+): Implement pageObjects and stepDefs categories based on signals

  return Array.from(paths)
    .map((p) => toPosix(p))
    .sort();
}
