import { test, expect, Page } from '@playwright/test';
import { login } from '../helpers/auth';
import { cleanupTestData } from './helpers/cleanup';

test.describe.configure({ mode: 'serial' });

const TAG = `[TEST] ${Date.now()}`;

async function goToOrders(page: Page) {
  await login(page);
  await page.click('.app-tile--orders');
  await page.waitForSelector('#page-orders.active');
}

async function createOrder(page: Page, name: string, payment = 'unpaid'): Promise<void> {
  await page.click('button:has-text("+ New Order")');
  await page.waitForSelector('#orderModal.open');
  await page.fill('#oName', name);
  await page.locator('.item-size').fill('36×16×16');
  await page.locator('.item-price').fill('60');
  await page.selectOption('#oPayment', payment);
  await page.click('button[onclick="saveOrder()"]');
  await expect(page.locator('#activeOrdersList .card-title', { hasText: name })).toBeVisible({ timeout: 10000 });
}

test.beforeAll(async () => {
  await cleanupTestData(['orders', 'sales', 'activity_log']);
});

test.afterAll(async () => {
  await cleanupTestData(['orders', 'sales', 'activity_log']);
});

test('create order appears in Active tab', async ({ page }) => {
  await goToOrders(page);
  const name = `${TAG} Create`;
  await createOrder(page, name);
  await expect(page.locator('#activeOrdersList .card-title', { hasText: name })).toBeVisible();
});

test('edit order updates the name', async ({ page }) => {
  await goToOrders(page);
  const name = `${TAG} Edit`;
  const updatedName = `${TAG} Edit Updated`;
  await createOrder(page, name);

  const card = page.locator('.order-card').filter({ hasText: name });
  await card.locator('button:has-text("✏️")').click();
  await page.waitForSelector('#orderModal.open');
  await page.fill('#oName', updatedName);
  await page.click('button[onclick="saveOrder()"]');
  await expect(page.locator('#activeOrdersList .card-title', { hasText: updatedName })).toBeVisible({ timeout: 10000 });
});

test('advance order through building to ready updates status badge', async ({ page }) => {
  await goToOrders(page);
  const name = `${TAG} Advance`;
  await createOrder(page, name);

  const card = () => page.locator('.order-card').filter({ hasText: name });

  // Verify pending state: "→ Building" button visible, "→ Ready" not yet visible
  await expect(card().locator('button:has-text("→ Building")')).toBeVisible();

  // pending → building
  await card().locator('button:has-text("→ Building")').click();

  // Verify building state: "→ Ready" button visible, "→ Building" gone
  await expect(card().locator('button:has-text("→ Ready")')).toBeVisible({ timeout: 10000 });
  await expect(card().locator('button:has-text("→ Building")')).toHaveCount(0);

  // building → ready
  await card().locator('button:has-text("→ Ready")').click();

  // Verify ready state: neither advance button remains; badge shows "Ready"
  await expect(card().locator('button:has-text("→ Building")')).toHaveCount(0);
  await expect(card().locator('button:has-text("→ Ready")')).toHaveCount(0);
  await expect(card().locator('.badge-ready')).toBeVisible({ timeout: 10000 });
});

test('complete unpaid order shows margin and moves to Sales History', async ({ page }) => {
  await goToOrders(page);
  const name = `${TAG} Complete`;
  await createOrder(page, name, 'unpaid');

  const card = page.locator('.order-card').filter({ hasText: name });
  await card.locator('button:has-text("✅")').click();

  // Payment modal opens
  await page.waitForSelector('#completePaymentModal.open');
  // Margin summary block should be present
  await expect(page.locator('#complete-margin-summary')).toBeVisible();
  await expect(page.locator('#complete-margin-summary')).toContainText('Revenue');
  await expect(page.locator('#complete-margin-summary')).toContainText('Margin');

  // Click Cash to complete (scope to completePaymentModal to avoid matching markPaidModal)
  await page.click('#completePaymentModal button:has-text("Cash")');

  // Order should be gone from Active tab
  await expect(page.locator('#activeOrdersList .card-title', { hasText: name })).toHaveCount(0);

  // Should appear in Sales History tab
  await page.click('#orders-tabs button:has-text("Sales History")');
  await expect(page.locator('#salesBody tr').filter({ hasText: name })).toBeVisible({ timeout: 10000 });
});

test('delete order removes it from Active tab', async ({ page }) => {
  await goToOrders(page);
  const name = `${TAG} Delete`;
  await createOrder(page, name);

  const card = page.locator('.order-card').filter({ hasText: name });
  // deleteOrder uses showConfirm() which opens #confirmModal (not native browser dialog)
  await card.locator('button:has-text("🗑️")').click();
  await page.waitForSelector('#confirmModal.open');
  await page.click('#confirmOkBtn');

  await expect(page.locator('#activeOrdersList .card-title', { hasText: name })).toHaveCount(0);
});
