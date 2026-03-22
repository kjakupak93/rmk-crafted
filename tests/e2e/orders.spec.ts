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
  await expect(card().locator('button:has-text("→ Ready")')).toBeVisible({ timeout: 20000 });
  await expect(card().locator('button:has-text("→ Building")')).toHaveCount(0);

  // building → ready
  await card().locator('button:has-text("→ Ready")').click();

  // Verify ready state: neither advance button remains; badge shows "Ready"
  await expect(card().locator('button:has-text("→ Building")')).toHaveCount(0);
  await expect(card().locator('button:has-text("→ Ready")')).toHaveCount(0);
  await expect(card().locator('.badge-ready')).toBeVisible({ timeout: 20000 });
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

test('order filter buttons narrow visible cards', async ({ page }) => {
  await goToOrders(page);
  const pendingName = `${TAG} Filter Pending`;
  const buildingName = `${TAG} Filter Building`;

  await createOrder(page, pendingName);
  await createOrder(page, buildingName);

  // Advance the building order to "building" status
  const buildingCard = () => page.locator('.order-card').filter({ hasText: buildingName });
  await buildingCard().locator('button:has-text("→ Building")').click();
  await expect(buildingCard().locator('button:has-text("→ Ready")')).toBeVisible({ timeout: 10000 });

  // Filter by Pending — only pending card should be visible
  // Use onclick attr to target filter buttons, not the "→ Building" advance buttons on cards
  await page.locator('button[onclick*="filterOrders(\'pending\'"]').click();
  await expect(page.locator('.order-card').filter({ hasText: pendingName })).toBeVisible({ timeout: 5000 });
  await expect(page.locator('.order-card').filter({ hasText: buildingName })).not.toBeVisible();

  // Filter by Building — only building card should be visible
  await page.locator('button[onclick*="filterOrders(\'building\'"]').click();
  await expect(page.locator('.order-card').filter({ hasText: buildingName })).toBeVisible({ timeout: 5000 });
  await expect(page.locator('.order-card').filter({ hasText: pendingName })).not.toBeVisible();

  // Filter by All — both cards visible again
  await page.locator('button[onclick*="filterOrders(\'all\'"]').click();
  await expect(page.locator('.order-card').filter({ hasText: pendingName })).toBeVisible({ timeout: 5000 });
  await expect(page.locator('.order-card').filter({ hasText: buildingName })).toBeVisible({ timeout: 5000 });
});

test('complete order via Venmo payment moves to Sales History', async ({ page }) => {
  await goToOrders(page);
  const name = `${TAG} Venmo Complete`;
  await createOrder(page, name, 'unpaid');

  const card = page.locator('.order-card').filter({ hasText: name });
  await card.locator('button:has-text("✅")').click();

  await page.waitForSelector('#completePaymentModal.open');
  await page.click('#completePaymentModal button:has-text("Venmo")');

  await expect(page.locator('#activeOrdersList .card-title', { hasText: name })).toHaveCount(0);
  await page.click('#orders-tabs button:has-text("Sales History")');
  await expect(page.locator('#salesBody tr').filter({ hasText: name })).toBeVisible({ timeout: 10000 });
});

test('Skip — not paid yet closes payment modal and order stays in Active', async ({ page }) => {
  await goToOrders(page);
  const name = `${TAG} Skip Complete`;
  await createOrder(page, name, 'unpaid');

  const card = page.locator('.order-card').filter({ hasText: name });
  await card.locator('button:has-text("✅")').click();

  await page.waitForSelector('#completePaymentModal.open');
  await page.click('#completePaymentModal button:has-text("Skip")');

  // Skip closes the modal without completing — order remains in Active
  await expect(page.locator('#completePaymentModal')).not.toHaveClass(/open/);
  await expect(page.locator('#activeOrdersList .card-title', { hasText: name })).toBeVisible({ timeout: 5000 });
});

test('complete a pre-paid order bypasses payment modal', async ({ page }) => {
  await goToOrders(page);
  const name = `${TAG} Prepaid Complete`;
  await createOrder(page, name, 'cash');

  const card = page.locator('.order-card').filter({ hasText: name });
  await card.locator('button:has-text("✅")').click();

  // Payment modal should NOT open — pre-paid orders skip it
  await expect(page.locator('#completePaymentModal')).not.toHaveClass(/open/);
  await expect(page.locator('#activeOrdersList .card-title', { hasText: name })).toHaveCount(0);

  await page.click('#orders-tabs button:has-text("Sales History")');
  await expect(page.locator('#salesBody tr').filter({ hasText: name })).toBeVisible({ timeout: 10000 });
});

test('mark all paid — venmo path clears unpaid badges', async ({ page }) => {
  await goToOrders(page);
  const name = `${TAG} MarkPaidVenmo`;
  await createOrder(page, name, 'unpaid');

  await expect(page.locator('#markPaidBtn')).toBeVisible({ timeout: 10000 });
  await page.click('#markPaidBtn');

  await page.waitForSelector('#markPaidModal.open');
  await page.locator('#markPaidModal button:has-text("Venmo")').click();

  await expect(page.locator('.order-card').filter({ hasText: name }).locator('.badge-unpaid')).toHaveCount(0, { timeout: 10000 });
});

test('mark all paid — cash path clears unpaid badges', async ({ page }) => {
  await goToOrders(page);
  const name1 = `${TAG} MarkPaid 1`;
  const name2 = `${TAG} MarkPaid 2`;

  await createOrder(page, name1, 'unpaid');
  await createOrder(page, name2, 'unpaid');

  await expect(page.locator('#markPaidBtn')).toBeVisible({ timeout: 10000 });
  await page.click('#markPaidBtn');

  await page.waitForSelector('#markPaidModal.open');
  await page.locator('#markPaidModal button:has-text("Cash")').click();

  // After marking paid, neither card should show an unpaid badge
  await expect(page.locator('.order-card').filter({ hasText: name1 }).locator('.badge-unpaid')).toHaveCount(0);
  await expect(page.locator('.order-card').filter({ hasText: name2 }).locator('.badge-unpaid')).toHaveCount(0);
});

test('multi-item order — total reflects both items', async ({ page }) => {
  await goToOrders(page);
  const name = `${TAG} Multi Item`;

  await page.click('button:has-text("+ New Order")');
  await page.waitForSelector('#orderModal.open');
  await page.fill('#oName', name);

  // Fill first item
  await page.locator('#oItemsContainer .item-size').first().fill('36×16×16');
  await page.locator('#oItemsContainer .item-price').first().fill('60');

  // Add second item row — scope to orderModal to avoid matching the inventory tab's "+ Add Item" button
  await page.locator('#orderModal button[onclick="addOrderItem()"]').click();

  // Fill second item
  await page.locator('#oItemsContainer .item-size').last().fill('48×16×16');
  await page.locator('#oItemsContainer .item-price').last().fill('85');

  // Verify total shows $145
  await expect(page.locator('#oItemsTotal')).toContainText('145');

  await page.click('button[onclick="saveOrder()"]');
  await expect(page.locator('#activeOrdersList .card-title', { hasText: name })).toBeVisible({ timeout: 10000 });
});
