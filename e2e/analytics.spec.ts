import { test, expect } from '@playwright/test';

test.describe('Feature #3: Advanced Analytics Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/sign-in');
    await page.fill('[name="email"]', 'analyst@example.com');
    await page.fill('[name="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
  });

  test('should display analytics dashboard', async ({ page }) => {
    await page.goto('/dashboard/analytics');

    // Verify key metrics are visible
    await expect(page.locator('text=Total Responses')).toBeVisible();
    await expect(page.locator('text=Active Surveys')).toBeVisible();
    await expect(page.locator('text=Completion Rate')).toBeVisible();

    // Verify charts are rendered
    await expect(page.locator('[data-chart="response-rate"]')).toBeVisible();
    await expect(page.locator('[data-chart="completion-rate"]')).toBeVisible();
  });

  test('should filter analytics by date range', async ({ page }) => {
    await page.goto('/dashboard/analytics');

    // Select date range
    await page.click('[data-date-range-picker]');
    await page.click('text=Last 7 Days');

    // Verify data updates
    await expect(page.locator('[data-loading="false"]')).toBeVisible();
  });

  test('should export analytics report as PDF', async ({ page }) => {
    await page.goto('/dashboard/analytics');

    // Click export
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('button:has-text("Export PDF")'),
    ]);

    // Verify file downloaded
    expect(download.suggestedFilename()).toContain('analytics-report');
    expect(download.suggestedFilename()).toContain('.pdf');
  });

  test('should view PHI access heatmap', async ({ page }) => {
    await page.goto('/dashboard/analytics');

    // Navigate to PHI access tab
    await page.click('text=PHI Access');

    // Verify heatmap is visible
    await expect(page.locator('[data-heatmap]')).toBeVisible();

    // Verify user access counts
    await expect(page.locator('text=Access Count')).toBeVisible();
  });
});
