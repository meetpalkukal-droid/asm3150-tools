# Development Guide

Conventions this site follows, how to add a new tool, and notes on textbook data that
turned out to need correcting during development. Written for whoever (human or AI
assistant) adds the next tool — read this before building one from scratch.

## Conventions

### Shared modules

- **`assets/js/units.js`** — the single source of truth for unit conversions. Defines
  `UNIT_CATEGORIES` (`volume`, `flow`, `length`, `area`, `time`, `velocity`, `mass`),
  each with a base unit and a `toBase` factor per unit. Helpers:
  `convertValue(category, fromUnit, toUnit, value)`,
  `toBaseValue(category, unit, value)`, `fromBaseValue(category, unit, valueInBase)`,
  `formatNumber(n)` (thousands separators, adaptive decimal places),
  `populateUnitSelect(selectEl, category, defaultUnit)`.
  All factors are precise (not the rounded classroom values from Table 3.1), so chained
  conversions across tools stay internally consistent. **Never hardcode a conversion
  factor in a tool file** — add it to `units.js` if it's missing, then reuse it.
- **`assets/js/soil-data.js`** — Table 2.3 soil-texture data (`SOIL_TEXTURES`,
  `soilTextureByKey(key)`, `populateSoilTextureSelect(selectEl, includeBlankOption)`).
  Reused by the soil-texture lookup tool and as an "auto-fill" convenience in the
  scheduling tool.
- **`assets/js/site.js`** — sets the footer year, and defines
  `renderMathFormulas()`, which finds every `[data-latex]` element on the page and
  renders it with KaTeX (see below). Runs once on `DOMContentLoaded`; any tool that
  changes a formula's LaTeX after load must call it again itself.

### Page structure and CSS classes (`assets/css/style.css`)

Every tool page follows the same skeleton: site header → breadcrumb → page intro →
one or more `.panel` sections (usually "Calculator" then "About this calculator") →
footer. Reuse these classes rather than inventing new ones:

- `.panel` — a card section with a heading.
- `.field`, `.value-unit-pair` — a labeled input, optionally paired with a unit
  `<select>` (grid: value input + unit dropdown).
- `.solve-for` — the pill-style radio group used when a tool can solve for more than
  one variable (see "Two UI patterns" below).
- `.toggle-row` — a checkbox + label row for "enter X directly instead" style options.
- `.result-box` / `.stats-grid` + `.stat-tile` — a single highlighted answer, or a grid
  of several stat tiles when a tool reports multiple outputs at once.
- `.formula-box` — a highlighted equation display. **Must carry a `data-latex`
  attribute** (see "Math rendering" below); never put raw formula text/HTML entities in
  here directly.
- `.example-box` — the "Textbook Example X.X" callout near the bottom of the Calculator
  panel.
- `.warning-box` — for out-of-range/edge-case warnings (e.g. a lookup table's
  documented range, an over-capacity infiltration profile).
- `.field--hidden` — utility class (`display: none !important`) for hiding fields based
  on solve-for/toggle state. **Important:** if you also need a non-default `display`
  value (e.g. `flex`) on the same element for when it's visible, put that in a CSS class
  (like `.totalizer-row`), never an inline `style="display:..."` — an inline style beats
  `.field--hidden`'s `!important` and the element won't actually hide. This exact bug
  happened once during development; see the git history for
  `depth-volume-area.html`/`.js` if you want the details.

### Two UI patterns

1. **Solve-for** (radio group + hide/show): use when the underlying equation is
   genuinely invertible and users plausibly want any variable as the unknown (e.g.
   `d = V/A` → solve for depth, volume, or area). Pattern: a `.solve-for` radio group,
   one `.field` per variable (the one being solved for gets `.field--hidden`), a
   `currentTarget()` function reading the checked radio, an `updateVisibility()`
   function toggling fields and updating the formula display, and a `calculate()`
   function that branches on the target.
2. **Forward pipeline** (no solve-for): use when the calculation is a natural
   step-by-step chain with one clear output, not a symmetric equation (e.g. mass water
   content → volumetric water content → depth → irrigation need). Each step's `.panel`
   shows its own formula and result; later steps read earlier steps' computed values
   directly. Optional `.toggle-row`s let a step take a direct value instead of computing
   it from raw inputs (e.g. "enter bulk density directly instead of mass & volume").

Tools with a genuinely large or variable-length dataset (catch-can readings, soil
layers, fields sharing a well) use a **dynamic row table** instead of either pattern
above: a JS array of row objects, a `render*()` function that rebuilds the `<tbody>` and
wires up input listeners per row, and add/remove-row buttons. See
`catch-can-uniformity.js`, `infiltration-deep-percolation.js`, or
`farm-well-discharge.js` for the pattern.

### Math rendering (KaTeX)

Every page with a formula loads KaTeX from a CDN:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
...
<script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
<script src="../assets/js/site.js"></script>
```

(`katex.min.js` must load — as a plain blocking script, not `defer` — before `site.js`
and the tool's own script, since a tool's initial `calculate()` call may render math
immediately.)

Any element meant to show a formula gets a `data-latex="..."` attribute holding LaTeX
source, plus a plain-text/HTML-entity fallback as its content (shown briefly before
KaTeX replaces it, and shown if the CDN is unreachable):

```html
<p class="formula-box" data-latex="DU = \dfrac{d_{LQ}}{d_z} \times 100\%">
  DU = d<sub>LQ</sub> / d<sub>z</sub> &times; 100%
</p>
```

`renderMathFormulas()` (in `site.js`) renders every `[data-latex]` element on
`DOMContentLoaded` — block-level `.formula-box` elements render in KaTeX display mode
automatically. If a tool changes a formula dynamically (the solve-for pattern's formula
display), set the new `data-latex` value and call `renderMathFormulas()` again:

```js
formulaDisplay.setAttribute("data-latex", FORMULAS[target]);
renderMathFormulas();
```

### "Load textbook Example X.X" buttons

Every tool has at least one. They exist for two reasons: they let students check their
own hand calculations against the tool, and they're the backbone of this project's
testing (see below) — if the button's numbers don't match the book, something is wrong.

## Adding a new tool

1. Read the relevant textbook chapter/example(s) closely — pull the exact given/find/
   solution numbers, not just the equation. **Verify transcribed numbers against the
   actual PDF page**, not just a text extraction (`pdftotext -layout`) — dense tables
   especially can come out garbled or with columns merged; render the page as an image
   (`pdftoppm -png -r 250 -f <page> -l <page> "asabe textbook.pdf" out`) and read it
   directly before trusting any table you transcribe. This project's own Table 3.1 (see
   below) had exactly this problem.
2. Decide which UI pattern fits (solve-for vs. forward pipeline vs. dynamic table — see
   above) based on whether the underlying equation is symmetric/invertible.
3. Copy the structure of an existing tool that uses the same pattern rather than
   starting from scratch — `depth-volume-area.html`/`.js` for solve-for,
   `soil-water-content-depth.html`/`.js` for forward pipeline,
   `infiltration-deep-percolation.html`/`.js` for a dynamic table.
4. Reuse `units.js` categories for every unit conversion; add a new category there
   (never inline) if one is missing.
5. Give every formula a `data-latex` attribute (see above).
6. Add a "Load textbook Example X.X" button that reproduces the book's own numbers.
7. Write an "About this calculator" panel explaining the equation and citing the
   textbook chapter/equation number(s).
8. Add a homepage card in `index.html`, in the right chapter section (or a new one).
9. **Test it before calling it done** — see below. This is not optional for a course
   tool: a wrong answer here is a wrong answer on a student's homework.

## Testing approach

There's no formal test suite/CI — testing is done interactively during development
using a headless-browser + Chrome DevTools Protocol (CDP) loop:

1. Launch headless Edge with remote debugging:
   `msedge --headless=new --disable-gpu --remote-debugging-port=<port> <file-url>`.
2. Get the page's `webSocketDebuggerUrl` from `http://localhost:<port>/json`.
3. Drive it with a small `Runtime.evaluate` wrapper script (send a JS expression over
   the WebSocket, read back `result.value`) — this lets you click buttons, fill fields,
   dispatch `input`/`change` events, and read back computed results exactly as a
   student's browser would, not just re-derive the same formula in a different language.
4. Write assertions as plain JS returning `{passCount, total, results}` JSON, run
   through the wrapper, and check every one passes. Cover: the "Load Example" button's
   result against the textbook; round-trips (solve A from B, then B from the result,
   confirm you're back at A); unit-robustness (same physical scenario in different
   units should give the same answer); and deliberately adversarial edge cases (zero,
   empty, out-of-range, saturated/degenerate inputs) — the calculator should show `—`
   or a clear warning, never `NaN`/`Infinity`/garbage.
5. For anything with a real hand-computed expected value, verify it independently first
   (e.g. in a throwaway script) rather than trusting the tool's own output as ground
   truth.

## Known textbook/source-data errata found during development

These are genuine mistakes in the source material, confirmed by direct inspection —
not something to "fix" by guessing, but worth knowing so nobody re-litigates them from
scratch, and so the reasoning is visible to anyone who notices a tool's reference table
doesn't match a scan of their own copy of the book.

- **Table 3.1** (`tools/unit-converter.html`), two cells contain values that don't hold
  up dimensionally, confirmed by rendering the actual PDF page at 400 DPI (not text
  extraction): "1 cms = 16.7 L/min" (1 cms is 1 m³/s = 60,000 L/min — 16.7 mL/s is what
  1 L/min actually equals), and "1 gal/h = 63.1 mL/s" (63.1 mL/s is actually 1 gal/**min**,
  i.e. 1 gpm — it duplicates the already-correct "1 gpm = 0.06309 L/s" row two lines
  above). The reference table on the Unit Converter page shows the corrected values with
  an asterisk and a footnote explaining exactly what the book prints and why it's wrong.
  Neither error ever affected any calculator's actual math — `units.js`'s `gal/h` and
  `cms` factors are derived independently from unit definitions, not scraped from this
  table.
- **The class's catch-can uniformity spreadsheets** (`Uniformity_test.xlsx` and
  `uniformity sheet.xlsx`, both excluded from this repo — see `.gitignore`) have a CU
  formula that divides by a hardcoded `20` instead of the actual number of catch cans.
  It's invisible when a dataset happens to have exactly 20 cans (which is why the sheet
  that reproduces Example 5.1 — also exactly 20 cans — looks correct), but confirmed
  wrong on an independent 16-can dataset in the same workbook (gives 88% where the
  correct value, dividing by the true n=16, is 85%) and on the real 59-can radial pivot
  dataset (gives 97.05% vs. the mathematically correct 95.48%). `CU_H`'s formula is a
  self-normalizing ratio of two sums with no explicit `n`, so it didn't have this
  specific bug — but in the 59-can sheet its summation range was also left at the
  original ~20-row template size instead of extended to the full dataset. **The
  `catch-can-uniformity.js` calculator always uses the actual count of entered cans**,
  confirmed against both practice datasets independently.
- **Table 5.3**'s columns (maximum monthly crop ET) are *not* evenly spaced — 5 to 6 is
  a full inch, the rest are 0.5-in steps. `peak-et-net-capacity.js`'s interpolation uses
  the actual column values, not an assumed uniform step; if you ever touch that
  function, keep it that way.

## Where results intentionally differ from the textbook

A few tools carry full precision through every step rather than rounding
intermediate results the way the book's worked examples do for readability. This is a
deliberate choice — rounding partial-layer or partial-quantity results and then
dividing by a small number amplifies error, so full precision is the more correct answer
for a student's own real numbers. Each case is called out in that tool's "About this
calculator" section, for example:

- `infiltration-deep-percolation.js` — the textbook's Example 2.4/2.5 rounds each
  layer's soil water deficit to 1 decimal before continuing, which compounds into a
  visibly different final answer (wetting front ≈47.7 in / percolation ≈0.70 in at full
  precision, vs. the book's rounded 46.7 in / 0.6 in). A "Match textbook rounding"
  toggle reproduces the book's numbers exactly, for direct comparison.
- `conveyance-seepage-loss.js` and `farm-well-discharge.js` — smaller (roughly 1%)
  differences from using a precise `cfs → ac-in/hr` conversion instead of the textbook's
  convenient "1 cfs ≈ 1 ac-in/hr" approximation.
