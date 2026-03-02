import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import fg from "fast-glob";
import type { RepoTopologyJSON, ScanRepoInput, Signal } from "../types/topology.js";

const DEFAULT_IGNORE_DIRS = [
  "node_modules",
  ".git",
  "dist",
  "build",
  "out",
  ".next",
  "coverage",
  "playwright-report",
  "test-results",
  "runs",
  "history"
];

const DEFAULT_IGNORE_GLOBS = [
  "**/*.png",
  "**/*.jpg",
  "**/*.jpeg",
  "**/*.webp",
  "**/*.gif",
  "**/*.zip",
  "**/*.tar",
  "**/*.gz",
  "**/*.mp4",
  "**/*.mov",
  "**/*.pdf"
];

const DEFAULT_LIMITS = {
  maxFiles: 20000,
  maxFileBytes: 1024 * 1024, // 1MB
  maxSampleFilesPerCategory: 50
};

function sha1(input: string): string {
  return crypto.createHash("sha1").update(input).digest("hex");
}

function toPosix(p: string): string {
  return p.split(path.sep).join("/");
}

function safeReadUtf8(absPath: string, maxBytes: number): { ok: true; text: string } | { ok: false; reason: string } {
  try {
    const st = fs.statSync(absPath);
    if (!st.isFile()) return { ok: false, reason: "NOT_A_FILE" };
    if (st.size > maxBytes) return { ok: false, reason: "FILE_TOO_LARGE" };
    const buf = fs.readFileSync(absPath);
    // binary guard: if any NUL in first chunk, treat as binary
    for (let i = 0; i < Math.min(buf.length, 4096); i++) if (buf[i] === 0) return { ok: false, reason: "BINARY_OR_UNSUPPORTED_ENCODING" };
    return { ok: true, text: buf.toString("utf8") };
  } catch (e: any) {
    return { ok: false, reason: e?.message || "READ_ERROR" };
  }
}

function detectLanguage(relPath: string): string {
  const ext = path.extname(relPath).toLowerCase();
  if (ext === ".ts") return "ts";
  if (ext === ".tsx") return "tsx";
  if (ext === ".js") return "js";
  if (ext === ".jsx") return "jsx";
  if (ext === ".py") return "py";
  if (ext === ".java") return "java";
  if (ext === ".cs") return "cs";
  if (ext === ".rb") return "rb";
  if (ext === ".go") return "go";
  return "other";
}

function mkSignal(type: string, relPath: string, kind: string, value: string, confidence: number, tags: string[]): Signal {
  const id = sha1([type, relPath, kind, value].join("|"));
  return {
    id,
    type,
    path: relPath,
    evidence: { kind, value },
    confidence,
    tags: [...tags].sort((a, b) => a.localeCompare(b))
  };
}

function addSignalUnique(map: Map<string, Signal>, sig: Signal) {
  if (!map.has(sig.id)) map.set(sig.id, sig);
}

function matchesAny(haystack: string, needles: string[]): boolean {
  for (const n of needles) if (haystack.includes(n)) return true;
  return false;
}

export async function scanRepo(input: ScanRepoInput): Promise<RepoTopologyJSON> {
  const rootPath = String(input?.rootPath || "");
  if (!rootPath) throw new Error("INVALID_ROOT_PATH: missing rootPath");

  const ignoreDirs = (input.ignore?.dirs?.length ? input.ignore?.dirs : DEFAULT_IGNORE_DIRS) ?? DEFAULT_IGNORE_DIRS;
  const ignoreGlobs = (input.ignore?.globs?.length ? input.ignore?.globs : DEFAULT_IGNORE_GLOBS) ?? DEFAULT_IGNORE_GLOBS;
  const limits = {
    maxFiles: input.limits?.maxFiles ?? DEFAULT_LIMITS.maxFiles,
    maxFileBytes: input.limits?.maxFileBytes ?? DEFAULT_LIMITS.maxFileBytes,
    maxSampleFilesPerCategory: input.limits?.maxSampleFilesPerCategory ?? DEFAULT_LIMITS.maxSampleFilesPerCategory
  };

  const resolvedRoot = path.resolve(rootPath);
  if (!fs.existsSync(resolvedRoot)) throw new Error("INVALID_ROOT_PATH: does not exist");
  if (!fs.statSync(resolvedRoot).isDirectory()) throw new Error("INVALID_ROOT_PATH: not a directory");

  const ignore = [
    ...ignoreDirs.map((d) => `${toPosix(d).replace(/\/+$/g, "")}/**`),
    ...ignoreGlobs.map(toPosix)
  ];

  const filesAll = await fg(["**/*"], {
    cwd: resolvedRoot,
    dot: false,
    onlyFiles: true,
    unique: true,
    ignore
  });

  const warnings: string[] = [];

  const files = filesAll
    .map(toPosix)
    .sort((a, b) => a.localeCompare(b));

  const truncatedFiles = files.length > limits.maxFiles ? files.slice(0, limits.maxFiles) : files;
  if (files.length > limits.maxFiles) warnings.push(`REPO_TOO_LARGE_LIMIT_HIT: truncated files from ${files.length} to ${limits.maxFiles}`);

  const directories = Array.from(new Set(truncatedFiles.map((p) => toPosix(path.posix.dirname(p)))))
    .filter((d) => d !== "." && d !== "")
    .sort((a, b) => a.localeCompare(b));

  const languageStats: Record<string, number> = {
    ts: 0, tsx: 0, js: 0, jsx: 0,
    py: 0, java: 0, cs: 0, rb: 0, go: 0,
    other: 0
  };

  for (const f of truncatedFiles) {
    const k = detectLanguage(f);
    languageStats[k] = (languageStats[k] ?? 0) + 1;
  }

  const configFiles = truncatedFiles
    .filter((f) => {
      const base = path.posix.basename(f);
      if (base === "package.json") return true;
      if (base === "pnpm-lock.yaml" || base === "yarn.lock" || base === "package-lock.json") return true;
      if (base === "pyproject.toml" || base === "poetry.lock") return true;
      if (base === "tsconfig.json") return true;
      if (base.startsWith("cypress.config.")) return true;
      if (base.startsWith("playwright.config.")) return true;
      return false;
    })
    .sort((a, b) => a.localeCompare(b));

  const nodePackageJson = truncatedFiles.includes("package.json") ? "package.json" : null;
  const nodeLockfiles = ["pnpm-lock.yaml", "yarn.lock", "package-lock.json"].filter((f) => truncatedFiles.includes(f)).sort();
  const pyprojectToml = truncatedFiles.includes("pyproject.toml") ? "pyproject.toml" : null;
  const poetryLock = truncatedFiles.includes("poetry.lock") ? "poetry.lock" : null;
  const requirementsTxt = truncatedFiles.filter((f) => path.posix.basename(f) === "requirements.txt").sort((a, b) => a.localeCompare(b));

  const testSurface = {
    candidateTestDirs: ["cypress", "tests", "test", "e2e", "spec", "playwright"].sort((a, b) => a.localeCompare(b)),
    candidateSupportDirs: ["support", "fixtures", "pages", "pageObjects", "steps", "step_definitions", "utils", "helpers"].sort((a, b) => a.localeCompare(b))
  };

  const signalMap = new Map<string, Signal>();

  // filename/path signals
  for (const f of truncatedFiles) {
    const base = path.posix.basename(f);
    if (base.startsWith("cypress.config.")) addSignalUnique(signalMap, mkSignal("framework-indicator", f, "filename", base, 0.95, ["framework", "cypress"]));
    if (base.startsWith("playwright.config.")) addSignalUnique(signalMap, mkSignal("framework-indicator", f, "filename", base, 0.95, ["framework", "playwright"]));
    if (base.endsWith(".feature")) addSignalUnique(signalMap, mkSignal("bdd-indicator", f, "filename", base, 0.9, ["style", "bdd"]));
    if (f.includes("step_definitions/") || f.includes("steps/")) addSignalUnique(signalMap, mkSignal("steps-indicator", f, "path", "steps", 0.75, ["style", "bdd"]));
    if (f.includes("pageObjects/") || f.includes("pages/")) addSignalUnique(signalMap, mkSignal("pom-indicator", f, "path", "pages", 0.65, ["style", "pom"]));
  }

  // content signals - deterministic sampling
  const sampleCandidates = truncatedFiles.filter((f) => {
    const ext = path.posix.extname(f).toLowerCase();
    if (f === "package.json") return true;
    return [".ts", ".tsx", ".js", ".jsx", ".json", ".feature"].includes(ext);
  });

  const sampleFiles = sampleCandidates
    .sort((a, b) => a.localeCompare(b))
    .slice(0, 400); // deterministic cap

  const NEEDLES = [
    "cy.get(",
    "Cypress.Commands.add",
    "@playwright/test",
    "test.describe",
    "page.locator(",
    "getByRole(",
    "data-testid",
    "data-qa",
    "data-cy",
    "aria-label",
    "cucumber",
    "gherkin",
    "@badeball/cypress-cucumber-preprocessor"
  ];

  for (const rel of sampleFiles) {
    const abs = path.join(resolvedRoot, rel);
    const read = safeReadUtf8(abs, limits.maxFileBytes);
    if (!read.ok) continue;

    const text = read.text;

    if (rel.endsWith("package.json")) {
      if (text.includes("cypress")) addSignalUnique(signalMap, mkSignal("framework-indicator", rel, "json-key", "cypress", 0.9, ["framework", "cypress"]));
      if (text.includes("@playwright/test")) addSignalUnique(signalMap, mkSignal("framework-indicator", rel, "json-key", "@playwright/test", 0.9, ["framework", "playwright"]));
      if (text.includes("selenium")) addSignalUnique(signalMap, mkSignal("framework-indicator", rel, "json-key", "selenium", 0.7, ["framework", "selenium"]));
      if (text.includes("cucumber") || text.includes("gherkin") || text.includes("@badeball/cypress-cucumber-preprocessor")) {
        addSignalUnique(signalMap, mkSignal("bdd-indicator", rel, "json-key", "cucumber/gherkin", 0.85, ["style", "bdd"]));
      }
      continue;
    }

    if (!matchesAny(text, NEEDLES)) continue;

    if (text.includes("cy.get(")) addSignalUnique(signalMap, mkSignal("framework-indicator", rel, "regex-hit", "cy.get(", 0.8, ["framework", "cypress"]));
    if (text.includes("Cypress.Commands.add")) addSignalUnique(signalMap, mkSignal("dsl-indicator", rel, "regex-hit", "Cypress.Commands.add", 0.8, ["dsl", "cypress"]));

    if (text.includes("@playwright/test")) addSignalUnique(signalMap, mkSignal("framework-indicator", rel, "import", "@playwright/test", 0.85, ["framework", "playwright"]));
    if (text.includes("page.locator(")) addSignalUnique(signalMap, mkSignal("locator-indicator", rel, "regex-hit", "page.locator(", 0.7, ["locator", "playwright"]));
    if (text.includes("getByRole(")) addSignalUnique(signalMap, mkSignal("locator-indicator", rel, "regex-hit", "getByRole(", 0.7, ["locator", "role"]));

    if (text.includes("data-testid")) addSignalUnique(signalMap, mkSignal("locator-style", rel, "regex-hit", "data-testid", 0.75, ["locator", "testid"]));
    if (text.includes("data-qa")) addSignalUnique(signalMap, mkSignal("locator-style", rel, "regex-hit", "data-qa", 0.7, ["locator", "qa"]));
    if (text.includes("data-cy")) addSignalUnique(signalMap, mkSignal("locator-style", rel, "regex-hit", "data-cy", 0.7, ["locator", "cy"]));
    if (text.includes("aria-label")) addSignalUnique(signalMap, mkSignal("locator-style", rel, "regex-hit", "aria-label", 0.65, ["locator", "aria"]));

    if (text.includes("expect(")) addSignalUnique(signalMap, mkSignal("assertion-indicator", rel, "regex-hit", "expect(", 0.65, ["assertion"]));
    if (text.includes(".should(")) addSignalUnique(signalMap, mkSignal("assertion-indicator", rel, "regex-hit", ".should(", 0.65, ["assertion", "cypress"]));

    if (text.includes("cucumber") || text.includes("gherkin") || text.includes("@badeball/cypress-cucumber-preprocessor")) {
      addSignalUnique(signalMap, mkSignal("bdd-indicator", rel, "regex-hit", "cucumber/gherkin", 0.7, ["style", "bdd"]));
    }
  }

  const signals = Array.from(signalMap.values()).sort((a, b) => a.id.localeCompare(b.id));

  return {
    toolVersion: "0.1.0",
    scannedAt: new Date().toISOString(),
    repoRoot: resolvedRoot,
    files: { count: truncatedFiles.length, paths: truncatedFiles },
    directories,
    packageManagers: {
      node: { packageJson: nodePackageJson, lockfiles: nodeLockfiles },
      python: { pyprojectToml, poetryLock, requirementsTxt }
    },
    languageStats,
    configFiles,
    testSurface,
    signals,
    warnings
  };
}
