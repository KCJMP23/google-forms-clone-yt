import { test, expect } from '@playwright/test';

test.describe('Feature #2: Automated Notifications', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/sign-in');
    await page.fill('[name="email"]', 'admin@example.com');
    await page.fill('[name="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
  });

  test('should send form submission notification', async ({ page }) => {
    // Configure notification settings
    await page.goto('/dashboard/forms/test-form/settings');
    await page.click('[id="notifyOnSubmission"]');
    await page.fill('[id="notificationEmails"]', 'researcher@example.com');
    await page.click('button:has-text("Save")');

    // Submit a form (as anonymous user in another context)
    const userPage = await page.context().newPage();
    await userPage.goto('/forms/test-form');
    await userPage.fill('[name="name"]', 'John Doe');
    await userPage.click('button[type="submit"]');

    // Verify notification was sent (check audit log)
    await page.goto('/dashboard/audit-logs');
    await expect(page.locator('text=Notification sent: form_submission')).toBeVisible();
  });

  test('should schedule consent expiration reminder', async ({ page }) => {
    await page.goto('/dashboard/consent');

    // Verify consent expiring soon is shown
    await expect(page.locator('text=Expiring in')).toBeVisible();

    // Click to send reminder
    await page.click('button:has-text("Send Reminder")');
    await expect(page.locator('text=Reminder sent successfully')).toBeVisible();
  });

  test('should generate weekly summary report', async ({ page }) => {
    await page.goto('/dashboard/settings');

    // Enable weekly summaries
    await page.click('[id="enableWeeklySummary"]');
    await page.fill('[id="summaryRecipients"]', 'admin@example.com');
    await page.click('button:has-text("Save")');

    // Trigger manual send (for testing)
    await page.click('button:has-text("Send Now")');
    await expect(page.locator('text=Summary sent successfully')).toBeVisible();
  });

  test('should send break-glass access alert', async ({ page }) => {
    // Use break-glass access
    await page.goto('/dashboard/forms/test-form/responses/sensitive-response');
    await page.click('button:has-text("Request Emergency Access")');

    // Fill justification
    await page.fill('[name="justification"]', 'Medical emergency - patient in ER');
    await page.click('button:has-text("Request Access")');

    // Verify alert was sent
    await page.goto('/dashboard/audit-logs');
    await expect(page.locator('text=Break-glass access notification sent')).toBeVisible();
  });
});
