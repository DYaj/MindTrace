import fs from "node:fs";
import path from "node:path";
import type { RepoTopologyJSON } from "../types/topology.js";
import type { PageCacheIndex, PageCacheSummary, PageSemanticCacheEntry } from "../types/pageCache.js";

type Limits = {
  maxPageFiles: number;
  maxFileBytes: number;
  maxTestFiles: number;
};

const DEFAULT_LIMITS: Limits = {
  maxPageFiles: 200,
  maxFileBytes: 256 * 1024,
  maxTestFiles: 400
};

function toPosix(p: string): string {
  return p.split(path.sep).join("/");
}

function uniqSorted(xs: string[]): string[] {
  return Array.from(new Set(xs)).sort((a, b) => a.localeCompare(b));
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

function slugFromPath(relPosix: string): string {
  const noExt = relPosix.replace(/\.[^.]+$/, "");
  return noExt.replace(/[\/]/g, "__").replace(/[^A-Za-z0-9_\-]+/g, "_");
}

function inferredNameFromPath(relPosix: string): string {
  const base = relPosix.split("/").pop() || relPosix;
  return base.replace(/\.[^.]+$/, "");
}

function shortEvidence(s: string, max = 140): string {
  const t = s.trim().replace(/\s+/g, " ");
  return t.length > max ? t.slice(0, max - 1) + "…" : t;
}

function extractAll(text: string, regex: RegExp, group = 1): Array<{ value: string; evidence: string }> {
  const out: Array<{ value: string; evidence: string }> = [];
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    let m: RegExpExecArray | null;
    const r = new RegExp(regex.source, regex.flags.includes("g") ? regex.flags : regex.flags + "g");
    while ((m = r.exec(line)) !== null) {
      const v = m[group];
      if (v) out.push({ value: v, evidence: shortEvidence(line) });
    }
  }
  return out;
}

function writeJson(root: string, rel: string, obj: any) {
  const abs = path.join(root, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, JSON.stringify(obj, null, 2));
}

function isExcluded(relPosix: string): boolean {
  const lower = relPosix.toLowerCase();
  return (
    lower.includes("node_modules/") ||
    lower.includes("repo-intelligence-mcp/") ||
    lower.includes("/dist/") ||
    lower.startsWith("dist/") ||
    lower.includes(".mcp-cache/") ||
    lower.includes(".mcp-contract/") ||
    lower.includes("runs/") ||
    lower.includes("history/") ||
    lower.includes("test-results/")
  );
}

function isLikelyPageFile(relPosix: string): boolean {
  const ext = path.posix.extname(relPosix).toLowerCase();
  if (![".ts", ".tsx", ".js", ".jsx"].includes(ext)) return false;

  const lower = relPosix.toLowerCase();

  if (
    lower.includes("/pages/") ||
    lower.includes("/pageobjects/") ||
    lower.startsWith("pages/") ||
    lower.startsWith("pageobjects/")
  ) return true;

  const base = (relPosix.split("/").pop() || "").toLowerCase();
  if (base.includes("page") || base.includes("screen") || base.includes("view")) return true;

  return false;
}

type FrameworkPattern = {
  detectedPaths?: {
    tests?: string[];
    pages?: string[];
    steps?: string[];
    support?: string[];
  };
};

function tryReadFrameworkPattern(repoRoot: string): { json?: FrameworkPattern; ok: boolean; warning?: string } {
  const fp = path.join(repoRoot, ".mcp-contract", "framework-pattern.json");
  try {
    const raw = fs.readFileSync(fp, "utf8");
    const json = JSON.parse(raw) as FrameworkPattern;
    return { json, ok: true };
  } catch (e: any) {
    return { ok: false, warning: `NO_FRAMEWORK_PATTERN: ${e?.message || e}` };
  }
}

function isUnderAnyRoot(relPosix: string, roots: string[]): boolean {
  if (!roots.length) return false;
  return roots.some((r) => relPosix === r || relPosix.startsWith(r.endsWith("/") ? r : r + "/"));
}

type WrapperNames = {
  locator: string[];
  assertion: string[];
  retry: string[];
  ok: boolean;
  warning?: string;
};

function normalizeWrapperNames(names: string[]): string[] {
  const out: string[] = [];
  for (const n of names) {
    const s = String(n || "").trim();
    if (!s) continue;
    out.push(s);
    if (s.includes(".")) {
      const last = s.split(".").pop()!.trim();
      if (last) out.push(last);
    }
  }
  return uniqSorted(out);
}

function tryReadWrapperDiscovery(repoRoot: string): WrapperNames {
  const fp = path.join(repoRoot, ".mcp-contract", "wrapper-discovery.json");
  try {
    const raw = fs.readFileSync(fp, "utf8");
    const json = JSON.parse(raw);

    const locatorRaw = Array.isArray(json?.locatorWrappers) ? json.locatorWrappers.map((x: any) => String(x?.name)).filter(Boolean) : [];
    const assertionRaw = Array.isArray(json?.assertionWrappers) ? json.assertionWrappers.map((x: any) => String(x?.name)).filter(Boolean) : [];
    const retryRaw = Array.isArray(json?.retrySignals) ? json.retrySignals.map((x: any) => String(x?.name)).filter(Boolean) : [];

    const locator = normalizeWrapperNames(locatorRaw);
    const assertion = normalizeWrapperNames(assertionRaw);
    const retry = normalizeWrapperNames(retryRaw);

    return { locator, assertion, retry, ok: true };
  } catch (e: any) {
    return { locator: [], assertion: [], retry: [], ok: false, warning: `NO_WRAPPER_DISCOVERY: ${e?.message || e}` };
  }
}

function isHumanLabel(s: string): boolean {
  const t = s.trim();
  if (!t) return false;
  if (t.length < 2) return false;
  if (t.length > 140) return false;
  if (t.startsWith("#") || t.startsWith(".") || t.includes("/") || t.includes("=>")) return false;
  if (!/[A-Za-z]/.test(t)) return false;
  return true;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractWrapperCalls(text: string, wrapperNames: string[]): Array<{ wrapper: string; arg: string; evidence: string }> {
  const out: Array<{ wrapper: string; arg: string; evidence: string }> = [];
  if (!wrapperNames.length) return out;

  const wrappers = [...wrapperNames].sort((a, b) => a.localeCompare(b)).slice(0, 120);

  for (const name of wrappers) {
    const n = escapeRegExp(name);
    const rx = new RegExp(
      String.raw`(?:\b[A-Za-z_\$][A-Za-z0-9_\$]*\.)*\b${n}\s*\(\s*(['"\`])([^'"\\\`]{1,200})\1`,
      "g"
    );

    let m: RegExpExecArray | null;
    while ((m = rx.exec(text)) !== null) {
      const arg = m[2];
      if (!arg) continue;

      const start = Math.max(0, m.index - 60);
      const end = Math.min(text.length, m.index + 180);
      const snippet = shortEvidence(text.slice(start, end));

      out.push({ wrapper: name, arg, evidence: snippet });
      if (out.length >= 200) return out;
    }
  }

  return out;
}

function extractGenericTargets(text: string) {
  const routesRaw = extractAll(text, /['"`](\/[A-Za-z0-9_\-\/:\.\?\#=]+)['"`]/g, 1);
  const labelsByText = extractAll(text, /getByText\(\s*['"`]([^'"`]+)['"`]/g, 1);
  const labelsContains = extractAll(text, /\.contains\(\s*['"`]([^'"`]+)['"`]/g, 1);
  const labelsFindByText = extractAll(text, /findByText\(\s*['"`]([^'"`]+)['"`]/g, 1);

  return {
    routes: uniqSorted(routesRaw.map((x) => x.value)),
    labels: uniqSorted([...labelsByText, ...labelsContains, ...labelsFindByText].map((x) => x.value).filter(isHumanLabel))
  };
}

function extractImportedPageHints(text: string): string[] {
  const imports = extractAll(text, /from\s*['"`]([^'"`]+)['"`]/g, 1).map((x) => x.value);
  const hints: string[] = [];
  for (const p of imports) {
    const base = p.split("/").pop() || "";
    if (!base) continue;
    if (base.toLowerCase().includes("page")) hints.push(base.replace(/\.[^.]+$/, ""));
  }
  return uniqSorted(hints);
}

export function buildPageSemanticCache(params: {
  repoRoot: string;
  topology: RepoTopologyJSON;
  limits?: Partial<Limits>;
}): { index: PageCacheIndex; summary: PageCacheSummary; pages: PageSemanticCacheEntry[]; written: string[] } {
  const repoRoot = path.resolve(params.repoRoot);
  const topology = params.topology;

  const limits: Limits = {
    maxPageFiles: params.limits?.maxPageFiles ?? DEFAULT_LIMITS.maxPageFiles,
    maxFileBytes: params.limits?.maxFileBytes ?? DEFAULT_LIMITS.maxFileBytes,
    maxTestFiles: params.limits?.maxTestFiles ?? DEFAULT_LIMITS.maxTestFiles
  };

  const warnings: string[] = [];

  const fp = tryReadFrameworkPattern(repoRoot);
  if (!fp.ok && fp.warning) warnings.push(fp.warning);

  const pageRoots = uniqSorted((fp.json?.detectedPaths?.pages || []).map(String).map((p) => p.replace(/^\.\//, "")));
  const testRoots = uniqSorted((fp.json?.detectedPaths?.tests || []).map(String).map((p) => p.replace(/^\.\//, "")));
  const stepRoots = uniqSorted((fp.json?.detectedPaths?.steps || []).map(String).map((p) => p.replace(/^\.\//, "")));

  if (pageRoots.length) warnings.push(`PAGE_CACHE_SCOPED_TO_CONTRACT: pageRoots=${pageRoots.join(",")}`);
  if (testRoots.length) warnings.push(`PAGE_CACHE_ENRICH_FROM_TESTS: testRoots=${testRoots.join(",")}`);
  if (stepRoots.length) warnings.push(`PAGE_CACHE_ENRICH_FROM_STEPS: stepRoots=${stepRoots.join(",")}`);

  const wrapperNames = tryReadWrapperDiscovery(repoRoot);
  if (!wrapperNames.ok && wrapperNames.warning) warnings.push(wrapperNames.warning);
  if (wrapperNames.ok) warnings.push(`PAGE_CACHE_WRAPPER_ENRICHMENT: locator=${wrapperNames.locator.length}, assertion=${wrapperNames.assertion.length}`);

  // 1) Build base page cache from page files
  const pageCandidatesAll = topology.files.paths
    .map(toPosix)
    .filter((p) => isLikelyPageFile(p))
    .filter((p) => !isExcluded(p))
    .filter((p) => (pageRoots.length ? isUnderAnyRoot(p, pageRoots) : true))
    .sort((a, b) => a.localeCompare(b));

  const pageCandidates = pageCandidatesAll.slice(0, limits.maxPageFiles);
  if (pageCandidatesAll.length > limits.maxPageFiles) warnings.push(`PAGE_CACHE_PAGE_FILE_CAP: scanned first ${limits.maxPageFiles} page files`);

  const pages: PageSemanticCacheEntry[] = [];

  for (const relPosix of pageCandidates) {
    const abs = path.join(repoRoot, relPosix);
    const read = safeRead(abs, limits.maxFileBytes);
    if (!read.ok) continue;

    const text = read.text;

    const routesRaw = extractAll(text, /['"`](\/[A-Za-z0-9_\-\/:\.\?\#=]+)['"`]/g, 1);
    const testIds = extractAll(text, /data-testid\s*=\s*['"`]([^'"`]+)['"`]/g, 1);
    const dataQa = extractAll(text, /data-qa\s*=\s*['"`]([^'"`]+)['"`]/g, 1);
    const dataCy = extractAll(text, /data-cy\s*=\s*['"`]([^'"`]+)['"`]/g, 1);
    const rolesRaw = extractAll(text, /getByRole\(\s*['"`]([A-Za-z0-9_\-]+)['"`]/g, 1);

    const labelsByLabel = extractAll(text, /getByLabel\(\s*['"`]([^'"`]+)['"`]/g, 1);
    const labelsByText = extractAll(text, /getByText\(\s*['"`]([^'"`]+)['"`]/g, 1);
    const labelsContains = extractAll(text, /\.contains\(\s*['"`]([^'"`]+)['"`]/g, 1);
    const labelsFindByText = extractAll(text, /findByText\(\s*['"`]([^'"`]+)['"`]/g, 1);
    const placeholdersRaw = extractAll(text, /getByPlaceholder\(\s*['"`]([^'"`]+)['"`]/g, 1);

    const anchorsId = extractAll(text, /['"`](#[A-Za-z0-9_\-:]+)['"`]/g, 1);
    const anchorsClass = extractAll(text, /['"`](\.[A-Za-z0-9_\-:]+)['"`]/g, 1);
    const anchorsForm = extractAll(text, /['"`](form#[A-Za-z0-9_\-:]+)['"`]/g, 1);
    const anchorsAttr = extractAll(text, /\[\s*data-testid\s*=\s*['"`]([^'"`]+)['"`]\s*\]/g, 1);

    const routes = uniqSorted(routesRaw.map((x) => x.value));
    const stableIds = uniqSorted([...testIds, ...dataQa, ...dataCy].map((x) => x.value));
    const roles = uniqSorted(rolesRaw.map((x) => x.value));
    const labels = uniqSorted([...labelsByLabel, ...labelsByText, ...labelsContains, ...labelsFindByText].map((x) => x.value).filter(isHumanLabel));
    const placeholders = uniqSorted(placeholdersRaw.map((x) => x.value));
    const anchors = uniqSorted([
      ...anchorsId.map((x) => x.value),
      ...anchorsClass.map((x) => x.value),
      ...anchorsForm.map((x) => x.value),
      ...anchorsAttr.map((x) => `[data-testid="${x.value}"]`)
    ]);

    const interactionTargets: PageSemanticCacheEntry["interactionTargets"] = [];

    for (const x of stableIds.slice(0, 50)) interactionTargets.push({ kind: "locator", value: x, evidence: "stableId", confidence: 0.85 });
    for (const x of anchors.slice(0, 80)) interactionTargets.push({ kind: "locator", value: x, evidence: "anchorLiteral", confidence: 0.62 }); // ✅ Phase 1.2.1
    for (const x of roles.slice(0, 50)) interactionTargets.push({ kind: "role", value: x, evidence: "getByRole()", confidence: 0.75 });
    for (const x of labels.slice(0, 80)) interactionTargets.push({ kind: "text", value: x, evidence: "text/label literal", confidence: 0.55 });
    for (const x of placeholders.slice(0, 80)) interactionTargets.push({ kind: "placeholder", value: x, evidence: "getByPlaceholder()", confidence: 0.6 });

    const pageId = slugFromPath(relPosix);

    const signalCount =
      (routes.length > 0 ? 1 : 0) +
      (stableIds.length > 0 ? 2 : 0) +
      (roles.length > 0 ? 1 : 0) +
      (labels.length > 0 ? 1 : 0) +
      (placeholders.length > 0 ? 1 : 0) +
      (anchors.length > 0 ? 1 : 0);

    const confidence = Math.max(0.25, Math.min(0.95, 0.25 + signalCount * 0.12));

    pages.push({
      cacheVersion: "0.1.0",
      pageId,
      sourcePath: relPosix,
      inferredName: inferredNameFromPath(relPosix),
      routes,
      stableIds,
      roles,
      labels,
      placeholders,
      anchors,
      interactionTargets,
      confidence,
      warnings: []
    });
  }

  // Build maps for enrichment linking (kept for later phases)
  const routeToPageId = new Map<string, string>();
  const nameToPageId = new Map<string, string>();
  for (const p of pages) {
    for (const r of p.routes) if (!routeToPageId.has(r)) routeToPageId.set(r, p.pageId);
    nameToPageId.set(p.inferredName.toLowerCase(), p.pageId);
  }

  // 2) (Reserved) Enrich from tests + steps (kept deterministic; currently no-op if no detected paths)
  const harvestRoots = uniqSorted([...testRoots, ...stepRoots]).filter(Boolean);
  const testLike = topology.files.paths
    .map(toPosix)
    .filter((p) => !isExcluded(p))
    .filter((p) => {
      const ext = path.posix.extname(p).toLowerCase();
      if (![".ts", ".tsx", ".js", ".jsx"].includes(ext)) return false;
      if (!harvestRoots.length) return false;
      return isUnderAnyRoot(p, harvestRoots);
    })
    .sort((a, b) => a.localeCompare(b))
    .slice(0, limits.maxTestFiles);

  if (harvestRoots.length && testLike.length >= limits.maxTestFiles) warnings.push(`PAGE_CACHE_TEST_FILE_CAP: scanned first ${limits.maxTestFiles} test/step files`);

  let harvestedTargets = 0;

  for (const relPosix of testLike) {
    const abs = path.join(repoRoot, relPosix);
    const read = safeRead(abs, limits.maxFileBytes);
    if (!read.ok) continue;

    const text = read.text;

    const wrapperCalls = extractWrapperCalls(text, wrapperNames.locator);
    const generic = extractGenericTargets(text);
    const importHints = extractImportedPageHints(text);

    let pageId: string | undefined;

    for (const r of generic.routes) {
      const hit = routeToPageId.get(r);
      if (hit) { pageId = hit; break; }
    }

    if (!pageId && importHints.length) {
      for (const h of importHints) {
        const hit = nameToPageId.get(h.toLowerCase());
        if (hit) { pageId = hit; break; }
      }
    }

    if (!pageId) continue;

    const page = pages.find((p) => p.pageId === pageId);
    if (!page) continue;

    for (const c of wrapperCalls.slice(0, 80)) {
      page.interactionTargets.push({
        kind: isHumanLabel(c.arg) ? "text" : "locator",
        value: c.arg,
        evidence: `wrapperCall:${c.wrapper}@${relPosix}`,
        confidence: 0.68
      });
      harvestedTargets++;
    }

    for (const l of generic.labels.slice(0, 50)) {
      page.labels.push(l);
      page.interactionTargets.push({
        kind: "text",
        value: l,
        evidence: `testText@${relPosix}`,
        confidence: 0.52
      });
      harvestedTargets++;
    }

    for (const r of generic.routes.slice(0, 20)) {
      if (!page.routes.includes(r)) page.routes.push(r);
    }

    page.labels = uniqSorted(page.labels);
    page.routes = uniqSorted(page.routes);

    const seen = new Set<string>();
    page.interactionTargets = page.interactionTargets
      .map((t) => ({ ...t, value: String(t.value).trim() }))
      .filter((t) => t.value.length > 0)
      .filter((t) => {
        const k = `${t.kind}::${t.value}::${t.evidence}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
  }

  if (harvestRoots.length) warnings.push(`PAGE_CACHE_HARVESTED_TARGETS: ${harvestedTargets}`);

  const cacheRoot = ".mcp-cache/pages";
  const written: string[] = [];

  for (const p of pages) {
    const rel = `${cacheRoot}/${p.pageId}.json`;
    writeJson(repoRoot, rel, p);
    written.push(rel);
  }

  const index: PageCacheIndex = {
    cacheVersion: "0.1.0",
    generatedAt: new Date().toISOString(),
    repoRoot,
    pages: pages
      .map((p) => ({ pageId: p.pageId, sourcePath: p.sourcePath, inferredName: p.inferredName, confidence: p.confidence }))
      .sort((a, b) => (b.confidence - a.confidence) || a.pageId.localeCompare(b.pageId))
  };

  writeJson(repoRoot, `${cacheRoot}/index.json`, index);
  written.push(`${cacheRoot}/index.json`);

  const summary: PageCacheSummary = {
    cacheVersion: "0.1.0",
    generatedAt: new Date().toISOString(),
    repoRoot,
    counts: {
      pages: pages.length,
      routes: pages.reduce((n, p) => n + p.routes.length, 0),
      stableIds: pages.reduce((n, p) => n + p.stableIds.length, 0),
      roles: pages.reduce((n, p) => n + p.roles.length, 0),
      labels: pages.reduce((n, p) => n + p.labels.length, 0),
      placeholders: pages.reduce((n, p) => n + p.placeholders.length, 0),
      anchors: pages.reduce((n, p) => n + p.anchors.length, 0),
      interactionTargets: pages.reduce((n, p) => n + p.interactionTargets.length, 0)
    },
    warnings: uniqSorted(warnings)
  };

  writeJson(repoRoot, `${cacheRoot}/cache-summary.json`, summary);
  written.push(`${cacheRoot}/cache-summary.json`);

  return { index, summary, pages, written };
}
