# Security Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement all security findings from the audit: XSS escaping, PIN hardening, CSP header, SRI hashes, and booking form input validation.

**Architecture:** Single index.html + schedule.html, vanilla HTML/JS, no build step, GitHub Pages. All fixes are in-file edits. Supabase RLS is the real auth layer; UI fixes add defense-in-depth.

**Tech Stack:** Vanilla JS, Supabase (anon key, RLS), GitHub Pages static hosting

---

## File Map

| File | Changes |
|---|---|
| index.html | Add esc() helper; apply to all innerHTML injection sites; harden PIN gate with attempt lockout; add CSP meta tag; add SRI hashes to CDN scripts |
| schedule.html | Add CSP meta tag; add SRI hash to supabase-js script; add field length validation before booking insert |

---

### Task 1: Add esc() helper to index.html

**Files:**
- Modify: index.html -- add escape helper immediately after the `const sb = supabase.createClient(...)` line (around line 2443)

The esc() function must be defined before any code that calls it. The first call site is at line 3026.

- [ ] Search for `supabase.createClient` in index.html to find the exact line.

- [ ] Insert the esc() helper right after the `const sb = ...` line:

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

- [ ] Verify: grep for `function esc` returns exactly one result.

- [ ] Commit: "security: add esc() HTML escape helper"

---

### Task 2: Fix XSS -- Activity Feed (around line 3026)

Apply esc() to e.icon, e.name, and e.sub in the data.map template that builds the activity feed innerHTML.

- [ ] Apply esc() to all three fields in the activity-item template literal.
- [ ] Commit: "security: escape activity feed innerHTML fields"

---

### Task 3: Fix XSS -- Order Cards (orderCardHTML function, around line 3441)

Fields to escape: o.name, o.contact, o.notes, it.size, it.style, addon labels (a.label).
Safe fields (leave as-is): o.id (UUID), o.status, o.payment (enums), numeric fields.

- [ ] Apply esc() to:
  - o.name in card-title div
  - subtitleItems: it.size, it.style in the itemRows.map, and o.size, o.style in the fallback
  - contactSuffix: o.contact
  - o.notes in the meta-item div
  - addon label strings: a.label and the fallback id

- [ ] Commit: "security: escape order card HTML injection sites"

---

### Task 4: Fix XSS -- Inventory Grid (loadInventory, around line 3894)

Fields: item.size, item.style, item.notes, addon labels.
Safe: item.id, item.price, item.qty (numbers/UUID).

- [ ] Apply esc() to item.size, item.style, item.notes, and addon a.label strings in the inv-card template.
- [ ] Commit: "security: escape inventory grid innerHTML fields"

---

### Task 5: Fix XSS -- Sales Table (renderSalesTable, around line 3988)

Fields: s.size, s.style, s.name, s.notes, s.payment (used as badge text and CSS class suffix).
Safe: s.id, s.sale_date, s.price, s.qty.

Note: s.payment is used both as a CSS class suffix (`badge-${s.payment}`) and as display text. Escape the display text. The CSS class suffix is an enum value but still apply esc() defensively.

- [ ] Apply esc() to s.size, s.style, s.name, s.notes, and s.payment in the sales tbody template.
- [ ] Commit: "security: escape sales table innerHTML fields"

---

### Task 6: Fix XSS -- Purchases Table (around line 4759)

Fields: p.store, p.notes.
Safe: p.purchase_date, numeric fields, p.id.

- [ ] Apply esc() to p.store and p.notes in the purchases tbody template.
- [ ] Commit: "security: escape purchases table innerHTML fields"

---

### Task 7: Fix XSS -- Scheduler Day Slots (HIGHEST RISK, around line 4939)

CRITICAL: b.name, b.contact, b.size, b.notes come from the PUBLIC booking form (schedule.html)
with no authentication required. An attacker can submit a booking with XSS payload right now.
Also escape s.notes in the open-slot card just above.

- [ ] Apply esc() to b.name, b.contact, b.size, b.notes in the booked slot card template.
- [ ] Apply esc() to s.notes in the open slot card template (the line just before the booked section).
- [ ] Commit: "security: escape scheduler day slots innerHTML (highest-risk XSS path)"

---

### Task 8: Fix XSS -- Upcoming Pickups List (loadUpcoming, around line 5098)

Fields: u.name, u.size, u.notes.
Safe: u.booking_date, u.pickup_time, u.amount, u.payment.

- [ ] Apply esc() to u.name, u.size, and u.notes in the pickup-card template.
- [ ] Commit: "security: escape upcoming pickups list innerHTML fields"

---

### Task 9: Fix XSS -- Availability Windows, Cut List Labels, and Stock Type Names

Five sites:

1. Line 5121 -- w.days in availability windows (DB field)
2. Line 4499 -- singleLine (derived from c.label) in cut list piece blocks
3. Line 4533 -- displayLabel (derived from g.label) in cut list legend
4. renderStockTypes() around line 4254 -- s.name in the cl-stock-name span (user-entered locally)
5. addCutRow() around line 4298 -- s.name/s.shortName in option element text (locally stored)

- [ ] Apply esc() to w.days in the window-item template.
- [ ] Apply esc() to singleLine in the sub.innerHTML assignment.
- [ ] Apply esc() to displayLabel in the item.innerHTML assignment.
- [ ] Apply esc() to s.name in the renderStockTypes cl-stock-name span.
- [ ] Apply esc() to stock name/shortName in the option element inside addCutRow.
- [ ] Commit: "security: escape availability windows, cut list labels, and stock type names"

---

### Task 10: Harden PIN Gate

The PIN '1234' is hardcoded in plaintext in a public GitHub repo. Add lockout logic.

NOTE: There is already a `#pin-error` div in the PIN gate HTML -- reuse it, do not add a new element.
Search for `pin-error` to find it. It currently shows static "Incorrect PIN" text; update it to show dynamic messages.

- [ ] Add module-level vars above checkPin():
  let _pinAttempts = 0;
  let _pinLockedUntil = 0;

- [ ] Replace checkPin() with a version that:
  - Checks if Date.now() < _pinLockedUntil and shows a "Wait Ns" message if so
  - On wrong PIN: increments _pinAttempts, sets lockout using delay schedule [0,0,0,5000,15000,30000,60000]
  - Shows remaining attempts count in the existing #pin-error div
  - On correct PIN: resets _pinAttempts to 0, sets sessionStorage, shows app

- [ ] Change the PIN value from '1234' to a non-trivial value the owner will remember.
  Add comment: // NOTE: This PIN is visible in page source. Real security = Supabase RLS.

- [ ] Commit: "security: add PIN lockout after 5 failed attempts"

---

### Task 11: Add Content Security Policy Meta Tags

GitHub Pages does not support HTTP response headers, so use meta tag CSP.

IMPORTANT LIMITATION: `frame-ancestors` is NOT supported in meta tag CSP (W3C spec explicitly
excludes it). It only works in HTTP response headers. Since GitHub Pages cannot set headers,
clickjacking protection via CSP is not achievable -- omit frame-ancestors from the meta tag.
The real protection here is connect-src (blocks XSS from beaconing to attacker servers) and base-uri.

- [ ] Add to index.html head (after charset meta), as a single-line meta tag:
  default-src 'self'
  script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com
  font-src https://fonts.gstatic.com
  img-src 'self' data: blob:
  connect-src https://mfsejmfmyuvhuclzuitc.supabase.co
  base-uri 'self'

  Note: fonts.googleapis.com and fonts.gstatic.com are already covered by style-src and font-src;
  they do not need to be in connect-src.

- [ ] Add the same CSP to schedule.html head (same policy; no chart.js needed there).

- [ ] Commit: "security: add Content-Security-Policy meta tags to both pages"

---

### Task 12: Add SRI Hashes to CDN Scripts

SRI pins the exact bytes of each CDN script. Browser rejects the script if the CDN serves
a different file (supply chain attack protection).

CRITICAL: chart.js uses a floating @4 range. Must pin to exact version first or SRI will
fail as soon as jsDelivr updates the 4.x.x pointer. supabase.js is already pinned @2.49.4 (safe).

- [ ] Step 1: Find the exact chart.js version that @4 currently resolves to:
  curl -sI "https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js" | grep -i location
  (or visit the URL in a browser and note the resolved redirect version, e.g. 4.4.9)

- [ ] Step 2: Compute SRI hashes (use the exact versioned URLs):
  # Supabase (already exact)
  curl -sL "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.4/dist/umd/supabase.min.js" | openssl dgst -sha384 -binary | openssl base64 -A

  # Chart.js -- replace X.X.X with the resolved version from step 1
  curl -sL "https://cdn.jsdelivr.net/npm/chart.js@X.X.X/dist/chart.umd.min.js" | openssl dgst -sha384 -binary | openssl base64 -A

- [ ] Step 3: Update the supabase script tag in index.html -- BOTH the src attribute AND add integrity:
  Old src: https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.4
  New src: https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.4/dist/umd/supabase.min.js
  Add: integrity="sha384-HASH" crossorigin="anonymous"
  (The src URL must exactly match the URL used to compute the hash)

- [ ] Step 4: Update the chart.js script tag in index.html:
  Old src: https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js
  New src: https://cdn.jsdelivr.net/npm/chart.js@X.X.X/dist/chart.umd.min.js (pinned version)
  Add: integrity="sha384-HASH" crossorigin="anonymous"

- [ ] Step 5: Update the supabase script tag in schedule.html with the same pinned src and integrity.

- [ ] Step 6: Verify both pages load correctly in browser. DevTools Network tab: scripts show 200.
  DevTools Console: no CSP or integrity errors. Charts must render in Analytics page.

- [ ] Commit: "security: add SRI integrity hashes to CDN script tags"

---

### Task 13: Booking Form Input Validation (schedule.html)

Add client-side length validation before the Supabase insert in the public booking form.
This limits the size of stored payloads (combined with escaping from Tasks 7-8 for rendering).

- [ ] Find the booking submit function in schedule.html (search for the Supabase insert call).

- [ ] Add these checks before the insert. Use the field variables already in scope:
  if (name.length > 100) { showError('Name must be 100 characters or less.'); return; }
  if (contact.length > 100) { showError('Contact info must be 100 characters or less.'); return; }
  if (notes.length > 500) { showError('Notes must be 500 characters or less.'); return; }

- [ ] Add maxlength HTML attributes to the input/textarea elements:
  name input: maxlength="100"
  contact input: maxlength="100"
  notes textarea: maxlength="500"

- [ ] Commit: "security: add field length validation to public booking form"

---

### Task 14: Push and verify deployment

- [ ] git push origin main

- [ ] Wait ~60 seconds for GitHub Pages deploy.

- [ ] Verify in live app:
  - PIN gate: wrong PIN shows error with remaining attempts; 5th wrong attempt shows lockout
  - All pages navigate correctly
  - Orders, Scheduler, Sales, Purchases render real data with no visual regressions
  - Cut list diagram renders correctly
  - DevTools console: no CSP violation errors
  - DevTools network: CDN scripts show 200 with no integrity errors in console
  - Analytics page: charts render (chart.js loaded correctly)

- [ ] Verify schedule.html: open the public booking page, confirm form loads and submits.
  Check console for CSP errors.

---

## Security Posture After This Plan

| Finding | Before | After |
|---|---|---|
| Stored XSS via innerHTML | Unescaped everywhere | esc() applied to all DB-sourced fields |
| Public booking form XSS | Direct stored XSS path | Escaped at render; length-capped at input |
| PIN hardcoded 1234 | Trivially bypassable | New PIN + 5-attempt lockout |
| No CSP | No browser protection | connect-src blocks exfiltration to unknown domains; base-uri blocks base tag injection |
| Clickjacking | No protection | NOT fixable on GitHub Pages (frame-ancestors requires HTTP headers, not meta CSP) |
| No SRI on CDN scripts | Supply chain vulnerable | Pinned to exact hash |
| Booking form no validation | Unlimited input size | 100/100/500 char limits |
