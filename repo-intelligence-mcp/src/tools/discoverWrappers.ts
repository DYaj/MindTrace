import fs from "node:fs";
import path from "node:path";
import type { RepoTopologyJSON } from "../types/topology.js";
import type { DiscoveredWrapper, WrapperDiscoveryOutput, WrapperKind } from "../types/contract.js";

type Limits = {
  maxFiles: number;
  maxFileBytes: number;
};

const DEFAULT_LIMITS: Limits = {
  maxFiles: 800,
  maxFileBytes: 256 * 1024 // 256KB
};

function toPosix(p: string): string {
  return p.split(path.sep).join("/");
}

function uniqByKey<T>(items: T[], keyFn: (t: T) => string): T[] {
  const map = new Map<string, T>();
  for (const it of items) {
    const k = keyFn(it);
    if (!map.has(k)) map.set(k, it);
  }
  return Array.from(map.values());
}

function stableSort<T>(items: T[], keyFn: (t: T) => string): T[] {
  return [...items].sort((a, b) => keyFn(a).localeCompare(keyFn(b)));
}

function safeRead(absPath: string, maxBytes: number): { ok: true; text: string } | { ok: false; reason: string } {
  try {
    const st = fs.statSync(absPath);
    if (!st.isFile()) return { ok: false, reason: "NOT_A_FILE" };
    if (st.size > maxBytes) return { ok: false, reason: "FILE_TOO_LARGE" };
    const buf = fs.readFileSync(absPath);
    for (let i = 0; i < Math.min(buf.length, 4096); i++) if (buf[i] === 0) return { ok: false, reason: "BINARY" };
    return { ok: true, text: buf.toString("utf8") };
  } catch (e: any) {
    return { ok: false, reason: e?.message || "READ_ERROR" };
  }
}

function kindFromExt(relPath: string): WrapperKind {
  const ext = path.posix.extname(relPath).toLowerCase();
  if (ext === ".ts" || ext === ".tsx") return "ts-function";
  if (ext === ".js" || ext === ".jsx") return "js-function";
  return "unknown";
}

function shortEvidence(line: string, max = 140): string {
  const trimmed = line.trim().replace(/\s+/g, " ");
  return trimmed.length > max ? trimmed.slice(0, max - 1) + "…" : trimmed;
}

function extractByRegex(params: {
  category: DiscoveredWrapper["category"];
  relPath: string;
  kind: WrapperKind;
  text: string;
  regex: RegExp;
  nameGroup: number;
  confidence: number;
}): DiscoveredWrapper[] {
  const { category, relPath, kind, text, regex, nameGroup, confidence } = params;
  const out: DiscoveredWrapper[] = [];
  const lines = text.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(regex);
    if (!m) continue;
    const name = m[nameGroup];
    if (!name) continue;

    out.push({
      name,
      kind,
      category,
      path: relPath,
      evidence: shortEvidence(line),
      confidence
    });
  }

  return out;
}

export function discoverWrappers(params: {
  repoRoot: string;
  topology: RepoTopologyJSON;
  limits?: Partial<Limits>;
}): WrapperDiscoveryOutput {
  const repoRoot = path.resolve(params.repoRoot);
  const topology = params.topology;

  const limits: Limits = {
    maxFiles: params.limits?.maxFiles ?? DEFAULT_LIMITS.maxFiles,
    maxFileBytes: params.limits?.maxFileBytes ?? DEFAULT_LIMITS.maxFileBytes
  };

  const warnings: string[] = [];

  // Only scan likely source files, deterministically, capped.
  const candidates = topology.files.paths
    .filter((p) => {
      const ext = path.posix.extname(p).toLowerCase();
      if (![".ts", ".tsx", ".js", ".jsx"].includes(ext)) return false;

      // Focus areas where wrappers usually live (but still allow broader scan)
      if (
        p.includes("support/") ||
        p.includes("commands") ||
        p.includes("utils/") ||
        p.includes("helpers/") ||
        p.includes("shared/") ||
        p.includes("frameworks/") ||
        p.includes("prompts/") ||
        p.includes("SmartSelfHeal-mcp/")
      ) return true;

      // general allowance for small repos
      return true;
    })
    .sort((a, b) => a.localeCompare(b))
    .slice(0, limits.maxFiles);

  if (topology.files.paths.length > limits.maxFiles) {
    warnings.push(`WRAPPER_SCAN_FILE_CAP: scanned first ${limits.maxFiles} source files (deterministic order)`);
  }

  const locator: DiscoveredWrapper[] = [];
  const assertion: DiscoveredWrapper[] = [];
  const retry: DiscoveredWrapper[] = [];

  for (const rel of candidates) {
    const abs = path.join(repoRoot, rel);
    const read = safeRead(abs, limits.maxFileBytes);
    if (!read.ok) continue;

    const text = read.text;
    const kind = kindFromExt(rel);

    // --- Locator wrappers ---
    // Cypress custom command: Cypress.Commands.add('aiGet', ...)
    locator.push(
      ...extractByRegex({
        category: "locator",
        relPath: rel,
        kind: "cypress-command",
        text,
        regex: /Cypress\.Commands\.add\(\s*['"`]([A-Za-z0-9_$]+)['"`]\s*,/,
        nameGroup: 1,
        confidence: 0.9
      })
    );

    // Heuristic helper names: function aiGet(...) / export function aiGet(...) / const aiGet = (...) =>
    locator.push(
      ...extractByRegex({
        category: "locator",
        relPath: rel,
        kind,
        text,
        regex: /\bexport\s+function\s+([A-Za-z0-9_$]+)\s*\(/,
        nameGroup: 1,
        confidence: 0.55
      })
    );
    locator.push(
      ...extractByRegex({
        category: "locator",
        relPath: rel,
        kind,
        text,
        regex: /\bfunction\s+([A-Za-z0-9_$]+)\s*\(/,
        nameGroup: 1,
        confidence: 0.45
      })
    );
    locator.push(
      ...extractByRegex({
        category: "locator",
        relPath: rel,
        kind,
        text,
        regex: /\bconst\s+([A-Za-z0-9_$]+)\s*=\s*\([^)]*\)\s*=>/,
        nameGroup: 1,
        confidence: 0.45
      })
    );

    // --- Assertion wrappers ---
    // export function expectVisible(...) / assertText(...) etc.
    assertion.push(
      ...extractByRegex({
        category: "assertion",
        relPath: rel,
        kind,
        text,
        regex: /\bexport\s+function\s+(expect[A-Za-z0-9_$]+|assert[A-Za-z0-9_$]+)\s*\(/,
        nameGroup: 1,
        confidence: 0.7
      })
    );
    assertion.push(
      ...extractByRegex({
        category: "assertion",
        relPath: rel,
        kind,
        text,
        regex: /\bfunction\s+(expect[A-Za-z0-9_$]+|assert[A-Za-z0-9_$]+)\s*\(/,
        nameGroup: 1,
        confidence: 0.55
      })
    );

    // Cypress chainable assertions wrapper patterns (best-effort)
    if (text.includes(".should(") && (rel.includes("support") || rel.includes("utils") || rel.includes("helpers"))) {
      retry.push({
        name: "should-chain-pattern",
        kind: "unknown",
        category: "retry",
        path: rel,
        evidence: "Found .should( usage in support/utils scope",
        confidence: 0.35
      });
    }

    // --- Retry / orchestration signals ---
    // Playwright: test.describe.configure({ retries: N })
    if (text.match(/describe\.configure\(\s*\{\s*retries\s*:\s*\d+/)) {
      retry.push({
        name: "playwright-describe-configure-retries",
        kind,
        category: "retry",
        path: rel,
        evidence: "describe.configure({ retries: N })",
        confidence: 0.75
      });
    }

    // Playwright config: retries: N
    if (text.match(/\bretries\s*:\s*\d+/) && rel.includes("playwright.config")) {
      retry.push({
        name: "playwright-config-retries",
        kind,
        category: "retry",
        path: rel,
        evidence: "playwright.config.* contains retries: N",
        confidence: 0.8
      });
    }

    // Cypress retries plugins sometimes show up as "retries" in config or code
    if (rel.includes("cypress.config") && text.match(/\bretries\b/)) {
      retry.push({
        name: "cypress-config-retries-signal",
        kind,
        category: "retry",
        path: rel,
        evidence: "cypress.config.* contains 'retries'",
        confidence: 0.55
      });
    }
  }

  // De-noise: wrappers should not explode.
  // Keep high-confidence Cypress.Commands.add always; for function/const patterns, keep only those that look like wrappers.
  const locatorFiltered = locator.filter((w) => {
    if (w.kind === "cypress-command") return true;
    // keep if name looks like locator helper
    return /^(ai|mt|mind|smart|get|find|locate)/i.test(w.name);
  });

  const assertionFiltered = assertion.filter((w) => /^(expect|assert)/i.test(w.name));

  const locatorFinal = stableSort(uniqByKey(locatorFiltered, (w) => `${w.category}|${w.kind}|${w.name}|${w.path}`), (w) => `${w.name}|${w.path}`);
  const assertionFinal = stableSort(uniqByKey(assertionFiltered, (w) => `${w.category}|${w.kind}|${w.name}|${w.path}`), (w) => `${w.name}|${w.path}`);
  const retryFinal = stableSort(uniqByKey(retry, (w) => `${w.name}|${w.path}`), (w) => `${w.name}|${w.path}`);

  return {
    toolVersion: "0.1.0",
    discoveredAt: new Date().toISOString(),
    repoRoot,
    locatorWrappers: locatorFinal,
    assertionWrappers: assertionFinal,
    retrySignals: retryFinal,
    warnings
  };
}
