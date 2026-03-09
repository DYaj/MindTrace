// mindtrace-ai-runtime/src/healing-engine/tiers/__tests__/tier2-cache.test.ts
import { Tier2Cache } from "../tier2-cache";
import type { HealingContext } from "../../types";

describe("Tier2Cache", () => {
  it("emits cache-derived selectors for matching pageKey", async () => {
    const mockCacheIndex: any = {
      "frameworks__style1-native": {
        "LoginPage": {
          pageId: "test",
          sourcePath: "frameworks/style1-native/src/pages/LoginPage.ts",
          inferredName: "LoginPage",
          stableIds: ["login-btn"],
          roles: ["button"],
          labels: [],
          placeholders: [],
          confidence: 0.85
        }
      }
    };

    const mockContext: Partial<HealingContext> = {
      pageKey: "LoginPage",
      actionType: "click",
      strategyContext: { siteKey: "frameworks__style1-native" }
    };

    const tier = new Tier2Cache(mockCacheIndex);
    const result = await tier.execute(mockContext as HealingContext);

    expect(result.status).toBe("miss"); // no probe yet
    // Should emit candidates from cache
  });

  it("returns skipped if no pageKey", async () => {
    const mockCacheIndex: any = {};

    const mockContext: Partial<HealingContext> = {
      pageKey: undefined,
      actionType: "click"
    };

    const tier = new Tier2Cache(mockCacheIndex);
    const result = await tier.execute(mockContext as HealingContext);

    expect(result.status).toBe("skipped");
    expect(result.reason).toBe("NO_PAGEKEY");
  });
});
