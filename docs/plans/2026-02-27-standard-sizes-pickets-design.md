# Standard Sizes Picket Counts — Design

**Date:** 2026-02-27

## Summary

Add real-world picket counts to 8 of the 10 standard sizes in `STANDARD_SIZES`. The remaining 2 sizes (16×16×16, 36×12×16) already match the formula and need no override.

## Approach

Add an optional `pickets` field to 8 `STANDARD_SIZES` entries. Update `buildStdTable()` and `useStdSize()` to use the hardcoded value when present, falling back to `estPickets()` for custom dimensions and the two formula-accurate sizes. `estPickets()` itself is unchanged.

## Data changes to STANDARD_SIZES

| Size (L×W×H) | Current formula result | Real pickets |
|---|---|---|
| 36×16×16 | (formula) | 6 |
| 36×16×27 | (formula) | 7 |
| 36×24×16 | (formula) | 10 |
| 48×12×16 | (formula) | 7 |
| 48×12×27 | (formula) | 7 |
| 48×16×16 | (formula) | 8 |
| 48×16×27 | (formula) | 9 |
| 48×24×16 | (formula) | 11 |

## Code changes

### STANDARD_SIZES array
Add `pickets` field to the 8 entries above:
```js
{l:36,w:16,h:16,price:60,pickets:6},
{l:36,w:16,h:27,price:70,pickets:7},
// etc.
```

### buildStdTable()
Change:
```js
const est = estPickets(s.l,s.w,s.h);
```
To:
```js
const est = s.pickets || estPickets(s.l,s.w,s.h);
```

### useStdSize(l, w, h, price)
Change the picket pre-fill line from:
```js
document.getElementById('qPickets').value = estPickets(l,w,h);
```
To:
```js
const matched = STANDARD_SIZES.find(s=>s.l===l&&s.w===w&&s.h===h);
document.getElementById('qPickets').value = (matched&&matched.pickets) ? matched.pickets : estPickets(l,w,h);
```

## Not changed
- `estPickets()` formula — unchanged
- `onDimChange()` — still uses formula (custom dimensions)
- `applyMatch()` — still uses formula
- All selling prices
