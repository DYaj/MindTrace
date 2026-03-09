// mindtrace-ai-runtime/src/healing-engine/__tests__/key-derivation.test.ts
import { deriveSiteKey, derivePageKey } from "../key-derivation";

describe("Key Derivation", () => {
  it("derives siteKey from sourcePath", () => {
    const siteKey = deriveSiteKey("frameworks/style1-native/src/pages/LoginPage.ts");
    expect(siteKey).toBe("frameworks__style1-native");
  });

  it("derives pageKey from cache entry", () => {
    const cacheEntry = {
      pageId: "frameworks__style1-native__src__pages__LoginPage",
      inferredName: "LoginPage",
      routes: ["/login"]
    };

    const pageKey = derivePageKey(cacheEntry);
    expect(pageKey).toBe("LoginPage");
  });

  it("derives stable siteKey regardless of file depth", () => {
    const key1 = deriveSiteKey("frameworks/style1-native/src/pages/LoginPage.ts");
    const key2 = deriveSiteKey("frameworks/style1-native/src/components/Button.ts");

    expect(key1).toBe(key2);
  });
});
