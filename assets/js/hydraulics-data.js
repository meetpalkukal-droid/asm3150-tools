// Shared hydraulics reference data and formulas for ASM 3150/5150 tools.
// Source: Chapter 8 "Pump and Pipeline Hydraulics," Eisenhauer, Martin,
// Heeren, & Hoffman (2021), Irrigation Systems Management, ASABE. Tables
// transcribed directly from 250 DPI page renders (not text extraction) and
// spot-checked against every worked example in the chapter (8.2-8.5).

const GPM_PER_CFS = 448.831;
const G_FTS2 = 32.2;

function pipeAreaFt2(diameterIn) {
  return (Math.PI / 4) * Math.pow(diameterIn / 12, 2);
}
function velocityFtPerSec(Qgpm, diameterIn) {
  return (Qgpm / GPM_PER_CFS) / pipeAreaFt2(diameterIn);
}
function velocityHeadFt(Vftps) {
  return (Vftps * Vftps) / (2 * G_FTS2);
}
function minorLossHeadFt(K, Vftps) {
  return K * (Vftps * Vftps) / (2 * G_FTS2);
}
function psiFromFtHead(ft) {
  return ft * 0.433;
}
function ftHeadFromPsi(psi) {
  return psi / 0.433;
}
// Eq. 8.11a/b, Hazen-Williams. Q in gpm, d = inside diameter in inches,
// F = multiple outlet factor (1.0 for a plain run). Returns psi or ft of
// head loss per 100 ft of pipe.
function hazenWilliamsPf_psiPer100ft(Qgpm, C, diameterIn, F) {
  F = F === undefined ? 1 : F;
  return 456 * F * Math.pow(Qgpm / C, 1.852) * (1 / Math.pow(diameterIn, 4.866));
}
function hazenWilliamsHf_ftPer100ft(Qgpm, C, diameterIn, F) {
  F = F === undefined ? 1 : F;
  return 1054 * F * Math.pow(Qgpm / C, 1.852) * (1 / Math.pow(diameterIn, 4.866));
}
function requiredDiameterIn(Qgpm, maxVftps) {
  const areaFt2 = (Qgpm / GPM_PER_CFS) / maxVftps;
  return Math.sqrt((4 * areaFt2) / Math.PI) * 12;
}

// Table 8.1. C values for representative types of pipes.
const PIPE_MATERIALS = [
  { key: "aluminum-couplers", label: "Aluminum pipe with couplers", C: 120 },
  { key: "aluminum-gates", label: "Aluminum pipe with gates", C: 110 },
  { key: "cement-asbestos", label: "Cement asbestos pipe", C: 140 },
  { key: "galvanized-steel", label: "Galvanized steel pipe", C: 140 },
  { key: "standard-steel", label: "Standard steel pipe", C: 100 },
  { key: "pvc", label: "PVC", C: 150 },
  { key: "pvc-gates", label: "PVC pipe with gates", C: 130 },
];
function pipeMaterialByKey(key) {
  return PIPE_MATERIALS.find((m) => m.key === key) || null;
}
function populatePipeMaterialSelect(selectEl) {
  selectEl.innerHTML = "";
  PIPE_MATERIALS.forEach((m) => {
    const opt = document.createElement("option");
    opt.value = m.key;
    opt.textContent = m.label + " (C=" + m.C + ")";
    selectEl.appendChild(opt);
  });
  return selectEl;
}

// Table 8.5. Maximum flow rates in pipelines rounded to nearest 5 gpm at
// Vm = 5 ft/s (based on Table 8.2a and b). Each category's C matches the
// roughness coefficient used to build Table 8.2a/b (and Table 8.1).
const PIPE_SIZE_CATALOG = {
  "aluminum-sprinkler": {
    label: "Aluminum, sprinkler pipe with couplers",
    C: 120,
    sizes: [
      { nominal: "2", id: 1.900, q5fts: 45 },
      { nominal: "3", id: 2.900, q5fts: 105 },
      { nominal: "4", id: 3.900, q5fts: 185 },
      { nominal: "6", id: 5.884, q5fts: 425 },
    ],
  },
  "aluminum-gated": {
    label: "Aluminum, gated pipe",
    C: 110,
    sizes: [
      { nominal: "6", id: 5.898, q5fts: 425 },
      { nominal: "8", id: 7.898, q5fts: 765 },
      { nominal: "10", id: 9.898, q5fts: 1200 },
    ],
  },
  "pvc-ips": {
    label: "PVC, IPS Class 160",
    C: 150,
    sizes: [
      { nominal: "2", id: 2.193, q5fts: 60 },
      { nominal: "2 1/2", id: 2.655, q5fts: 85 },
      { nominal: "3", id: 3.230, q5fts: 130 },
      { nominal: "4", id: 4.154, q5fts: 210 },
      { nominal: "6", id: 6.120, q5fts: 460 },
    ],
  },
  "pvc-pip": {
    label: "PVC, PIP Class 125 (gated)",
    C: 150,
    sizes: [
      { nominal: "6", id: 5.776, q5fts: 405 },
      { nominal: "8", id: 7.658, q5fts: 720 },
      { nominal: "10", id: 9.572, q5fts: 1120 },
      { nominal: "12", id: 11.486, q5fts: 1615 },
    ],
  },
};
function populatePipeCategorySelect(selectEl) {
  selectEl.innerHTML = "";
  Object.keys(PIPE_SIZE_CATALOG).forEach((key) => {
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = PIPE_SIZE_CATALOG[key].label;
    selectEl.appendChild(opt);
  });
  return selectEl;
}
function populatePipeSizeSelect(selectEl, categoryKey) {
  selectEl.innerHTML = "";
  PIPE_SIZE_CATALOG[categoryKey].sizes.forEach((s) => {
    const opt = document.createElement("option");
    // Fixed 3-decimal string (not the raw number) so callers can reliably
    // preselect a value with `.toFixed(3)` without a "3.9" vs "3.900" mismatch.
    opt.value = s.id.toFixed(3);
    opt.textContent = s.nominal + ' in nominal (ID ' + s.id.toFixed(3) + ' in)';
    selectEl.appendChild(opt);
  });
  return selectEl;
}
// Smallest standard size in a category whose inside diameter keeps velocity
// at or below maxVftps for the given flow; null if none large enough exist.
function recommendPipeSize(categoryKey, Qgpm, maxVftps) {
  const needed = requiredDiameterIn(Qgpm, maxVftps);
  const sizes = PIPE_SIZE_CATALOG[categoryKey].sizes;
  const candidates = sizes.filter((s) => s.id >= needed).sort((a, b) => a.id - b.id);
  return candidates.length ? candidates[0] : null;
}
function allCatalogDiameters() {
  const set = new Set();
  Object.values(PIPE_SIZE_CATALOG).forEach((cat) => cat.sizes.forEach((s) => set.add(s.id)));
  return [...set].sort((a, b) => a - b);
}

// Table 8.3. Multiple outlet factors for laterals with equally spaced
// outlets of the same discharge (first outlet one full spacing from inlet).
const OUTLET_FACTOR_TABLE = [
  { n: 1, F: 1.0 }, { n: 2, F: 0.634 }, { n: 3, F: 0.528 }, { n: 4, F: 0.480 },
  { n: 5, F: 0.451 }, { n: 6, F: 0.433 }, { n: 7, F: 0.419 }, { n: 8, F: 0.410 },
  { n: 9, F: 0.402 }, { n: 10, F: 0.396 }, { n: 11, F: 0.392 }, { n: 12, F: 0.388 },
  { n: 13, F: 0.384 }, { n: 14, F: 0.381 }, { n: 15, F: 0.379 }, { n: 16, F: 0.377 },
  { n: 17, F: 0.376 }, { n: 18, F: 0.373 }, { n: 19, F: 0.372 }, { n: 20, F: 0.370 },
  { n: 22, F: 0.368 }, { n: 24, F: 0.366 }, { n: 26, F: 0.364 }, { n: 28, F: 0.363 },
  { n: 30, F: 0.362 }, { n: 35, F: 0.359 }, { n: 40, F: 0.357 }, { n: 50, F: 0.355 },
  { n: 100, F: 0.350 }, { n: 1000, F: 0.345 }, // last row represents ">100"
];
const OUTLET_FACTOR_PIVOT_NO_END_GUN = 0.54;
const OUTLET_FACTOR_PIVOT_END_GUN = 0.56;

// Piecewise-linear interpolation matching the book's own interpolation
// method (verified against Example 8.4: n=33 -> F=0.36).
function outletFactor(n) {
  const t = OUTLET_FACTOR_TABLE;
  if (n <= t[0].n) return t[0].F;
  if (n >= t[t.length - 1].n) return t[t.length - 1].F;
  for (let i = 0; i < t.length - 1; i++) {
    if (n >= t[i].n && n <= t[i + 1].n) {
      const frac = (n - t[i].n) / (t[i + 1].n - t[i].n);
      return t[i].F + frac * (t[i + 1].F - t[i].F);
    }
  }
  return t[t.length - 1].F;
}

// Table 8.4. Resistance coefficient K for fittings and valves (USDA, 2016).
// Columns are standard pipe nominal diameters 3,4,5,6,7,8,10 in. Many
// screwed fittings only have data at 3-4 in (screwed fittings aren't made
// larger in practice) - interpolation holds the last known value flat
// beyond the table's own range rather than leaving it undefined.
const FITTING_DIAMETERS = [3, 4, 5, 6, 7, 8, 10];
const FITTING_K_TABLE = [
  { key: "return-flanged", label: "Bend — return, flanged", K: [0.33, 0.30, 0.29, 0.28, 0.27, 0.25, 0.24] },
  { key: "return-screwed", label: "Bend — return, screwed", K: [0.80, 0.70] },
  { key: "elbow-reg-flanged-90", label: "Elbow — regular flanged 90°", K: [0.34, 0.31, 0.30, 0.28, 0.27, 0.26, 0.25] },
  { key: "elbow-lr-flanged-90", label: "Elbow — long radius flanged 90°", K: [0.25, 0.22, 0.20, 0.18, 0.17, 0.15, 0.14] },
  { key: "elbow-lr-flanged-45", label: "Elbow — long radius flanged 45°", K: [0.19, 0.18, 0.18, 0.17, 0.17, 0.17, 0.16] },
  { key: "elbow-reg-screwed-90", label: "Elbow — regular screwed 90°", K: [0.80, 0.70] },
  { key: "elbow-lr-screwed-90", label: "Elbow — long radius screwed 90°", K: [0.30, 0.23] },
  { key: "elbow-reg-screwed-45", label: "Elbow — regular screwed 45°", K: [0.30, 0.28] },
  { key: "tee-flanged-line", label: "Tee — flanged, line flow", K: [0.16, 0.14, 0.13, 0.12, 0.11, 0.10, 0.09] },
  { key: "tee-flanged-branch", label: "Tee — flanged, branch flow", K: [0.73, 0.68, 0.65, 0.60, 0.58, 0.56, 0.52] },
  { key: "tee-screwed-line", label: "Tee — screwed, line flow", K: [0.90, 0.90] },
  { key: "tee-screwed-branch", label: "Tee — screwed, branch flow", K: [1.20, 1.10] },
  { key: "globe-flanged", label: "Valve — globe, flanged", K: [7.0, 6.3, 6.0, 5.8, 5.7, 5.6, 5.5] },
  { key: "globe-screwed", label: "Valve — globe, screwed", K: [6.0, 5.7] },
  { key: "gate-flanged", label: "Valve — gate, flanged", K: [0.21, 0.16, 0.13, 0.11, 0.09, 0.075, 0.06] },
  { key: "gate-screwed", label: "Valve — gate, screwed", K: [0.14, 0.12] },
  { key: "swing-check-flanged", label: "Valve — swing check, flanged", K: [2.0, 2.0, 2.0, 2.0, 2.0, 2.0, 2.0] },
  { key: "swing-check-screwed", label: "Valve — swing check, screwed", K: [2.1, 2.0] },
  { key: "angle-flanged", label: "Valve — angle, flanged", K: [2.2, 2.1, 2.0, 2.0, 2.0, 2.0, 2.0] },
  { key: "angle-screwed", label: "Valve — angle, screwed", K: [1.3, 1.0] },
  { key: "foot", label: "Foot valve", K: [0.80, 0.80, 0.80, 0.80, 0.80, 0.80, 0.80] },
  { key: "strainer-basket", label: "Strainer (basket type)", K: [1.25, 1.05, 0.95, 0.85, 0.80, 0.75, 0.67] },
];
function fittingByKey(key) {
  return FITTING_K_TABLE.find((f) => f.key === key) || null;
}
function populateFittingSelect(selectEl) {
  selectEl.innerHTML = "";
  FITTING_K_TABLE.forEach((f) => {
    const opt = document.createElement("option");
    opt.value = f.key;
    opt.textContent = f.label;
    selectEl.appendChild(opt);
  });
  return selectEl;
}
// Interpolates K for a fitting at an arbitrary diameter; holds flat beyond
// the fitting's own tabulated range (see note above).
function fittingK(key, diameterIn) {
  const f = fittingByKey(key);
  if (!f) return null;
  const diams = FITTING_DIAMETERS.slice(0, f.K.length);
  if (diameterIn <= diams[0]) return f.K[0];
  if (diameterIn >= diams[diams.length - 1]) return f.K[f.K.length - 1];
  for (let i = 0; i < diams.length - 1; i++) {
    if (diameterIn >= diams[i] && diameterIn <= diams[i + 1]) {
      const frac = (diameterIn - diams[i]) / (diams[i + 1] - diams[i]);
      return f.K[i] + frac * (f.K[i + 1] - f.K[i]);
    }
  }
  return f.K[f.K.length - 1];
}

// Shared velocity / water-hammer chart, reused by the standalone check tool
// and embedded in the mainline sizing tool. Pure function of its inputs; no
// digitization involved since velocity is directly computed from physics
// (V = Q / Af), unlike the Chapter 7 figures.
function buildVelocityChartSVG(opts) {
  const W = opts.width || 640, H = opts.height || 440;
  const padL = 60, padR = 20, padT = 20, padB = 50;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const qMax = opts.qMax || 1500;
  const vMax = opts.vMax || 12;
  const xPx = (q) => padL + (q / qMax) * plotW;
  const yPx = (v) => padT + plotH - (Math.min(v, vMax) / vMax) * plotH;

  let s = "";
  for (let q = 0; q <= qMax; q += qMax / 10) {
    s += '<line x1="' + xPx(q) + '" y1="' + padT + '" x2="' + xPx(q) + '" y2="' + (padT + plotH) + '" stroke="#e5e0d5" stroke-width="1"/>';
    s += '<text x="' + xPx(q) + '" y="' + (padT + plotH + 20) + '" font-size="11" text-anchor="middle" fill="#666">' + Math.round(q) + "</text>";
  }
  for (let v = 0; v <= vMax; v += vMax / 8) {
    s += '<line x1="' + padL + '" y1="' + yPx(v) + '" x2="' + (padL + plotW) + '" y2="' + yPx(v) + '" stroke="#e5e0d5" stroke-width="1"/>';
    s += '<text x="' + (padL - 10) + '" y="' + (yPx(v) + 4) + '" font-size="11" text-anchor="end" fill="#666">' + v.toFixed(1) + "</text>";
  }
  s += '<text x="' + (padL + plotW / 2) + '" y="' + (H - 8) + '" font-size="13" text-anchor="middle" fill="#333">Flow rate (Q), gpm</text>';
  s += '<text x="16" y="' + (padT + plotH / 2) + '" font-size="13" text-anchor="middle" fill="#333" transform="rotate(-90 16 ' + (padT + plotH / 2) + ')">Mean velocity (V), ft/s</text>';

  // Shaded risk zone above the threshold velocity.
  const maxV = opts.maxVelocity;
  if (maxV <= vMax) {
    s += '<rect x="' + padL + '" y="' + padT + '" width="' + plotW + '" height="' + (yPx(maxV) - padT) + '" fill="#fdecec" opacity="0.6"/>';
    s += '<line x1="' + padL + '" y1="' + yPx(maxV) + '" x2="' + (padL + plotW) + '" y2="' + yPx(maxV) + '" stroke="#d9534f" stroke-width="2" stroke-dasharray="6,4"/>';
    s += '<text x="' + (padL + plotW - 6) + '" y="' + (yPx(maxV) - 6) + '" font-size="11" text-anchor="end" fill="#7a1f1f">Water hammer risk above ' + maxV.toFixed(1) + " ft/s</text>";
  }

  // Reference diameter curves (thin gray), V = Q/(448.831*A) is linear in Q.
  (opts.referenceDiameters || []).forEach((d) => {
    const vAtQmax = velocityFtPerSec(qMax, d);
    s += '<line x1="' + xPx(0) + '" y1="' + yPx(0) + '" x2="' + xPx(qMax) + '" y2="' + yPx(vAtQmax) + '" stroke="#c9c2b2" stroke-width="1"/>';
  });

  // Highlighted selected-diameter line.
  if (opts.selectedDiameter) {
    const vAtQmax = velocityFtPerSec(qMax, opts.selectedDiameter);
    s += '<line x1="' + xPx(0) + '" y1="' + yPx(0) + '" x2="' + xPx(qMax) + '" y2="' + yPx(vAtQmax) + '" stroke="#F1B300" stroke-width="3"/>';
  }

  s += '<rect x="' + padL + '" y="' + padT + '" width="' + plotW + '" height="' + plotH + '" fill="none" stroke="#999" stroke-width="1"/>';

  if (opts.pointQ !== undefined && opts.pointV !== undefined && !isNaN(opts.pointQ) && !isNaN(opts.pointV)) {
    const cx = xPx(Math.min(opts.pointQ, qMax));
    const cy = yPx(Math.min(opts.pointV, vMax));
    const fill = opts.pointV > maxV ? "#d9534f" : "#4c8c4a";
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="7" fill="' + fill + '" stroke="#191919" stroke-width="2"/>';
  }

  return s;
}

// Shared simple pipe-profile diagram (inlet -> outlet, tilted for rise/fall),
// reused by the pipeline friction tool and the mainline sizing tool.
function buildPipeProfileSVG(opts) {
  const W = opts.width || 560, H = opts.height || 220;
  const x1 = 80, x2 = W - 80;
  const yMid = H / 2;
  const amp = 50;
  const rising = opts.rising;
  const y1 = yMid + (rising ? -amp / 2 : amp / 2);
  const y2 = yMid + (rising ? amp / 2 : -amp / 2);
  const P1 = opts.P1, P2 = opts.P2, elevMag = opts.elevMag;

  let s = "";
  s += '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="#8c8c8c" stroke-width="8" stroke-linecap="round"/>';
  s += '<circle cx="' + x1 + '" cy="' + y1 + '" r="8" fill="#F1B300" stroke="#191919" stroke-width="2"/>';
  s += '<circle cx="' + x2 + '" cy="' + y2 + '" r="8" fill="#5a7fa6" stroke="#191919" stroke-width="2"/>';
  s += '<text x="' + x1 + '" y="' + (y1 - 20) + '" font-size="14" font-weight="700" text-anchor="middle" fill="#191919">P1 = ' + (isNaN(P1) ? "?" : P1.toFixed(1)) + " psi</text>";
  s += '<text x="' + x2 + '" y="' + (y2 - 20) + '" font-size="14" font-weight="700" text-anchor="middle" fill="#191919">P2 = ' + (isNaN(P2) ? "?" : P2.toFixed(1)) + " psi</text>";
  s += '<text x="' + (W / 2) + '" y="' + (H - 20) + '" font-size="13" text-anchor="middle" fill="#444">' + (rising ? "Rises " : "Falls ") + elevMag.toFixed(1) + " ft</text>";
  return s;
}

// Hydraulic/energy grade line diagram: the pipe is drawn AT its true
// elevation (to the same vertical scale as the head components), with
// pressure head and velocity head stacked on top of each point to reach its
// total head (H) - the standard textbook way of drawing Eq. 8.4 (matches
// Figure 8.2's idea of elevation head + pressure head + velocity head
// components), rather than a generic bar chart floating next to a separate
// pipe drawing. One point draws a single node; two points draw the pipe
// between them, tilted to their real relative elevation.
function buildHeadProfileSVG(opts) {
  const W = opts.width || 560, H = opts.height || 420;
  const padL = 60, padR = 30, padT = 46, padB = 56;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const points = opts.points; // [{Z, h, hv, label}]
  const totals = points.map((p) => p.Z + p.h + p.hv);
  const maxH = Math.max(...totals, 0.001) * 1.15;
  const yPx = (v) => padT + plotH - (v / maxH) * plotH;
  const xs = points.length === 2 ? [padL + plotW * 0.28, padL + plotW * 0.72] : [padL + plotW * 0.5];
  const barW = 56;
  const nodeColors = ["#F1B300", "#5a7fa6"];
  const segColors = { h: "#F1B300", hv: "#5a7fa6" };

  let s = "";
  for (let i = 0; i <= 5; i++) {
    const v = (maxH / 5) * i;
    s += '<line x1="' + padL + '" y1="' + yPx(v) + '" x2="' + (padL + plotW) + '" y2="' + yPx(v) + '" stroke="#e5e0d5" stroke-width="1"/>';
    s += '<text x="' + (padL - 8) + '" y="' + (yPx(v) + 4) + '" font-size="11" text-anchor="end" fill="#666">' + v.toFixed(0) + "</text>";
  }
  s += '<text x="16" y="' + (padT + plotH / 2) + '" font-size="13" text-anchor="middle" fill="#333" transform="rotate(-90 16 ' + (padT + plotH / 2) + ')">Head above datum (ft)</text>';
  s += '<line x1="' + padL + '" y1="' + yPx(0) + '" x2="' + (padL + plotW) + '" y2="' + yPx(0) + '" stroke="#191919" stroke-width="1.5"/>';
  s += '<text x="' + (padL + plotW) + '" y="' + (yPx(0) - 6) + '" font-size="11" text-anchor="end" fill="#444">Datum (Z=0)</text>';

  // Pipe, drawn at true elevation - the diagonal/level line IS the pipe.
  if (points.length === 2) {
    s += '<line x1="' + xs[0] + '" y1="' + yPx(points[0].Z) + '" x2="' + xs[1] + '" y2="' + yPx(points[1].Z) + '" stroke="#8c8c8c" stroke-width="7" stroke-linecap="round"/>';
  }

  // Legend, single row above the plot (same convention as the head-bars chart used to use).
  const legendItems = [["elev", "#8c8c8c", "Elevation (Z)"], ["h", "#F1B300", "Pressure head (h)"], ["hv", "#5a7fa6", "Velocity head"]];
  let legendX = padL;
  legendItems.forEach(([key, color, label]) => {
    s += '<rect x="' + legendX + '" y="10" width="11" height="11" fill="' + color + '"/>';
    s += '<text x="' + (legendX + 16) + '" y="19" font-size="11" fill="#333">' + label + "</text>";
    legendX += 16 + label.length * 5.6 + 18;
  });

  points.forEach((p, i) => {
    const x = xs[i];
    const zY = yPx(p.Z);
    // Dashed guide from datum up to the pipe's elevation.
    s += '<line x1="' + x + '" y1="' + yPx(0) + '" x2="' + x + '" y2="' + zY + '" stroke="#8c8c8c" stroke-width="1.5" stroke-dasharray="4,3"/>';
    // Node on the pipe itself (white-filled so it reads clearly against the
    // gold pressure-head segment sitting right above it).
    s += '<circle cx="' + x + '" cy="' + zY + '" r="7" fill="#fff" stroke="' + nodeColors[i] + '" stroke-width="3"/>';
    // Stacked pressure head + velocity head, rising from the pipe.
    let yTop = zY;
    [["h", p.h], ["hv", p.hv]].forEach(([key, val]) => {
      const yNew = yTop - (val / maxH) * plotH;
      s += '<rect x="' + (x - barW / 2) + '" y="' + yNew + '" width="' + barW + '" height="' + (yTop - yNew) + '" fill="' + segColors[key] + '" stroke="#191919" stroke-width="1"/>';
      yTop = yNew;
    });
    s += '<text x="' + x + '" y="' + (yTop - 8) + '" font-size="12" font-weight="700" text-anchor="middle" fill="#191919">H=' + (p.Z + p.h + p.hv).toFixed(1) + "</text>";
    s += '<text x="' + x + '" y="' + (yPx(0) + 20) + '" font-size="13" font-weight="700" text-anchor="middle" fill="#191919">' + (p.label || "Point " + (i + 1)) + "</text>";
    s += '<text x="' + x + '" y="' + (yPx(0) + 36) + '" font-size="11" text-anchor="middle" fill="#666">Z=' + p.Z.toFixed(1) + " ft</text>";
  });

  return s;
}
