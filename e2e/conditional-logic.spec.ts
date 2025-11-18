import { test, expect } from '@playwright/test';

test.describe('Feature #5: Conditional Logic & Dynamic Forms', () => {
  test('should show/hide fields based on conditions', async ({ page }) => {
    await page.goto('/forms/conditional-test-form');

    // Initial state: pain_scale should be hidden
    await expect(page.locator('[name="pain_scale"]')).not.toBeVisible();

    // Select "yes" for has_pain
    await page.click('[name="has_pain"][value="yes"]');

    // Pain scale should now be visible
    await expect(page.locator('[name="pain_scale"]')).toBeVisible();

    // Select "no" for has_pain
    await page.click('[name="has_pain"][value="no"]');

    // Pain scale should be hidden again
    await expect(page.locator('[name="pain_scale"]')).not.toBeVisible();
  });

  test('should make fields required based on conditions', async ({ page }) => {
    await page.goto('/forms/conditional-test-form');

    // Select option that makes email required
    await page.click('[name="contact_preference"][value="email"]');

    // Email field should now be required
    await expect(page.locator('[name="email"]')).toHaveAttribute('required');

    // Try to submit without email
    await page.click('button[type="submit"]');

    // Should show validation error
    await expect(page.locator('text=Email is required')).toBeVisible();
  });

  test('should calculate BMI automatically', async ({ page }) => {
    await page.goto('/forms/patient-intake');

    // Enter weight and height
    await page.fill('[name="weight"]', '70'); // kg
    await page.fill('[name="height"]', '175'); // cm

    // BMI should be calculated automatically
    await expect(page.locator('[name="bmi"]')).toHaveValue('22.9'); // 70 / (1.75^2)
  });

  test('should set field value based on condition', async ({ page }) => {
    await page.goto('/forms/risk-assessment');

    // Select high-risk condition
    await page.click('[name="diabetes"][value="yes"]');
    await page.click('[name="hypertension"][value="yes"]');

    // Risk level should auto-populate
    await expect(page.locator('[name="risk_level"]')).toHaveValue('high');
  });
});
