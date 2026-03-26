// tests/e2e/helpers/cleanup.ts

const SUPABASE_URL = process.env.SUPABASE_URL!;
const ANON_KEY = process.env.SUPABASE_ANON_KEY!;

/** Maps table name → column used for [TEST]% pattern matching */
const TAG_COLUMN: Record<string, string> = {
  orders: 'name',
  sales: 'name',
  quotes: 'name',
  purchases: 'store',
  cut_lists: 'name',
  inventory: 'notes',
  schedule_slots: 'notes',
  schedule_bookings: 'name',
  activity_log: 'name',
};

/** Sign in and return an authenticated Bearer token for cleanup operations */
async function getAuthToken(): Promise<string> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email: process.env.TEST_EMAIL!, password: process.env.TEST_PASSWORD! }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`cleanup: auth failed — ${res.status} ${text}`);
  }
  const { access_token } = await res.json();
  return access_token;
}

function makeHeaders(token: string) {
  return {
    apikey: ANON_KEY,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Prefer: 'return=minimal',
  };
}

/**
 * Delete all rows where the tag column starts with '[TEST'.
 * Matches both '[TEST] ...' and '[TEST-...] ...' formats from any prior test run format.
 * Sweeps orphaned rows from prior crashed runs in addition to the current run.
 * URL encoding: '[TEST%' → '%5BTEST%25'
 */
export async function cleanupTestData(tables: string[]): Promise<void> {
  const token = await getAuthToken();
  const headers = makeHeaders(token);

  for (const table of tables) {
    const col = TAG_COLUMN[table];
    if (!col) {
      console.warn(`cleanup: no tag column configured for table "${table}" — skipping`);
      continue;
    }
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/${table}?${col}=like.%5BTEST%25`,
      { method: 'DELETE', headers },
    );
    if (!res.ok) {
      const text = await res.text();
      console.warn(`cleanup: DELETE from ${table} failed — ${res.status} ${text}`);
    }
  }
}

/**
 * Return IDs of all non-test active orders with payment = 'unpaid'.
 * Used to snapshot state before markAllPaid tests so it can be restored after.
 */
export async function snapshotUnpaidOrders(): Promise<string[]> {
  const token = await getAuthToken();
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/orders?payment=eq.unpaid&status=neq.completed&name=not.like.%5BTEST%25&select=id`,
    { headers: makeHeaders(token) },
  );
  if (!res.ok) return [];
  const rows: { id: string }[] = await res.json();
  return rows.map(r => r.id);
}

/**
 * Restore orders back to payment = 'unpaid' by ID list.
 * Used after markAllPaid tests to undo collateral changes to real orders.
 */
export async function restoreOrderPayments(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const token = await getAuthToken();
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/orders?id=in.(${ids.join(',')})`,
    {
      method: 'PATCH',
      headers: makeHeaders(token),
      body: JSON.stringify({ payment: 'unpaid' }),
    },
  );
  if (!res.ok) {
    const text = await res.text();
    console.warn(`cleanup: PATCH orders payment failed — ${res.status} ${text}`);
  }
}

/**
 * Delete a specific row by ID. Used for tables without a tag column
 * (e.g. availability_windows).
 */
export async function cleanupById(table: string, id: string): Promise<void> {
  const token = await getAuthToken();
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`,
    { method: 'DELETE', headers: makeHeaders(token) },
  );
  if (!res.ok) {
    const text = await res.text();
    console.warn(`cleanup: DELETE ${table}/${id} failed — ${res.status} ${text}`);
  }
}
