// tests/e2e/visual-coverage.spec.ts
//
// Screenshot-based visual coverage for four UI areas that currently have
// zero pixel-level assertions in the test suite:
//
//   1. Cut list board diagram — .picket-bar segments, scrap blocks, legend
//   2. Calendar dot states — green dot (open slot) vs gold dot (booking)
//   3. Order status badge colours — pending/building/ready/overdue
//   4. Quote margin badge in Quotes tab
//
// Run with:
//   npx playwright test --project=e2e tests/e2e/visual-coverage.spec.ts
//
// On first run (no snapshots committed yet) pass --update-snapshots to
// generate the baseline images.

import { test, expect, Page } from '@playwright/test';
import { login } from '../helpers/auth';
import { cleanupTestData } from './helpers/cleanup';

test.describe.configure({ mode: 'serial' });

const TAG = `[TEST] ${Date.now()}`;

// ─── Shared navigation helpers ────────────────────────────────────────────────

async function goToOrders(page: Page) {
  await login(page);
  await page.click('.app-tile--orders');
  await page.waitForSelector('#page-orders.active');
}

async function goToCutList(page: Page) {
  await login(page);
  await page.click('.app-tile--mats');
  await page.waitForSelector('#page-materials.active');
  await page.click('button:has-text("Cut List")');
  await page.waitForSelector('#mtab-cutlist.active');
}

async function goToScheduler(page: Page) {
  await login(page);
  await page.click('.app-tile--sched');
  await page.waitForSelector('#page-scheduler.active');
  await page.waitForSelector('#calLabel:not(:empty)', { timeout: 10000 });
}

// ─── Global cleanup ───────────────────────────────────────────────────────────

test.beforeAll(async () => {
  await cleanupTestData(['orders', 'sales', 'quotes', 'cut_lists', 'schedule_slots', 'schedule_bookings']);
});

test.afterAll(async () => {
  await cleanupTestData(['orders', 'sales', 'quotes', 'cut_lists', 'schedule_slots', 'schedule_bookings']);
});

// =============================================================================
// GAP 1: Cut list board diagram visual appearance
//
// The existing materials.spec.ts test only asserts barCount > 0 (a DOM count).
// No test ever takes a screenshot of the rendered board diagram, so a regression
// that renders blank bars, wrong colours, or broken scrap blocks would be
// invisible to CI.
// =============================================================================

test('cut list board diagram renders segments and scrap block', async ({ page }) => {
  await goToCutList(page);

  // Name the cut list so it's identifiable for cleanup
  await page.fill('#cl-name', `${TAG} Diagram Visual`);

  // Add two rows: a long cut and a short cut — this ensures at least one board
  // with both a coloured segment and a visible tan scrap block at the right end
  await page.click('button:has-text("+ Add Part")');
  const row1 = page.locator('#cl-rows tr:last-child');
  await row1.locator('[id^="cl-qty-"]').fill('1');
  await row1.locator('[id^="cl-len-"]').fill('60');
  await row1.locator('[id^="cl-mat-"]').selectOption({ index: 0 }); // Picket 6'

  await page.click('button:has-text("+ Add Part")');
  const row2 = page.locator('#cl-rows tr:last-child');
  await row2.locator('[id^="cl-qty-"]').fill('1');
  await row2.locator('[id^="cl-len-"]').fill('8');
  await row2.locator('[id^="cl-mat-"]').selectOption({ index: 0 }); // same stock type

  await page.locator('#mtab-cutlist button:has-text("Calculate")').click();
  await page.waitForSelector('#cl-results', { state: 'visible', timeout: 10000 });

  // Structural assertions — prove the diagram has real content before screenshotting
  const bars = page.locator('.picket-bar');
  await expect(bars).not.toHaveCount(0);

  // At least one coloured segment (the cut piece) must be present
  const segments = page.locator('.picket-segment');
  await expect(segments).not.toHaveCount(0);

  // The scrap block (tan/waste area) must appear at the end of at least one bar
  const wasteBlocks = page.locator('.picket-waste');
  await expect(wasteBlocks).not.toHaveCount(0);

  // Board label must mention "Board 1" and show scrap inches
  await expect(page.locator('.picket-bar-label').first()).toContainText('Board 1');
  await expect(page.locator('.picket-bar-label').first()).toContainText('scrap');

  // Screenshot the entire diagram area — captures colours, proportions, scrap
  await expect(page.locator('#cl-diagram')).toHaveScreenshot('cut-list-board-diagram.png', {
    maxDiffPixelRatio: 0.02,
  });
});

// =============================================================================
// GAP 2: Calendar dot states — open slot (green) vs confirmed booking (gold)
//
// No existing test takes a screenshot of the calendar grid. The two distinct
// dot colours (--green and --sand) are load-bearing UI: green = slot available,
// gold = pickup booked. A CSS regression that swapped them would be undetectable
// without a pixel assertion.
// =============================================================================

test('calendar shows green dot for open slot and gold dot for booking', async ({ page }) => {
  await goToScheduler(page);

  // Use a date 15 days out to avoid month-edge cases and past-day opacity
  const target = new Date();
  target.setDate(target.getDate() + 15);
  const bookingDate = target.toISOString().split('T')[0];
  const [by, bm] = bookingDate.split('-');
  const bookingYear = parseInt(by);
  const bookingMonthIdx = parseInt(bm) - 1;

  // Insert a slot and a booking directly via the authenticated Supabase client
  await page.evaluate(
    async ({ tag, date }: { tag: string; date: string }) => {
      const sb = (window as any).sb;
      await sb.from('schedule_slots').insert({
        slot_date: date,
        start_time: '10:00',
        end_time: '12:00',
        notes: `${tag} CalDot Slot`,
      });
      await sb.from('schedule_bookings').insert({
        name: `${tag} CalDot Booking`,
        booking_date: date,
        pickup_time: '11:00',
        amount: 85,
        payment: 'cash',
      });
    },
    { tag: TAG, date: bookingDate },
  );

  // Navigate the calendar to the correct month
  const MONTHS_ARR = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December',
  ];
  const targetLabel = `${MONTHS_ARR[bookingMonthIdx]} ${bookingYear}`;
  let attempts = 0;
  while (!(await page.locator('#calLabel').innerText()).includes(targetLabel) && attempts < 12) {
    await page.click('button:has-text("Next →")');
    await page.waitForSelector('#calGrid .cal-day', { timeout: 5000 });
    attempts++;
  }

  // Wait for the calendar to re-render with the new data
  // The day with our data should now have the has-data CSS class (green border)
  // and contain both a plain green dot and a gold "booked" dot
  const targetDay = page.locator(`.cal-day[onclick="selectDay('${bookingDate}')"]`);
  await expect(targetDay).toBeVisible({ timeout: 10000 });
  await expect(targetDay).toHaveClass(/has-data/);

  // Structural assertions: both dot types present inside that day cell
  const greenDot = targetDay.locator('.day-dot:not(.booked)');
  const goldDot  = targetDay.locator('.day-dot.booked');
  await expect(greenDot).toHaveCount(1);
  await expect(goldDot).toHaveCount(1);

  // Screenshot the calendar grid — captures the actual rendered dot colours
  await expect(page.locator('#calGrid')).toHaveScreenshot('calendar-dot-states.png', {
    maxDiffPixelRatio: 0.02,
  });
});

// =============================================================================
// GAP 3: Order status badge colours across all four states
//
// The existing orders.spec.ts test asserts that .badge-ready is present after
// advancing an order, but it never takes a screenshot. None of the four badge
// colours (orange/blue/green/red) are visually verified. A CSS change that made
// all badges the same colour would pass every existing assertion.
// =============================================================================

test('order status badges render correct colours for all four states', async ({ page }) => {
  await goToOrders(page);

  // Helper: create a minimal order and return its card locator
  async function createOrder(name: string, payment = 'unpaid') {
    await page.click('button:has-text("+ New Order")');
    await page.waitForSelector('#orderModal.open');
    await page.fill('#oName', name);
    await page.locator('.item-size').fill('36×16×16');
    await page.locator('.item-price').fill('60');
    await page.selectOption('#oPayment', payment);
    await page.click('button[onclick="saveOrder()"]');
    await expect(page.locator('#activeOrdersList .card-title', { hasText: name })).toBeVisible({ timeout: 10000 });
    return page.locator('.order-card').filter({ hasText: name });
  }

  // --- Pending badge (orange) ---
  const pendingName = `${TAG} Badge Pending`;
  const pendingCard = await createOrder(pendingName);
  await expect(pendingCard.locator('.badge-pending')).toBeVisible();
  await expect(pendingCard.locator('.badge-pending')).toHaveScreenshot('badge-pending.png', {
    maxDiffPixelRatio: 0.02,
  });

  // --- Building badge (blue/ocean) ---
  const buildingName = `${TAG} Badge Building`;
  const buildingCard = await createOrder(buildingName);
  await buildingCard.locator('button:has-text("→ Building")').click();
  await expect(buildingCard.locator('.badge-building')).toBeVisible({ timeout: 10000 });
  await expect(buildingCard.locator('.badge-building')).toHaveScreenshot('badge-building.png', {
    maxDiffPixelRatio: 0.02,
  });

  // --- Ready badge (green) ---
  const readyName = `${TAG} Badge Ready`;
  const readyCard = await createOrder(readyName);
  await readyCard.locator('button:has-text("→ Building")').click();
  await expect(readyCard.locator('button:has-text("→ Ready")')).toBeVisible({ timeout: 10000 });
  await readyCard.locator('button:has-text("→ Ready")').click();
  await expect(readyCard.locator('.badge-ready')).toBeVisible({ timeout: 10000 });
  await expect(readyCard.locator('.badge-ready')).toHaveScreenshot('badge-ready.png', {
    maxDiffPixelRatio: 0.02,
  });

  // --- Overdue badge (red) ---
  // Insert an order directly with a past pickup_date so the app marks it overdue
  await page.evaluate(
    async ({ tag }: { tag: string }) => {
      const sb = (window as any).sb;
      await sb.from('orders').insert({
        name: `${tag} Badge Overdue`,
        payment: 'unpaid',
        status: 'pending',
        price: 60,
        size: '36×16×16',
        style: 'Standard',
        contact: '',
        notes: '',
        pickup_date: '2020-01-01', // guaranteed past date → overdue
        items: { rows: [{ size: '36×16×16', style: 'Standard', price: 60 }], add_ons: [], add_on_total: 0, add_on_prices: {} },
      });
    },
    { tag: TAG },
  );

  // Reload the orders page to pick up the directly-inserted overdue order
  await page.click('.app-tile--orders');
  await page.waitForSelector('#page-orders.active');
  await page.waitForLoadState('networkidle');

  const overdueCard = page.locator('.order-card').filter({ hasText: `${TAG} Badge Overdue` });
  await expect(overdueCard).toBeVisible({ timeout: 10000 });
  await expect(overdueCard.locator('.badge-overdue')).toBeVisible();
  await expect(overdueCard.locator('.badge-overdue')).toHaveScreenshot('badge-overdue.png', {
    maxDiffPixelRatio: 0.02,
  });

  // Full four-badge composite — the entire active list with all badge variants
  // visible at once provides the most useful regression snapshot
  await expect(page.locator('#activeOrdersList')).toHaveScreenshot('order-status-badges-all.png', {
    maxDiffPixelRatio: 0.02,
  });
});

// =============================================================================
// GAP 4: Quote margin badge in the Quotes tab
//
// The existing cutlist-quotes.spec.ts smoke-checks that a "%" span is present
// in the quote row, but never screenshots it. The margin badge uses inline
// `marginColor()` colouring (green for healthy margin, red for low margin)
// rendered entirely in JS — no CSS class, just inline style. A regression in
// the colour logic or in the badge rendering would be invisible without a
// pixel assertion.
// =============================================================================

test('quote margin badge renders correct colour in Quotes tab', async ({ page }) => {
  // Build a cut list and create a quote from it, same pattern as cutlist-quotes.spec.ts
  await goToCutList(page);

  const cutListName = `${TAG} MarginVisual CL`;
  await page.fill('#cl-name', cutListName);
  await page.click('button:has-text("+ Add Part")');
  const row = page.locator('#cl-rows tr:last-child');
  await row.locator('[id^="cl-qty-"]').fill('2');
  await row.locator('[id^="cl-len-"]').fill('36');
  await row.locator('[id^="cl-mat-"]').selectOption({ index: 0 });
  await page.locator('#mtab-cutlist button:has-text("Calculate")').click();
  await page.waitForSelector('#cl-results', { state: 'visible', timeout: 10000 });
  await expect(page.locator('#cl-quote-btn')).not.toBeDisabled({ timeout: 5000 });

  const quoteName = `${TAG} MarginVisual Quote`;
  await page.click('#cl-quote-btn');
  await page.waitForSelector('#createQuoteModal.open');
  await page.fill('#cqName', quoteName);
  // Force a high price so the margin badge is clearly green, not red
  await page.fill('#cqPrice', '100');
  await page.click('button:has-text("Create Quote")');
  await expect(page.locator('#createQuoteModal')).not.toHaveClass(/open/, { timeout: 5000 });

  // Navigate to Orders → Quotes tab
  await login(page);
  await page.click('.app-tile--orders');
  await page.waitForSelector('#page-orders.active');
  await page.click('#orders-tabs button:has-text("Quotes")');
  await page.waitForSelector('#otab-quotes', { state: 'visible' });

  // The quote row must be present with a "%" margin badge
  const quoteRow = page.locator('#otab-quotes tr').filter({ hasText: quoteName });
  await expect(quoteRow).toBeVisible({ timeout: 10000 });

  // The badge is a <span> with inline color style — assert it contains a % value
  const marginBadge = quoteRow.locator('td').nth(3).locator('span');
  await expect(marginBadge).toBeVisible();
  await expect(marginBadge).toContainText('%');

  // Screenshot the margin cell: captures the inline colour (green vs red vs orange)
  // which is invisible to text-only assertions
  await expect(quoteRow.locator('td').nth(3)).toHaveScreenshot('quote-margin-badge.png', {
    maxDiffPixelRatio: 0.02,
  });

  // Screenshot the full quotes table for a broader regression baseline
  await expect(page.locator('#otab-quotes')).toHaveScreenshot('quotes-tab-with-margin.png', {
    maxDiffPixelRatio: 0.02,
  });
});
