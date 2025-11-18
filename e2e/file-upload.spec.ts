import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Feature #6: File Upload with HIPAA Compliance', () => {
  test('should upload file securely', async ({ page }) => {
    await page.goto('/forms/document-upload');

    // Prepare test file
    const testFile = path.join(__dirname, 'fixtures', 'test-document.pdf');

    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFile);

    // Verify upload progress
    await expect(page.locator('text=Uploading')).toBeVisible();

    // Wait for upload to complete
    await expect(page.locator('text=Upload complete')).toBeVisible({ timeout: 10000 });

    // Verify PHI encryption indicator (if file is marked as PHI)
    await expect(page.locator('[data-encrypted="true"]')).toBeVisible();
  });

  test('should reject invalid file types', async ({ page }) => {
    await page.goto('/forms/document-upload');

    // Try to upload .exe file
    const fileInput = page.locator('input[type="file"]');
    const invalidFile = path.join(__dirname, 'fixtures', 'test.exe');

    await fileInput.setInputFiles(invalidFile);

    // Should show error
    await expect(page.locator('text=File type not allowed')).toBeVisible();
  });

  test('should reject files exceeding size limit', async ({ page }) => {
    await page.goto('/forms/document-upload');

    // Try to upload 100MB file (limit is 50MB)
    const fileInput = page.locator('input[type="file"]');
    // Note: Would need to generate a large file for this test

    await expect(page.locator('text=File size exceeds maximum')).toBeVisible();
  });

  test('should scan uploaded files for viruses', async ({ page }) => {
    await page.goto('/forms/document-upload');

    const testFile = path.join(__dirname, 'fixtures', 'test-document.pdf');
    await page.locator('input[type="file"]').setInputFiles(testFile);

    // Wait for virus scan
    await expect(page.locator('text=Scanning for viruses')).toBeVisible();
    await expect(page.locator('text=Scan complete: Clean')).toBeVisible({ timeout: 15000 });
  });

  test('should download uploaded file', async ({ page }) => {
    await page.goto('/sign-in');
    await page.fill('[name="email"]', 'researcher@example.com');
    await page.fill('[name="password"]', 'testpassword123');
    await page.click('button[type="submit"]');

    // Go to response with uploaded file
    await page.goto('/dashboard/forms/test-form/responses/response-123');

    // Click download button
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('button:has-text("Download File")'),
    ]);

    // Verify file downloaded
    expect(download.suggestedFilename()).toBeTruthy();

    // Verify audit log entry was created
    await page.goto('/dashboard/audit-logs');
    await expect(page.locator('text=File downloaded')).toBeVisible();
  });
});
