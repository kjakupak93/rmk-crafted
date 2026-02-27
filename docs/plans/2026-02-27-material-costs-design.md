# Material Cost Update — Design

**Date:** 2026-02-27

## Summary

Update all three material unit costs throughout the app to reflect actual Lowes prices with Oceanside sales tax (8.25%) applied.

## Calculations

| Material | Base price | × 1.0825 | Rounded |
|---|---|---|---|
| Cedar picket | $3.38 | $3.65885 | **$3.66** |
| 2×2 lumber | $2.98 | $3.22585 | **$3.23** |
| 2×4 lumber | $3.85 | $4.167625 | **$4.17** |

## Changes

### JS constant (1 location)
- `UNIT_COSTS = {pickets: 3.65, twobytwo: 4.50, twobyfour: 5.50}`
  → `UNIT_COSTS = {pickets: 3.66, twobytwo: 3.23, twobyfour: 4.17}`

### HTML text references (5 locations)
- Quote page description: `pickets × $3.65` → `pickets × $3.66`
- Stock card — pickets: `$3.65 each` → `$3.66 each`
- Stock card — 2×2: `$4.50 each` → `$3.23 each`
- Stock card — 2×4: `$5.50 each` → `$4.17 each`

### Input defaults (3 locations)
- Purchase modal picket price default: `value="3.65"` → `value="3.66"`
- Vertical style 2×2 cost input default: `4.50` → `3.23`
- Vertical style 2×4 cost input default: `5.50` → `4.17`

## No changes to
- Selling prices (STANDARD_SIZES prices, qPPP default)
- Any business logic or formulas
