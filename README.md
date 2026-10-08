# ASM 3150/5150 Tools

Web-based calculation tools for the University of Idaho course **ASM 3150/5150 —
Irrigation Systems and Water Management**. Built to accompany *Irrigation Systems
Management* (Eisenhauer, Martin, Heeren, & Hoffman, 2021, ASABE), and grown week by
week over the semester as new chapters are covered.

**Live site:** https://meetpalkukal-droid.github.io/asm3150-tools/

## What this is

A static site — no build step, no backend, no dependencies to install. Each tool is a
self-contained HTML page with its own JavaScript file. Students open a link, enter
numbers, and get an answer; instructors extend it by adding another HTML/JS pair and a
homepage card.

Every calculator is a **generic solver** for the underlying equation, not a
narrow reproduction of one textbook example — pick which variable you don't know, enter
the others, and it solves for it. Most tools also have a "Load textbook Example X.X"
button that fills in the book's own numbers, so students can check their hand
calculations against the tool (and vice versa).

## Project structure

```
index.html                        Home page — card grid of every tool, grouped by chapter
assets/
  css/style.css                   Shared University of Idaho–styled theme
  js/site.js                      Shared behavior: footer year, KaTeX math rendering
  js/units.js                     Shared unit-conversion data (volume, flow, length,
                                   area, time, velocity, mass) + conversion helpers
  js/soil-data.js                 Shared Table 2.3 soil-texture data (fc, wp by texture)
tools/
  <tool-name>.html                One page per calculator
  <tool-name>.js                  Its logic (paired 1:1 with the HTML file)
```

Nothing else is required to run this locally — open `index.html` in a browser, or serve
the folder with any static file server.

## Tools by chapter

**Chapter 2 — Soil Water**
- Soil Bulk Density & Porosity (`bulk-density-porosity`)
- Soil Water Content & Irrigation Depth (`soil-water-content-depth`)
- Soil Water Depletion & Irrigation Scheduling (`soil-water-depletion-scheduling`)
- Infiltration Depth & Deep Percolation (`infiltration-deep-percolation`)
- Soil Texture Water Characteristics lookup, Table 2.3 (`soil-texture-lookup`)

**Chapter 3 — Measuring Water Applications**
- Unit Converter (`unit-converter`) — also reproduces Table 3.1 as a reference table
- Depth – Volume – Area (`depth-volume-area`)
- Flow – Time – Depth – Area (`flow-time-depth-area`)
- Pipe Flow / Continuity (`pipe-flow-continuity`)

**Chapter 5 — Irrigation System Performance**
- Catch-Can Uniformity: CU, DU, CU<sub>H</sub> (`catch-can-uniformity`)
- Application Efficiency of the Low Quarter, E<sub>LQ</sub> (`application-efficiency-low-quarter`)
- Scheduling Coefficient (`scheduling-coefficient`)
- Chemical Leaching Loss, Table 5.1 (`chemical-leaching-loss`)
- Canal/Ditch Seepage Loss (`conveyance-seepage-loss`)
- Peak Daily ET & Net System Capacity, Table 5.3 (`peak-et-net-capacity`)
- Gross Capacity & Farm Well Discharge (`farm-well-discharge`)

**Irrigation Scheduling (sensor-based, supplemental — not from the textbook)**
- Soil Moisture Sensor Irrigation Scheduling (`soil-sensor-irrigation-scheduling`) —
  turns readings from any number of soil moisture sensors into a when/how-much
  decision, using the depth-weighted "midpoint method" (see
  [USU Extension](https://extension.usu.edu/crops/tools/soil-sensor-setup)). Built from
  a class slide, not the textbook; deliberately has no soil-type or crop-type lookup —
  every parameter is entered directly.

**Center Pivot Design & Operation (supplemental — not from the textbook)**
- Center Pivot Rotation Time & Application Depth (`center-pivot-rotation-time`) —
  solves T = 452.6&times;A&times;d&times;P/(Q&times;E) for rotation time or application
  depth, in either direction. Generalizes WSU's
  [1" Application Time calculator](https://irrigation.wsu.edu/Content/Calculators/Center-Pivot/1-Inch-Application-Time.php)
  (the 452.6 constant and formula structure were confirmed against that page's own
  JavaScript, not just its displayed equation image) to any target depth.

**External resources**
- Link out to the AgriMet real-time crop water use tool

See [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) for the conventions these tools follow,
how to add a new one, and notes on textbook data that was found to have errata during
development.

## Tech stack

- Plain HTML/CSS/JavaScript — no framework, no build step, no npm dependencies.
- [KaTeX](https://katex.org/) (via CDN) renders every formula as typeset math.
- [Public Sans](https://fonts.google.com/specimen/Public+Sans) (Google Fonts) and the
  University of Idaho brand palette (Pride Gold `#F1B300`, Silver `#808080`, Black
  `#191919`) for styling.
- Hosted on **GitHub Pages**, served directly from the `main` branch.

## Deploying changes

This repo *is* the live site. Any commit pushed to `main` updates
https://meetpalkukal-droid.github.io/asm3150-tools/ automatically within a minute or
two — there's no separate build/deploy step.

## Source material

- `asabe textbook.pdf`, the `.xlsx` spreadsheets, and any `.pptx` slides in the repo
  root are course source material (the textbook, a catch-can uniformity dataset, and
  class slides) used to build and verify the tools. They're excluded from version
  control (see `.gitignore`) since they're not part of the published site and the
  textbook is copyrighted — don't remove them from `.gitignore` and push them.
- Formulas, table values, and worked examples are cited to *Irrigation Systems
  Management* (Eisenhauer, Martin, Heeren, & Hoffman, 2021, ASABE, CC BY-NC-ND 4.0) by
  chapter/example/equation number in each tool's "About this calculator" section.
