// tests/e2e/helpers/cleanup.ts

const SUPABASE_URL = 'https://mfsejmfmyuvhuclzuitc.supabase.co';
const ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mc2VqbWZteXV2aHVjbHp1aXRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNTgzODksImV4cCI6MjA4NzYzNDM4OX0.Ve8dY-CvGqCMSWfifd6HvrDvmrJo4J00auhos8aezpY';

const HEADERS = {
  apikey: ANON_KEY,
  Authorization: `Bearer ${ANON_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=minimal',
};

/** Maps table name → column used for [TEST]% pattern matching */
const TAG_COLUMN: Record<string, string> = {
  orders: 'name',
  sales: 'name',
  quotes: 'name',
  purchases: 'store',
  cut_lists: 'name',
  schedule_slots: 'notes',
  schedule_bookings: 'name',
};

/**
 * Delete all rows where the tag column starts with '[TEST]'.
 * Sweeps orphaned rows from prior crashed runs in addition to the current run.
 * URL encoding: '[TEST]%' → '%5BTEST%5D%25'
 */
export async function cleanupTestData(tables: string[]): Promise<void> {
  for (const table of tables) {
    const col = TAG_COLUMN[table];
    if (!col) {
      console.warn(`cleanup: no tag column configured for table "${table}" — skipping`);
      continue;
    }
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/${table}?${col}=like.%5BTEST%5D%25`,
      { method: 'DELETE', headers: HEADERS },
    );
    if (!res.ok) {
      const text = await res.text();
      console.warn(`cleanup: DELETE from ${table} failed — ${res.status} ${text}`);
    }
  }
}

/**
 * Delete a specific row by ID. Used for tables without a tag column
 * (e.g. availability_windows).
 */
export async function cleanupById(table: string, id: string): Promise<void> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`,
    { method: 'DELETE', headers: HEADERS },
  );
  if (!res.ok) {
    const text = await res.text();
    console.warn(`cleanup: DELETE ${table}/${id} failed — ${res.status} ${text}`);
  }
}
