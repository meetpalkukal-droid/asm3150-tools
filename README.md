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
  js/salinity-data.js             Shared Chapter 7 data: Table 7.2 crop salt tolerance,
                                   Table 7.3 water quality classes, and digitized
                                   Figures 7.10/7.11 (sodicity + leaching requirement)
  js/hydraulics-data.js           Shared Chapter 8 data: Tables 8.1/8.3/8.4/8.5 (C
                                   values, outlet factors, fitting K, standard pipe
                                   sizes), Hazen-Williams/continuity formulas, and the
                                   shared velocity-chart/pipe-profile SVG builders
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

**Chapter 7 — Salinity Management**

Bundled as two practical, application-style tools rather than six separate textbook-example
clones — each groups the examples a grower would naturally need together (diagnose a water
test, then decide how much extra water to apply):
- Irrigation Water Salinity & Sodicity Risk (`irrigation-water-salinity-risk`) — bundles
  Examples 7.1-7.3: salt load applied from a water test, crop yield impact from root-zone
  salinity (Table 7.2), and sodicity/infiltration hazard (Figure 7.10).
- Leaching Requirement & Reclamation Planner (`leaching-requirement-reclamation-planner`) —
  bundles Examples 7.4-7.6: actual leaching fraction (diagnostic), leaching requirement
  (planning, Figure 7.11), and soil reclamation by ponding or sprinkling.

Figures 7.10 and 7.11 have no printed equation in the textbook — both were digitized
directly from the published charts (sub-pixel least-squares line fits against a 400 DPI
page render) rather than approximated with a generic formula from the literature, and the
leaching-requirement digitization was verified against the book's own Example 7.5. See
`docs/DEVELOPMENT.md` for the digitized coefficients and how they were derived.

**Chapter 8 — Pump and Pipeline Hydraulics**

Bundled as three practical tools covering Examples 8.2-8.5, again grouped by what a
designer actually needs rather than one tool per example:
- Pipe Velocity & Water Hammer Check (`pipe-velocity-water-hammer-check`) — a Figure
  8.3-equivalent chart (computed directly from physics, not digitized — see below): a
  family of straight velocity-vs-flow-rate lines, one per standard pipe size, with a
  shaded water-hammer risk zone above an adjustable velocity threshold.
- Pipeline Energy, Friction & Minor Losses (`pipeline-energy-friction-losses`) — bundles
  Examples 8.2-8.4: total/velocity head at one or two points (continuity), Hazen-Williams
  friction loss for a plain run or a lateral with evenly spaced outlets (Table 8.1, 8.3),
  minor losses from a running tally of fittings (Table 8.4), and the resulting downstream
  pressure.
- Mainline Pipe Sizing & Pressure Change (`mainline-pipe-sizing`) — Example 8.5, as its
  own dedicated tool per explicit request: picks the smallest standard pipe (Table 8.5)
  that keeps velocity under a target, then carries friction and elevation through to an
  outlet pressure. Reuses the water-hammer chart from the first tool.

Unlike Chapter 7's figures, Figure 8.3 has no digitization to verify — velocity and
velocity head are direct physics (Eq. 8.1, 8.5), so the chart is generated from the same
formulas the rest of the tool uses, just drawn for a range of flow rates and pipe sizes.
Tables 8.1, 8.3, 8.4, and 8.5 were all transcribed from 250 DPI page renders (not text
extraction) and spot-checked against every worked example in the chapter; see
`docs/DEVELOPMENT.md` for one textbook arithmetic inconsistency found along the way
(Example 8.4's stated 33 sprinklers vs. its own 1280 ft ÷ 40 ft spacing).

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
