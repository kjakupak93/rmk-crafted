import { test, expect, Page } from '@playwright/test';
import { login } from '../helpers/auth';
import { cleanupTestData, cleanupById } from './helpers/cleanup';

test.describe.configure({ mode: 'serial' });

const TAG = `[TEST] ${Date.now()}`;
const SUPABASE_URL = 'https://mfsejmfmyuvhuclzuitc.supabase.co';
const ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mc2VqbWZteXV2aHVjbHp1aXRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNTgzODksImV4cCI6MjA4NzYzNDM4OX0.Ve8dY-CvGqCMSWfifd6HvrDvmrJo4J00auhos8aezpY';

const createdAvailabilityIds: string[] = [];

async function goToScheduler(page: Page) {
  await login(page);
  await page.click('.app-tile--sched');
  await page.waitForSelector('#page-scheduler.active');
  await page.waitForSelector('#calLabel:not(:empty)', { timeout: 10000 });
}

async function clickFirstAvailableDay(page: Page): Promise<void> {
  // Wait for the calendar grid to be populated
  await page.waitForSelector('#calGrid .cal-day', { timeout: 8000 });

  // If no available days exist in current month, advance to next month
  let days = page.locator('.cal-day:not(.past-day):not(.other-month)');
  const count = await days.count();
  if (count === 0) {
    await page.click('button:has-text("Next →")');
    await page.waitForTimeout(500);
    await page.waitForSelector('#calGrid .cal-day', { timeout: 8000 });
    days = page.locator('.cal-day:not(.past-day):not(.other-month)');
  }
  await days.first().click();
  await page.waitForSelector('#dayDetail', { state: 'visible', timeout: 5000 });
}

test.afterAll(async () => {
  await cleanupTestData(['schedule_slots', 'schedule_bookings']);
  for (const id of createdAvailabilityIds) {
    await cleanupById('availability_windows', id);
  }
});

test('add calendar slot is visible on calendar day', async ({ page }) => {
  await goToScheduler(page);
  await clickFirstAvailableDay(page);

  await page.click('button:has-text("+ Add Open Slot")');
  await page.waitForSelector('#slotModal.open');

  await page.fill('#slotNotes', `${TAG} Slot`);
  await page.fill('#slotStart', '10:00');
  await page.fill('#slotEnd', '12:00');
  await page.click('#slotModalSaveBtn');
  await expect(page.locator('#slotModal')).not.toHaveClass(/open/, { timeout: 5000 });

  // Day detail slot list should show the slot time
  await expect(page.locator('#daySlotsList')).toContainText('10:00', { timeout: 10000 });
});

test('book a pickup appears in Upcoming tab', async ({ page }) => {
  await goToScheduler(page);
  await clickFirstAvailableDay(page);

  await page.click('button:has-text("+ Book Pickup")');
  await page.waitForSelector('#bookingModal.open');

  const bookingName = `${TAG} Booking`;
  await page.fill('#bkName', bookingName);
  await page.fill('#bkTime', '11:00');
  await page.fill('#bkAmount', '85');
  await page.selectOption('#bkPayment', 'cash');
  await page.click('#bookingModalSaveBtn');
  await expect(page.locator('#bookingModal')).not.toHaveClass(/open/, { timeout: 5000 });

  await page.click('button:has-text("Upcoming")');
  await page.waitForSelector('#stab-upcoming.active');
  await expect(page.locator('#upcomingList').locator(`text=${bookingName}`)).toBeVisible({
    timeout: 10000,
  });
});

test('add availability window updates Share & Book message', async ({ page }) => {
  await goToScheduler(page);
  await page.click('button:has-text("Share & Book")');
  await page.waitForSelector('#stab-share.active');

  // Record existing IDs before adding
  const beforeIds = await page.evaluate(
    async ({ url, key }: { url: string; key: string }) => {
      const r = await fetch(`${url}/rest/v1/availability_windows?select=id`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
      });
      const data = (await r.json()) as { id: string }[];
      return data.map((row: { id: string }) => row.id);
    },
    { url: SUPABASE_URL, key: ANON_KEY },
  );

  await page.click('button:has-text("+ Add Window")');
  await page.waitForSelector('#windowModal.open');
  await page.selectOption('#wDays', { index: 1 });
  await page.fill('#wStart', '09:00');
  await page.fill('#wEnd', '17:00');
  await page.click('button:has-text("Save Window")');
  await expect(page.locator('#windowModal')).not.toHaveClass(/open/, { timeout: 5000 });

  // Find newly created IDs
  const afterIds = await page.evaluate(
    async ({ url, key }: { url: string; key: string }) => {
      const r = await fetch(`${url}/rest/v1/availability_windows?select=id`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
      });
      const data = (await r.json()) as { id: string }[];
      return data.map((row: { id: string }) => row.id);
    },
    { url: SUPABASE_URL, key: ANON_KEY },
  );

  const newIds = afterIds.filter((id: string) => !beforeIds.includes(id));
  createdAvailabilityIds.push(...newIds);

  await expect(page.locator('#shareMsgBox')).not.toBeEmpty({ timeout: 10000 });
});
