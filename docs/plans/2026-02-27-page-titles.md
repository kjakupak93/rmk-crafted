# Page Titles & Quote Message Fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a visible h2 title to each sub-page content area and remove "from RMK Crafted" from the quote message copy.

**Architecture:** Two targeted HTML/JS edits in `index.html`. No new CSS needed — reuse existing typography patterns. No new JS. No test suite exists for this project.

**Tech Stack:** Vanilla HTML/CSS/JS, single `index.html`, no build step.

---

### Task 1: Add page title headings to all 5 sub-pages

**Files:**
- Modify: `index.html` (pages section, lines ~935–1220)

Each sub-page gets an `<h2>` at the top of its content area. Use this exact markup pattern — inline styles matching the home page heading style:

```html
<h2 style="font-family:'Playfair Display',serif; font-size:22px; color:var(--navy); font-weight:700; margin:0 0 20px;">PAGE TITLE</h2>
```

**Page targets and titles:**

| Page ID | Where to insert | Title text |
|---|---|---|
| `page-quote` | First child inside `<div class="app-container">` (line ~936) | `Quote Calculator` |
| `page-orders` | First child inside `<div class="app-container">` (line ~1031) | `Orders` |
| `page-inventory` | First child inside `<div class="app-container">` | `Inventory & Sales` |
| `page-materials` | First child inside `<div class="app-container">` | `Materials` |
| `page-scheduler` | First child inside `<div class="app-container">` | `Pickup Scheduler` |

Use the Edit tool for each insertion. Read the page section first to identify the exact insertion point.

**Commit:**
```bash
git add index.html
git commit -m "feat: add page title headings to all sub-pages"
```

---

### Task 2: Fix quote message copy

**Files:**
- Modify: `index.html` (JS section, `calculateQuote` function, line ~1769)

**Find:**
```
Hi! Here's your quote from RMK Crafted 🪵
```

**Replace with:**
```
Hi! Here's your quote! 🪵
```

Use the Edit tool for the exact string replacement.

**Commit:**
```bash
git add index.html
git commit -m "fix: remove 'from RMK Crafted' from quote message"
```
