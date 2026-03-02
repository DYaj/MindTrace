import { test, expect } from "@playwright/test";

test("mindtrace framework smoke: runner discovers tests", async ({ page }) => {
  await page.goto("about:blank");
  await expect(page).toHaveURL("about:blank");
});
