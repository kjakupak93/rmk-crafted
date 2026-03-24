// tests/e2e/visual-coverage.spec.ts
//
// Screenshot-based visual coverage for four UI areas that currently have
// zero pixel-level assertions in the test suite:
//
//   1. Cut list board diagram — .picket-bar segments, scrap block, legend
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
  await cleanupTestData(['orders', 'sales', 'quotes', 'cut_lists', 'schedule_slots', 'schedule_bookings', 'activity_log']);
});

test.afterAll(async () => {
  await cleanupTestData(['orders', 'sales', 'quotes', 'cut_lists', 'schedule_slots', 'schedule_bookings', 'activity_log']);
});

// =============================================================================
// GAP 1: Cut list board diagram visual appearance
//
// The existing materials.spec.ts only asserts barCount > 0. No test screenshots
// the rendered board diagram, so regressions in segment colours, the tan scrap
// block, board labels, or proportional rendering are invisible to CI.
// =============================================================================

test('cut list board diagram renders segments and scrap block', async ({ page }) => {
  await goToCutList(page);

  await page.fill('#cl-name', `${TAG} Diagram Visual`);

  // Add one part: 60" on a 72" picket → leaves 12" length scrap (renders .picket-waste)
  await page.click('button:has-text("+ Add Part")');
  const lastRow = page.locator('#cl-rows tr:last-child');
  await lastRow.locator('[id^="cl-qty-"]').fill('1');
  await lastRow.locator('[id^="cl-len-"]').fill('60');
  await lastRow.locator('[id^="cl-mat-"]').selectOption({ index: 0 }); // Cedar Picket 6'

  await page.locator('#mtab-cutlist button:has-text("Calculate")').click();
  await expect(page.locator('#cl-results')).toBeVisible({ timeout: 10000 });

  // Boards must be present
  const bars = page.locator('.picket-bar');
  await expect(bars).not.toHaveCount(0);

  // Each board bar must have at least one child div (the piece wrapper)
  const firstBarChildren = bars.first().locator('> div');
  await expect(firstBarChildren).not.toHaveCount(0);

  // Length scrap block (.picket-waste) must appear — confirms 60" cut on 72" board
  const wasteBlocks = page.locator('.picket-waste');
  await expect(wasteBlocks).not.toHaveCount(0);

  // Board label must include "Board 1" and "scrap"
  await expect(page.locator('.picket-bar-label').first()).toContainText('Board 1');
  await expect(page.locator('.picket-bar-label').first()).toContainText('scrap');

  // Screenshot the entire diagram — captures colours, proportions, scrap blocks
  await expect(page.locator('#cl-diagram')).toHaveScreenshot('cut-list-board-diagram.png', {
    maxDiffPixelRatio: 0.02,
  });
});

// =============================================================================
// GAP 2: Calendar dot colours — open slot (green) vs confirmed booking (gold)
//
// No existing test screenshots the calendar grid. The two dot colours are the
// core visual language of the scheduler. A CSS regression swapping them (or
// making them both grey) would be completely undetectable without pixel asserts.
// =============================================================================

test('calendar shows green dot for open slot and gold dot for booking', async ({ page }) => {
  await goToScheduler(page);

  // Use a date 15 days out to avoid month-edge and past-day opacity issues
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

  // Navigate calendar to the target month
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

  // The target day cell must exist and have the has-data class
  const targetDay = page.locator(`.cal-day[onclick="selectDay('${bookingDate}')"]`);
  await expect(targetDay).toBeVisible({ timeout: 10000 });
  await expect(targetDay).toHaveClass(/has-data/);

  // Both dot types must be present inside the day cell
  await expect(targetDay.locator('.day-dot:not(.booked)')).toHaveCount(1);
  await expect(targetDay.locator('.day-dot.booked')).toHaveCount(1);

  // Screenshot the calendar grid — captures the actual rendered dot colours
  await expect(page.locator('#calGrid')).toHaveScreenshot('calendar-dot-states.png', {
    maxDiffPixelRatio: 0.02,
  });
});

// =============================================================================
// GAP 3: Order status badge colours across all four states
//
// orders.spec.ts asserts .badge-ready is present but never screenshots it.
// All four badge colour variants (orange/blue/green/red) are unverified at the
// pixel level. The overdue state is applied conditionally in JS and has never
// been visually tested anywhere.
// =============================================================================

test('order status badges render correct colours for all four states', async ({ page }) => {
  await goToOrders(page);

  // Helper: create an order via the UI and return its card locator
  async function createOrder(name: string, pickupDate?: string) {
    await page.click('button:has-text("+ New Order")');
    await page.waitForSelector('#orderModal.open');
    await page.fill('#oName', name);
    await page.locator('.item-size').fill('36×16×16');
    await page.locator('.item-price').fill('60');
    if (pickupDate) {
      await page.fill('#oPickup', pickupDate);
    }
    await page.click('button[onclick="saveOrder()"]');
    await expect(page.locator('#activeOrdersList .card-title', { hasText: name })).toBeVisible({ timeout: 10000 });
    return page.locator('.order-card').filter({ hasText: name });
  }

  // --- Pending badge (orange) ---
  const pendingCard = await createOrder(`${TAG} Badge Pending`);
  await expect(pendingCard.locator('.badge-pending')).toBeVisible();
  await expect(pendingCard.locator('.badge-pending')).toHaveScreenshot('badge-pending.png', {
    maxDiffPixelRatio: 0.02,
  });

  // --- Building badge (blue/ocean) ---
  const buildingCard = await createOrder(`${TAG} Badge Building`);
  await buildingCard.locator('button:has-text("→ Building")').click();
  await expect(buildingCard.locator('.badge-building')).toBeVisible({ timeout: 10000 });
  await expect(buildingCard.locator('.badge-building')).toHaveScreenshot('badge-building.png', {
    maxDiffPixelRatio: 0.02,
  });

  // --- Ready badge (green) ---
  const readyCard = await createOrder(`${TAG} Badge Ready`);
  await readyCard.locator('button:has-text("→ Building")').click();
  await expect(readyCard.locator('button:has-text("→ Ready")')).toBeVisible({ timeout: 10000 });
  await readyCard.locator('button:has-text("→ Ready")').click();
  await expect(readyCard.locator('.badge-ready')).toBeVisible({ timeout: 10000 });
  await expect(readyCard.locator('.badge-ready')).toHaveScreenshot('badge-ready.png', {
    maxDiffPixelRatio: 0.02,
  });

  // --- Overdue badge (red) ---
  // Create an order via UI with a pickup_date in the past — the app marks it overdue
  // when rendering the card (isOverdue = status!=='completed' && pickup_date < today)
  const overdueCard = await createOrder(`${TAG} Badge Overdue`, '2020-01-01');
  await expect(overdueCard.locator('.badge-overdue')).toBeVisible({ timeout: 10000 });
  await expect(overdueCard.locator('.badge-overdue')).toHaveScreenshot('badge-overdue.png', {
    maxDiffPixelRatio: 0.02,
  });

  // Full active list with all badge variants — broadest regression baseline
  await expect(page.locator('#activeOrdersList')).toHaveScreenshot('order-status-badges-all.png', {
    maxDiffPixelRatio: 0.02,
  });
});

// =============================================================================
// GAP 4: Quote margin badge in the Quotes tab
//
// cutlist-quotes.spec.ts only checks that a "%" span is present in the row.
// The margin badge uses inline color style from marginColor() — no CSS class,
// pure JS logic. A broken colour function (always red, wrong hex, etc.) would
// pass every existing assertion while showing the wrong colour to the user.
// =============================================================================

test('quote margin badge renders correct colour in Quotes tab', async ({ page }) => {
  // Create a cut list and save a quote from it (same flow as cutlist-quotes.spec.ts)
  await goToCutList(page);

  const cutListName = `${TAG} MarginVisual CL`;
  await page.fill('#cl-name', cutListName);
  await page.click('button:has-text("+ Add Part")');
  const lastRow = page.locator('#cl-rows tr:last-child');
  await lastRow.locator('[id^="cl-qty-"]').fill('2');
  await lastRow.locator('[id^="cl-len-"]').fill('36');
  await lastRow.locator('[id^="cl-mat-"]').selectOption({ index: 0 });
  await page.locator('#mtab-cutlist button:has-text("Calculate")').click();
  await expect(page.locator('#cl-results')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('#cl-quote-btn')).not.toBeDisabled({ timeout: 5000 });

  const quoteName = `${TAG} MarginVisual Quote`;
  await page.click('#cl-quote-btn');
  await page.waitForSelector('#createQuoteModal.open');
  await page.fill('#cqName', quoteName);
  // Force a high price so the margin badge is clearly in the green range
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
  const marginBadge = quoteRow.locator('span').filter({ hasText: '%' });
  await expect(marginBadge).toBeVisible();

  // Assert the badge uses the green colour — marginColor() returns 'var(--green)'
  // for margin ≥ 60%. A $100 price on a ~2-picket cut list will always be in range.
  // Using a style assertion avoids 1-pixel screenshot instability across platforms.
  await expect(marginBadge).toHaveAttribute('style', /var\(--green\)/);
});
