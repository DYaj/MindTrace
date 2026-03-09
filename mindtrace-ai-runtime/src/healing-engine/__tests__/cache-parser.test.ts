// mindtrace-ai-runtime/src/healing-engine/__tests__/cache-parser.test.ts
import { writeFileSync, unlinkSync, mkdirSync, existsSync, rmdirSync, readdirSync } from "fs";
import { PageCacheParser } from "../cache-parser";

describe("PageCacheParser", () => {
  const testCacheDir = ".test-cache/pages";

  beforeEach(() => {
    mkdirSync(testCacheDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testCacheDir)) {
      // Clean up test files
      const files = readdirSync(testCacheDir);
      files.forEach((f: string) => unlinkSync(`${testCacheDir}/${f}`));
      rmdirSync(testCacheDir);
    }
  });

  it("indexes cache by siteKey + pageKey", () => {
    // Write test cache file
    const cacheEntry = {
      pageId: "frameworks__style1-native__src__pages__LoginPage",
      sourcePath: "frameworks/style1-native/src/pages/LoginPage.ts",
      inferredName: "LoginPage",
      stableIds: ["login-btn", "username-input"],
      roles: ["button", "textbox"],
      confidence: 0.85
    };

    writeFileSync(
      `${testCacheDir}/frameworks__style1-native__src__pages__LoginPage.json`,
      JSON.stringify(cacheEntry)
    );

    const parser = new PageCacheParser(testCacheDir);
    const index = parser.buildIndex();

    const siteKey = "frameworks__style1-native";
    const pageKey = "LoginPage";

    expect(index[siteKey]).toBeDefined();
    expect(index[siteKey][pageKey]).toBeDefined();
    expect(index[siteKey][pageKey].stableIds).toContain("login-btn");
  });
});
