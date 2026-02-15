import { test, expect } from '@playwright/test';

test.describe('Example Test Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('homepage loads successfully', async ({ page }) => {
    await expect(page).toHaveTitle(/Home/);
    await expect(page.locator('h1')).toBeVisible();
  });

  test('navigation works correctly', async ({ page }) => {
    await page.click('a[href="/about"]');
    await expect(page).toHaveURL(/about/);
  });

  test('form submission with MCP healing', async ({ page }) => {
    // This selector might break - MCP will heal it
    await page.fill('#email-input', 'test@example.com');
    await page.fill('#password-input', 'password123');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('.success-message')).toBeVisible();
  });
});
