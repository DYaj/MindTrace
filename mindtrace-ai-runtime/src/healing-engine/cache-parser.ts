// mindtrace-ai-runtime/src/healing-engine/cache-parser.ts
import { readdirSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import { deriveSiteKey, derivePageKey } from "./key-derivation";

export interface PageCacheEntry {
  pageId: string;
  sourcePath: string;
  inferredName: string;
  stableIds: string[];
  roles: string[];
  labels: string[];
  placeholders: string[];
  confidence: number;
}

export type CacheIndex = Record<string, Record<string, PageCacheEntry>>;

/**
 * PageCacheParser - parse .mcp-cache/pages/*.json into indexed structure
 *
 * Indexes by: Record<siteKey, Record<pageKey, PageCacheEntry>>
 */
export class PageCacheParser {
  private cacheDir: string;

  constructor(cacheDir: string) {
    this.cacheDir = cacheDir;
  }

  /**
   * Build cache index (deterministic)
   */
  buildIndex(): CacheIndex {
    const index: CacheIndex = {};

    if (!existsSync(this.cacheDir)) {
      return index;
    }

    const files = readdirSync(this.cacheDir).filter(f => f.endsWith(".json"));

    for (const file of files) {
      const filePath = join(this.cacheDir, file);
      const content = readFileSync(filePath, "utf-8");
      const entry = JSON.parse(content) as PageCacheEntry;

      const siteKey = deriveSiteKey(entry.sourcePath);
      const pageKey = derivePageKey(entry);

      if (!index[siteKey]) {
        index[siteKey] = {};
      }

      index[siteKey][pageKey] = entry;
    }

    return index;
  }
}
