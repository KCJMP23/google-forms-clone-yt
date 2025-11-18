import { test, expect } from '@playwright/test';

test.describe('Feature #1: Visual Form Builder', () => {
  test.beforeEach(async ({ page }) => {
    // Login as research coordinator
    await page.goto('/sign-in');
    await page.fill('[name="email"]', 'researcher@example.com');
    await page.fill('[name="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should create a new form from blank template', async ({ page }) => {
    await page.goto('/dashboard/forms/new');
    await expect(page.locator('h1')).toContainText('Form Builder');

    // Enter form title
    await page.fill('[placeholder="Form Title"]', 'Test Patient Intake Form');

    // Add a text field from palette
    await page.click('text=Text');
    await expect(page.locator('[data-field-type="text"]')).toBeVisible();

    // Configure field
    await page.fill('[data-field-id] input[placeholder="Field label"]', 'Patient Name');

    // Auto-PHI detection should trigger
    await expect(page.locator('[data-phi-indicator]')).toBeVisible();

    // Save form
    await page.click('button:has-text("Save")');
    await expect(page.locator('text=Form saved successfully')).toBeVisible();
  });

  test('should use pre-built template', async ({ page }) => {
    await page.goto('/dashboard/forms/new');

    // Open template selector
    await page.click('text=Choose Template');
    await expect(page.locator('text=Patient Intake Form')).toBeVisible();

    // Select patient intake template
    await page.click('text=Patient Intake Form');

    // Verify template fields are loaded
    await expect(page.locator('text=Full Name')).toBeVisible();
    await expect(page.locator('text=Date of Birth')).toBeVisible();
    await expect(page.locator('text=Medical Record Number')).toBeVisible();
  });

  test('should configure HIPAA settings', async ({ page }) => {
    await page.goto('/dashboard/forms/new');

    // Open settings panel
    await page.click('text=Form Settings');

    // Mark as containing PHI
    await page.click('[id="containsPHI"]');
    await expect(page.locator('[id="containsPHI"]')).toBeChecked();

    // Set data classification
    await page.selectOption('[id="dataClassification"]', 'PHI');

    // Set retention period
    await page.fill('[id="retention"]', '2555'); // 7 years

    // Save
    await page.click('button:has-text("Save")');
  });

  test('should drag and reorder fields', async ({ page }) => {
    await page.goto('/dashboard/forms/new');

    // Add two fields
    await page.click('text=Text');
    await page.click('text=Email');

    // Get initial order
    const firstField = page.locator('[data-field-index="0"]');
    const secondField = page.locator('[data-field-index="1"]');

    // Drag second field to first position
    await secondField.dragTo(firstField);

    // Verify order changed
    // (actual verification depends on DOM structure)
  });

  test('should delete a field', async ({ page }) => {
    await page.goto('/dashboard/forms/new');

    // Add a field
    await page.click('text=Text');

    // Delete it
    await page.click('[aria-label="Delete field"]');

    // Verify it's gone
    await expect(page.locator('[data-field-type="text"]')).not.toBeVisible();
  });

  test('should preview form', async ({ page }) => {
    await page.goto('/dashboard/forms/new');
    await page.fill('[placeholder="Form Title"]', 'Test Form');
    await page.click('text=Text');

    // Click preview
    const [previewPage] = await Promise.all([
      page.waitForEvent('popup'),
      page.click('button:has-text("Preview")'),
    ]);

    // Verify preview opens in new tab
    await expect(previewPage).toHaveURL(/\/forms\/preview/);
  });

  test('should publish form', async ({ page }) => {
    await page.goto('/dashboard/forms/new');
    await page.fill('[placeholder="Form Title"]', 'Test Form');
    await page.click('text=Text');

    // Save first
    await page.click('button:has-text("Save")');
    await page.waitForSelector('text=Form saved successfully');

    // Then publish
    await page.click('button:has-text("Publish")');
    await expect(page.locator('text=Form published successfully')).toBeVisible();
  });
});
