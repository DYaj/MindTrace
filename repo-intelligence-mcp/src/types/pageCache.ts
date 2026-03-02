export type PageCacheVersion = "0.1.0";

export type PageSemanticCacheEntry = {
  cacheVersion: PageCacheVersion;
  pageId: string;              // stable slug derived from file path
  sourcePath: string;          // repo-relative posix path to page file
  inferredName: string;        // filename-based
  routes: string[];            // '/login', '/settings', etc.
  stableIds: string[];         // data-testid/data-qa/data-cy values
  roles: string[];             // 'button', 'textbox', ...
  labels: string[];            // label/text strings
  placeholders: string[];      // placeholder strings
  anchors: string[];           // css-ish anchors #id, .class, form#id, [data-testid="x"] (best-effort)
  interactionTargets: Array<{
    kind: "locator" | "role" | "text" | "label" | "placeholder";
    value: string;
    evidence: string;          // short snippet token
    confidence: number;        // 0..1
  }>;
  confidence: number;          // 0..1
  warnings: string[];
};

export type PageCacheIndex = {
  cacheVersion: PageCacheVersion;
  generatedAt: string;
  repoRoot: string;
  pages: Array<{
    pageId: string;
    sourcePath: string;
    inferredName: string;
    confidence: number;
  }>;
};

export type PageCacheSummary = {
  cacheVersion: PageCacheVersion;
  generatedAt: string;
  repoRoot: string;
  counts: {
    pages: number;
    routes: number;
    stableIds: number;
    roles: number;
    labels: number;
    placeholders: number;
    anchors: number;
    interactionTargets: number;
  };
  warnings: string[];
};
