# Security Fixes (Critical + High) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all Critical and High severity findings from the 2026-03-22 security audit — replace PIN auth with Supabase Auth, harden RLS, add booking tokens, and eliminate two XSS vectors plus Google Fonts supply-chain exposure.

**Architecture:** The dashboard migrates from a client-side PIN gate (UI-only) to Supabase Auth email/password, which issues a real server-validated session. All business-data tables gain RLS policies requiring an authenticated session. The public booking page (`schedule.html`) gets scoped anon-only RLS access via a new `booking_token` column (random UUID, separate from `order.id`) so customers never see internal order IDs. Two XSS sinks in the cut-list and purchase renderers are patched from full-object `onclick` injection to ID-only lookups against in-memory arrays. The Google Fonts `<link>` dependency is replaced with self-hosted font files, eliminating the external stylesheet without SRI.

**Tech Stack:** Supabase Auth (email+password), Supabase RLS policies, vanilla JS, WOFF2 self-hosted fonts, Playwright e2e.

---

## Files Modified

| File | Changes |
|---|---|
| `index.html` | Replace PIN gate HTML+JS with Supabase Auth form; add sign-out; fix cut-list onclick XSS; fix purchase onclick XSS; fix `sub` inner content → DOM textContent; replace Google Fonts link with local; update CSP |
| `schedule.html` | Replace `?order=` with `?token=`; query orders by `booking_token`; replace Google Fonts link with local; update CSP |
| `fonts/fonts.css` | New: @font-face declarations for self-hosted fonts |
| `fonts/*.woff2` | New: Playfair Display, DM Mono, DM Sans font files |
| `tests/auth.spec.ts` | Update to use email/password instead of PIN |
| `tests/helpers/auth.ts` | Update login() helper to use email/password |

---

## Task 1: Supabase Auth — Create User + Update RLS

**Files:** Supabase database (via MCP)

This task has no UI changes — it's all backend. Do it first so you can verify RLS is working before touching the frontend.

- [ ] **Step 1: Create the Supabase Auth user via SQL**

  Use the `mcp__claude_ai_Supabase__execute_sql` tool on project `mfsejmfmyuvhuclzuitc`:

  ```sql
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, last_sign_in_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'ryan@rmkcrafted.com',
    crypt('RMK_ChangeMe_2026!', gen_salt('bf')),
    NOW(), NOW(),
    '{"provider":"email","providers":["email"]}', '{}',
    NOW(), NOW(),
    '', '', '', ''
  );
  ```

  Verify: `SELECT id, email, email_confirmed_at FROM auth.users WHERE email = 'ryan@rmkcrafted.com';`

- [ ] **Step 2: Lock down business-data tables to authenticated users only**

  Run via `mcp__claude_ai_Supabase__apply_migration` (name: `security_auth_rls`):

  ```sql
  -- Drop all existing policies on business tables
  DO $$
  DECLARE r RECORD;
  BEGIN
    FOR r IN
      SELECT schemaname, tablename, policyname
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename IN ('orders','sales','purchases','inventory','stock',
                          'cut_lists','quotes','availability_windows',
                          'schedule_slots','schedule_bookings','activity_log')
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
        r.policyname, r.schemaname, r.tablename);
    END LOOP;
  END $$;

  -- Enable RLS on all tables (idempotent)
  ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
  ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
  ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
  ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
  ALTER TABLE stock ENABLE ROW LEVEL SECURITY;
  ALTER TABLE cut_lists ENABLE ROW LEVEL SECURITY;
  ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
  ALTER TABLE availability_windows ENABLE ROW LEVEL SECURITY;
  ALTER TABLE schedule_slots ENABLE ROW LEVEL SECURITY;
  ALTER TABLE schedule_bookings ENABLE ROW LEVEL SECURITY;
  ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

  -- Authenticated user: full access to all business tables
  CREATE POLICY "auth_all" ON orders            FOR ALL TO authenticated USING (true) WITH CHECK (true);
  CREATE POLICY "auth_all" ON sales             FOR ALL TO authenticated USING (true) WITH CHECK (true);
  CREATE POLICY "auth_all" ON purchases         FOR ALL TO authenticated USING (true) WITH CHECK (true);
  CREATE POLICY "auth_all" ON inventory         FOR ALL TO authenticated USING (true) WITH CHECK (true);
  CREATE POLICY "auth_all" ON stock             FOR ALL TO authenticated USING (true) WITH CHECK (true);
  CREATE POLICY "auth_all" ON cut_lists         FOR ALL TO authenticated USING (true) WITH CHECK (true);
  CREATE POLICY "auth_all" ON quotes            FOR ALL TO authenticated USING (true) WITH CHECK (true);
  CREATE POLICY "auth_all" ON availability_windows FOR ALL TO authenticated USING (true) WITH CHECK (true);
  CREATE POLICY "auth_all" ON schedule_slots    FOR ALL TO authenticated USING (true) WITH CHECK (true);
  CREATE POLICY "auth_all" ON schedule_bookings FOR ALL TO authenticated USING (true) WITH CHECK (true);
  CREATE POLICY "auth_all" ON activity_log      FOR ALL TO authenticated USING (true) WITH CHECK (true);

  -- Anon: schedule.html needs read + write on orders, insert on schedule_bookings
  CREATE POLICY "anon_orders_select" ON orders
    FOR SELECT TO anon USING (true);

  CREATE POLICY "anon_orders_update_booking" ON orders
    FOR UPDATE TO anon USING (true) WITH CHECK (true);

  CREATE POLICY "anon_bookings_insert" ON schedule_bookings
    FOR INSERT TO anon WITH CHECK (true);
  ```

  > Note: The `orders` anon policies are intentionally permissive for now. Task 3 (booking tokens) narrows them to token-based access.

- [ ] **Step 3: Verify RLS blocks anon access to restricted tables**

  ```sql
  SET ROLE anon;
  SELECT count(*) FROM cut_lists;   -- must return 0
  SELECT count(*) FROM purchases;   -- must return 0
  SELECT count(*) FROM sales;       -- must return 0
  RESET ROLE;
  ```

  Expected: all return 0.

- [ ] **Step 4: Commit**

  ```bash
  git add -A
  git commit -m "security: create Supabase Auth user + harden RLS on all business tables"
  ```

---

## Task 2: Replace PIN Gate with Supabase Auth Login Form

**Files:** `index.html:1465-1530`, `tests/auth.spec.ts`, `tests/helpers/auth.ts`

- [ ] **Step 1: Replace PIN gate HTML (line ~1465)**

  Find `<div id="pin-gate"` and replace the entire block through its closing `</div>` with:

  ```html
  <div id="pin-gate" style="display:none;position:fixed;inset:0;background:#1E4D6B;z-index:99999;flex-direction:column;align-items:center;justify-content:center;gap:16px;">
    <img src="icon.png" alt="RMK Crafted" style="width:72px;height:72px;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.3)">
    <div style="color:white;font-family:'Playfair Display',serif;font-size:22px;font-weight:700">RMK Crafted</div>
    <div style="display:flex;flex-direction:column;gap:10px;width:280px">
      <input id="auth-email" type="email" autocomplete="email" placeholder="Email"
        style="padding:12px 16px;border-radius:10px;border:2px solid rgba(255,255,255,0.3);background:rgba(255,255,255,0.12);color:white;font-size:15px;outline:none;font-family:'DM Sans',sans-serif;"
        onkeydown="if(event.key==='Enter')signIn()">
      <input id="auth-password" type="password" autocomplete="current-password" placeholder="Password"
        style="padding:12px 16px;border-radius:10px;border:2px solid rgba(255,255,255,0.3);background:rgba(255,255,255,0.12);color:white;font-size:15px;outline:none;font-family:'DM Sans',sans-serif;"
        onkeydown="if(event.key==='Enter')signIn()">
    </div>
    <button onclick="signIn()" style="padding:12px 40px;background:#C9A55A;color:white;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;">Sign In</button>
    <div id="auth-error" style="display:none;color:#ffcdd2;font-size:13px;font-family:'DM Sans',sans-serif;text-align:center;max-width:260px"></div>
  </div>
  ```

- [ ] **Step 2: Replace the PIN gate script block (line ~1475)**

  Find the `<script>` block that starts with `(function() { document.getElementById('pin-gate').style.display = 'flex';` and ends with `</script>`. Replace the entire block with:

  ```html
  <script>
    // Show gate immediately; hide once session confirmed
    document.getElementById('pin-gate').style.display = 'flex';
    document.body.style.overflow = 'hidden';

    sb.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        document.getElementById('pin-gate').style.display = 'none';
        document.body.style.overflow = '';
      }
    });

    sb.auth.onAuthStateChange((event, session) => {
      if (session) {
        document.getElementById('pin-gate').style.display = 'none';
        document.body.style.overflow = '';
      } else {
        document.getElementById('pin-gate').style.display = 'flex';
        document.body.style.overflow = 'hidden';
      }
    });

    async function signIn() {
      const email = document.getElementById('auth-email').value.trim();
      const password = document.getElementById('auth-password').value;
      const errEl = document.getElementById('auth-error');
      errEl.style.display = 'none';
      if (!email || !password) {
        errEl.textContent = 'Email and password are required.';
        errEl.style.display = 'block';
        return;
      }
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) {
        errEl.textContent = error.message || 'Sign in failed.';
        errEl.style.display = 'block';
        document.getElementById('auth-password').value = '';
      }
    }
  </script>
  ```

- [ ] **Step 3: Add sign-out button to the app header (line ~1530)**

  Find `<button id="dark-toggle"`. Add a sign-out button next to it:

  ```html
  <button onclick="sb.auth.signOut()" title="Sign out"
    style="background:none;border:none;color:rgba(255,255,255,0.7);font-size:20px;cursor:pointer;padding:8px;border-radius:8px;line-height:1;"
    aria-label="Sign out">⏏</button>
  ```

- [ ] **Step 4: Update `tests/auth.spec.ts`**

  Replace the file contents:

  ```ts
  import { test, expect } from '@playwright/test';

  test('wrong credentials show error', async ({ page }) => {
    await page.goto('/');
    await page.fill('#auth-email', 'wrong@example.com');
    await page.fill('#auth-password', 'wrongpassword');
    await page.press('#auth-password', 'Enter');
    await expect(page.locator('#auth-error')).toBeVisible({ timeout: 8000 });
  });

  test('correct credentials dismiss gate and show home page', async ({ page }) => {
    await page.goto('/');
    await page.fill('#auth-email', 'ryan@rmkcrafted.com');
    await page.fill('#auth-password', 'RMK_ChangeMe_2026!');
    await page.press('#auth-password', 'Enter');
    await page.locator('#pin-gate').waitFor({ state: 'hidden', timeout: 15000 });
    await expect(page.locator('#page-home')).toBeVisible();
  });
  ```

- [ ] **Step 5: Update `tests/helpers/auth.ts`**

  ```ts
  import { Page } from '@playwright/test';

  export async function login(page: Page) {
    await page.goto('/');
    // If already authenticated (session cookie present), gate may already be hidden
    const gate = page.locator('#pin-gate');
    const gateVisible = await gate.isVisible().catch(() => false);
    if (gateVisible) {
      await page.fill('#auth-email', 'ryan@rmkcrafted.com');
      await page.fill('#auth-password', 'RMK_ChangeMe_2026!');
      await page.press('#auth-password', 'Enter');
      await gate.waitFor({ state: 'hidden', timeout: 15000 });
    }
  }
  ```

- [ ] **Step 6: Run auth smoke tests**

  ```bash
  npx playwright test --project=smoke tests/auth.spec.ts
  ```

  Expected: 2 passed.

- [ ] **Step 7: Run full smoke + e2e suite**

  ```bash
  npx playwright test
  ```

  Expected: all pass. The e2e helpers now use email/password; Supabase Auth session is preserved across page navigations in the same test.

- [ ] **Step 8: Commit**

  ```bash
  git add index.html tests/auth.spec.ts tests/helpers/auth.ts
  git commit -m "security(crit-1+2): replace PIN gate with Supabase Auth email/password login"
  ```

---

## Task 3: Booking Tokens — HIGH-1

**Files:** `index.html`, `schedule.html`

Prevents `?order=<uuid>` from being used to read any order by ID. After this, the booking link carries a separate random UUID that can't enumerate internal order IDs.

- [ ] **Step 1: Add `booking_token` column to orders**

  Via `mcp__claude_ai_Supabase__apply_migration` (name: `add_booking_token`):

  ```sql
  ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS booking_token UUID DEFAULT gen_random_uuid();

  UPDATE orders SET booking_token = gen_random_uuid() WHERE booking_token IS NULL;

  ALTER TABLE orders ALTER COLUMN booking_token SET NOT NULL;

  CREATE INDEX IF NOT EXISTS orders_booking_token_idx ON orders (booking_token);
  ```

- [ ] **Step 2: Tighten anon RLS on orders to token-presence only**

  Via `mcp__claude_ai_Supabase__apply_migration` (name: `booking_token_rls`):

  ```sql
  DROP POLICY IF EXISTS "anon_orders_select" ON orders;
  DROP POLICY IF EXISTS "anon_orders_update_booking" ON orders;

  -- Anon can read/update only orders where booking_token is not null
  -- (all orders have it; this prevents accidentally exposing rows without tokens)
  CREATE POLICY "anon_orders_select_by_token" ON orders
    FOR SELECT TO anon USING (booking_token IS NOT NULL);

  CREATE POLICY "anon_orders_update_by_token" ON orders
    FOR UPDATE TO anon
    USING (booking_token IS NOT NULL)
    WITH CHECK (true);
  ```

- [ ] **Step 3: Update `copyBookingLink()` in `index.html` to use `booking_token`**

  Find `function copyBookingLink(orderId, e)` (line ~5333). Replace the URL construction line:

  ```js
  // BEFORE
  const url = base + 'schedule.html?order=' + orderId;

  // AFTER — look up booking_token from in-memory orders array
  const orderObj = (window._allOrders || []).find(o => o.id === orderId);
  const token = orderObj?.booking_token || orderId; // fallback to id if token missing
  const url = base + 'schedule.html?token=' + token;
  ```

  Also find where orders are stored in-memory. Search for `allOrders =` or similar:

  ```bash
  grep -n "allOrders\s*=\|let allOrders\b" index.html | head -5
  ```

  If the variable is named differently, adjust the `find()` call accordingly. Also ensure `booking_token` is included in the `select()` call in `loadOrders()`:

  ```bash
  grep -n "from('orders').select" index.html
  ```

  If `select('*')` is used, `booking_token` is automatically included. If it's an explicit field list, add `booking_token` to it.

- [ ] **Step 4: Update `schedule.html` to use `?token=` parameter**

  Find `init()` (line ~634). Replace the `orderId = params.get('order')` block through the first `orders.select()` call with:

  ```js
  const bookingToken = params.get('token') || params.get('order'); // ?order= fallback for old links

  if (!bookingToken) {
    showError('No order linked', 'This link doesn\'t have an order attached. Ask RMK Crafted to resend your booking link.');
    return;
  }

  let data, error;
  if (params.get('token')) {
    ({ data, error } = await sb.from('orders').select('*').eq('booking_token', bookingToken).maybeSingle());
  } else {
    // Legacy ?order=<id> links
    ({ data, error } = await sb.from('orders').select('*').eq('id', bookingToken).maybeSingle());
  }

  if (error || !data) {
    showError('Order not found', 'We couldn\'t find your order. This link may be invalid or expired.');
    return;
  }

  orderId = data.id;
  order = data;
  ```

- [ ] **Step 5: Verify booking flow end-to-end**

  - Open dashboard, create a test order, copy its booking link.
  - Confirm link URL contains `?token=<uuid>` not `?order=<uuid>`.
  - Open the link and complete a booking — verify it succeeds and creates a `schedule_bookings` row.

- [ ] **Step 6: Run e2e scheduler tests**

  ```bash
  npx playwright test --project=e2e tests/e2e/scheduler.spec.ts
  ```

  Expected: 10 passed.

- [ ] **Step 7: Commit**

  ```bash
  git add index.html schedule.html
  git commit -m "security(high-1): add booking_token to orders; schedule.html uses ?token= instead of ?order="
  ```

---

## Task 4: Fix onclick XSS in Cut List and Purchase Renderers — HIGH-2

**Files:** `index.html:4731-4758` (cut list), `index.html:4856-4870` (purchases)

Both rendering functions serialize full DB objects into `onclick` HTML attributes. A single-quote in any text field breaks out of the JS string. Fix: keep data in module-level arrays; put only the record ID in the attribute.

- [ ] **Step 1: Add `allCutLists` module-level array**

  Find `let allPurchases = [];` (line ~4052). Add below it:

  ```js
  let allCutLists = [];
  ```

- [ ] **Step 2: Update `loadSavedCutLists` to populate `allCutLists` and use ID-only onclick**

  Find `async function loadSavedCutLists()` (line ~4731). Change two things:
  1. After `const { data } = await sb.from(...)`, add `allCutLists = data || [];`
  2. Replace `const safeData = JSON.stringify(cl).replace(/"/g, '&quot;');` and the Load button's onclick:

  ```js
  // REMOVE these two lines:
  // const safeData = JSON.stringify(cl).replace(/"/g, '&quot;');
  // onclick="loadCutList(${safeData})"

  // REPLACE Load button onclick with:
  // onclick="loadCutList('${cl.id}')"
  ```

  The delete button is already ID-only (`onclick="deleteCutList('${cl.id}')"`) — leave it unchanged.

- [ ] **Step 3: Update `loadCutList` to accept an ID**

  Find `function loadCutList(cl)` (line ~4763). Add an ID-lookup at the top:

  ```js
  function loadCutList(idOrObj) {
    const cl = typeof idOrObj === 'string'
      ? allCutLists.find(x => x.id === idOrObj)
      : idOrObj;
    if (!cl) { showToast('Cut list not found', 'error'); return; }
    // ... rest of function unchanged
  ```

- [ ] **Step 4: Update `renderPurchaseList` to use ID-only editPurchase onclick**

  Find the purchase row template inside `renderPurchaseList` (line ~4856). Replace the edit button:

  ```js
  // REMOVE:
  // onclick="editPurchase(${JSON.stringify(p).replace(/"/g,'&quot;')})"

  // REPLACE with:
  // onclick="editPurchase('${p.id}')"
  ```

- [ ] **Step 5: Update `editPurchase` to look up from `allPurchases`**

  Find `function editPurchase(item)` (line ~4903). Replace with:

  ```js
  function editPurchase(idOrItem) {
    const item = typeof idOrItem === 'string'
      ? allPurchases.find(p => p.id === idOrItem)
      : idOrItem;
    if (!item) { showToast('Purchase not found', 'error'); return; }
    openPurchaseModal(item);
  }
  ```

- [ ] **Step 6: Run e2e materials tests**

  ```bash
  npx playwright test --project=e2e tests/e2e/materials.spec.ts
  ```

  Expected: 8 passed. The "edit purchase" and "load cut list" tests verify both paths.

- [ ] **Step 7: Commit**

  ```bash
  git add index.html
  git commit -m "security(high-2): fix onclick XSS — cut list and purchase renderers use ID-only onclick"
  ```

---

## Task 5: Fix `textContent` in Cut List Board Diagram — HIGH-3

**Files:** `index.html:4596-4597`

The cut-piece label inside the board diagram uses the DOM `sub` element's inner content property to inject `singleLine`, which contains unescaped `dimStr` from DB JSONB. Replace with DOM `textContent` which is XSS-safe by design.

- [ ] **Step 1: Replace inner content assignment with DOM textContent**

  Find this line (line ~4597):

  ```js
  sub.innerHTML = `<span style="...">${singleLine}</span>`;
  ```

  Replace with:

  ```js
  const labelSpan = document.createElement('span');
  labelSpan.style.cssText = 'font-size:11px;font-family:\'DM Mono\',monospace;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:white;max-width:100%';
  labelSpan.textContent = c.label ? `${dimStr} — ${c.label}` : dimStr;
  sub.appendChild(labelSpan);
  ```

  Note: `textContent` treats the value as plain text — no escaping needed, no XSS possible.

- [ ] **Step 2: Run e2e test to verify the diagram still renders**

  ```bash
  npx playwright test --project=e2e tests/e2e/materials.spec.ts --grep "board diagram"
  ```

  Expected: 1 passed.

- [ ] **Step 3: Commit**

  ```bash
  git add index.html
  git commit -m "security(high-3): replace DOM inner content property with textContent in cut list diagram"
  ```

---

## Task 6: Self-Host Google Fonts — HIGH-4

**Files:** `index.html:5,14`, `schedule.html:5,10`, `fonts/fonts.css` (new), `fonts/*.woff2` (new)

Google Fonts CSS changes per user-agent, making SRI (integrity hash) impossible for the stylesheet link. Self-hosting eliminates the external dependency entirely.

- [ ] **Step 1: Download WOFF2 font files**

  Run from the project root:

  ```bash
  mkdir -p fonts
  UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36"

  curl -sA "$UA" "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&display=swap" > /tmp/pf.css
  curl -sA "$UA" "https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,400;0,500&display=swap" > /tmp/dm.css
  curl -sA "$UA" "https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap" > /tmp/ds.css

  # Download each WOFF2 referenced in the CSS
  for css in /tmp/pf.css /tmp/dm.css /tmp/ds.css; do
    grep -oE 'https://fonts\.gstatic\.com/[^)]+\.woff2' "$css" | while read url; do
      filename=$(basename "$url")
      curl -sL "$url" -o "fonts/$filename"
    done
  done

  echo "Downloaded $(ls fonts/*.woff2 2>/dev/null | wc -l) font files"
  ```

- [ ] **Step 2: Create `fonts/fonts.css`**

  Combine the `@font-face` blocks from `/tmp/pf.css`, `/tmp/dm.css`, `/tmp/ds.css`, updating each `src: url(...)` to use the local filename (just the basename, no path prefix needed since the CSS is in `fonts/`):

  ```bash
  # Combine all @font-face blocks, replacing remote URLs with local paths
  python3 - << 'EOF'
  import re, os

  out = []
  for path in ['/tmp/pf.css', '/tmp/dm.css', '/tmp/ds.css']:
      with open(path) as f:
          css = f.read()
      # Replace full gstatic URLs with just the filename
      css = re.sub(r'https://fonts\.gstatic\.com/[^\s)]+/([^/)]+\.woff2)', r'\1', css)
      out.append(css)

  with open('fonts/fonts.css', 'w') as f:
      f.write('\n'.join(out))
  print("fonts/fonts.css written")
  EOF
  ```

- [ ] **Step 3: Replace Google Fonts link in `index.html`**

  Find line 14:
  ```html
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet">
  ```

  Replace with:
  ```html
  <link rel="stylesheet" href="fonts/fonts.css">
  ```

- [ ] **Step 4: Replace Google Fonts links in `schedule.html`**

  Remove all three Google Fonts tags (lines ~8–10):
  ```html
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?..." rel="stylesheet" />
  ```

  Replace with:
  ```html
  <link rel="stylesheet" href="fonts/fonts.css">
  ```

- [ ] **Step 5: Update CSP in `index.html` (line 5)**

  Change:
  ```
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com;
  ```
  To:
  ```
  style-src 'self' 'unsafe-inline'; font-src 'self';
  ```

  Apply the same change to `schedule.html` line 5.

  > `'unsafe-inline'` in `script-src` remains — removing it requires externalizing all JS (major refactor, out of scope). This is documented as a known remaining risk.

- [ ] **Step 6: Verify fonts render correctly**

  ```bash
  python3 -m http.server 8080 --directory .
  ```

  Open http://localhost:8080 and http://localhost:8080/schedule.html. Check:
  - Logo/headers use Playfair Display (serif)
  - Price/quantity fields use DM Mono (monospaced)
  - Body text uses DM Sans (sans-serif)
  - No console errors

- [ ] **Step 7: Run full test suite**

  ```bash
  npx playwright test
  ```

  Expected: all pass.

- [ ] **Step 8: Commit**

  ```bash
  git add fonts/ index.html schedule.html
  git commit -m "security(high-4): self-host Playfair Display/DM Mono/DM Sans fonts; remove Google Fonts dependency + update CSP"
  ```

---

## Task 7: Final Verification + Push

- [ ] **Step 1: Run full test suite**

  ```bash
  npx playwright test
  ```

  Expected: all pass (22 smoke + 42 e2e).

- [ ] **Step 2: Update `CLAUDE.md` — remove stale PIN gate docs, add auth note**

  In the `Known Bugs / Patterns` section, remove the "Pin-Gate (auth screen)" entry. Add a note to the App Structure section:

  ```markdown
  ### Authentication
  Dashboard uses Supabase Auth (email/password). Session is managed by the Supabase JS client and persisted in localStorage. The `#pin-gate` div is shown/hidden via `sb.auth.onAuthStateChange()`. Sign-out clears the session and re-shows the gate.
  ```

- [ ] **Step 3: Push to GitHub**

  ```bash
  git push origin main
  ```

---

## Remaining Known Risks (Out of Scope for This Plan)

| Finding | Reason deferred |
|---|---|
| MED-4: TOCTOU race on booking | Requires Edge Function — separate architectural task |
| INFO-1: `unsafe-inline` in `script-src` | Requires externalizing all JS — major refactor |
| LOW-4: `localStorage` shared across GitHub Pages subdomain | Requires custom domain setup |
| MED-1: Two Supabase keys | Consolidate after auth migration stabilizes |
