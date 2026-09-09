// Infiltration Depth & Deep Percolation calculator (Textbook Examples 2.4 & 2.5,
// built on Eq. 2.13: SWD = (theta_fc - theta_v) * thickness)
//
// Algorithm: walk layers from the surface down, subtracting each layer's SWD
// from the applied depth. Whichever layer runs out of applied water mid-layer
// is where the wetting front stops. The last layer may be "unbounded" (no
// thickness limit), matching the textbook's "30+ in" layer.
//
// Deep percolation (given a root depth Rd): sum (theta_fc - theta_v) * (overlap
// thickness) over every layer segment that lies between Rd and the wetting
// front depth. This generalizes correctly even when Rd falls inside a
// different layer than where the front ends, not just the single-layer case
// the textbook example happens to use.
//
// A layer already at or above field capacity (theta_v >= theta_fc) is treated
// as passing water through freely (deficit clamped to 0), not as "returning"
// water to the applied total.

const depthUnitSelect = document.getElementById("depth-unit");
const layersContainer = document.getElementById("layers-container");
const appliedDepthInput = document.getElementById("applied-depth");
const rootDepthInput = document.getElementById("root-depth");
const matchTextbook = document.getElementById("match-textbook");
const statsGrid = document.getElementById("stats-grid");
const warningContainer = document.getElementById("warning-container");
const traceTable = document.getElementById("trace-table");
const traceBody = document.getElementById("trace-body");

populateUnitSelect(depthUnitSelect, "length", "in");

let layers = [
  { thickness: 12, fc: 34, v: 20, unbounded: false },
  { thickness: 18, fc: 40, v: 33, unbounded: false },
  { thickness: null, fc: 30, v: 24, unbounded: true },
];

function round1(n) {
  return Math.round(n * 10) / 10;
}

function renderLayers() {
  layersContainer.innerHTML = "";
  layers.forEach((layer, i) => {
    const isLast = i === layers.length - 1;
    const row = document.createElement("div");
    row.className = "layer-row";

    const thicknessCell = layer.unbounded && isLast
      ? '<div style="color:var(--text-muted); font-size:0.85rem;">extends indefinitely</div>'
      : '<input type="number" step="any" class="layer-thickness" value="' + (layer.thickness ?? "") + '">';

    row.innerHTML =
      '<div class="layer-row__label">L' + (i + 1) + '</div>' +
      '<div>' + thicknessCell + '</div>' +
      '<div><input type="number" step="any" class="layer-fc" value="' + layer.fc + '"></div>' +
      '<div><input type="number" step="any" class="layer-v" value="' + layer.v + '"></div>' +
      '<div><button type="button" class="layer-row__remove" title="Remove layer">&times;</button></div>';

    const thicknessInput = row.querySelector(".layer-thickness");
    if (thicknessInput) {
      thicknessInput.addEventListener("input", () => {
        layers[i].thickness = parseFloat(thicknessInput.value);
        calculate();
      });
    }
    row.querySelector(".layer-fc").addEventListener("input", (e) => {
      layers[i].fc = parseFloat(e.target.value);
      calculate();
    });
    row.querySelector(".layer-v").addEventListener("input", (e) => {
      layers[i].v = parseFloat(e.target.value);
      calculate();
    });
    row.querySelector(".layer-row__remove").addEventListener("click", () => {
      if (layers.length <= 1) return;
      layers.splice(i, 1);
      renderLayers();
      calculate();
    });

    layersContainer.appendChild(row);

    if (isLast) {
      const note = document.createElement("div");
      note.className = "unbounded-note";
      note.innerHTML =
        '<label><input type="checkbox" class="layer-unbounded" ' + (layer.unbounded ? "checked" : "") + '> ' +
        "This layer extends indefinitely (no bottom boundary)</label>";
      note.querySelector(".layer-unbounded").addEventListener("change", (e) => {
        layers[i].unbounded = e.target.checked;
        renderLayers();
        calculate();
      });
      layersContainer.appendChild(note);
    }
  });
}

document.getElementById("add-layer").addEventListener("click", () => {
  layers.forEach((l, i) => { if (i === layers.length - 1) l.unbounded = false; });
  layers.push({ thickness: 12, fc: 30, v: 15, unbounded: true });
  renderLayers();
  calculate();
});

function tile(value, label) {
  return '<div class="stat-tile"><div class="stat-tile__value">' + value +
    '</div><div class="stat-tile__label">' + label + '</div></div>';
}

// Computes the wetting front and, per layer, the wetted interval [top, bottom]
// and the water deficit (theta_fc - theta_v) as a ratio, for later use in the
// deep percolation calculation. Returns null if inputs are incomplete/invalid.
function computeWettingFront(appliedDepth, round) {
  let remaining = appliedDepth;
  let cum = 0;
  let frontDepth = null;
  const trace = [];
  let exceededProfile = false;
  let undeterminable = false;

  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i];
    const isLast = i === layers.length - 1;
    const isUnbounded = isLast && layer.unbounded;
    const fc = layer.fc / 100;
    const v = layer.v / 100;
    const deficitPerUnit = Math.max(0, fc - v);
    const top = cum;

    if (isUnbounded) {
      if (deficitPerUnit <= 0) {
        undeterminable = true;
        trace.push({ index: i, top, bottom: null, deficitPerUnit, swd: 0, status: "already at/above field capacity — front cannot be determined" });
        break;
      }
      let depthInLayer = remaining / deficitPerUnit;
      if (round) depthInLayer = round1(depthInLayer);
      frontDepth = top + depthInLayer;
      trace.push({ index: i, top, bottom: frontDepth, deficitPerUnit, swd: remaining, status: "wetting front stops here" });
      remaining = 0;
      break;
    }

    const thickness = layer.thickness;
    if (thickness === null || isNaN(thickness) || thickness <= 0) return null;

    let swd = deficitPerUnit * thickness;
    if (round) swd = round1(swd);
    const bottom = top + thickness;

    if (remaining >= swd - 1e-9) {
      trace.push({ index: i, top, bottom, deficitPerUnit, swd, status: "fully wetted to field capacity" });
      remaining = round ? round1(remaining - swd) : remaining - swd;
      cum = bottom;
      if (remaining <= 1e-9) { frontDepth = bottom; remaining = 0; break; }
    } else {
      let depthInLayer = deficitPerUnit > 0 ? remaining / deficitPerUnit : 0;
      if (round) depthInLayer = round1(depthInLayer);
      frontDepth = top + depthInLayer;
      trace.push({ index: i, top, bottom: frontDepth, deficitPerUnit, swd: remaining, status: "wetting front stops here" });
      remaining = 0;
      break;
    }
  }

  if (frontDepth === null && !undeterminable) {
    // Ran out of (bounded) layers before the applied water was used up.
    exceededProfile = true;
    frontDepth = cum;
  }

  return { frontDepth, trace, exceededProfile, undeterminable, leftover: remaining };
}

// Sums (theta_fc - theta_v) * overlap thickness for every layer segment that
// lies between rootDepth and frontDepth.
function computeDeepPercolation(trace, rootDepth, frontDepth, round) {
  let total = 0;
  trace.forEach((seg) => {
    if (seg.bottom === null) return;
    const segTop = Math.max(seg.top, rootDepth);
    const segBottom = Math.min(seg.bottom, frontDepth);
    if (segBottom > segTop) {
      total += seg.deficitPerUnit * (segBottom - segTop);
    }
  });
  if (round) total = round1(total);
  return total;
}

function calculate() {
  const unitAbbr = UNIT_CATEGORIES.length.units[depthUnitSelect.value].label.replace(/^.*\((.*)\)$/, "$1");
  const appliedDepth = parseFloat(appliedDepthInput.value);
  const rootDepthRaw = rootDepthInput.value.trim();
  const rootDepth = rootDepthRaw === "" ? null : parseFloat(rootDepthRaw);
  const round = matchTextbook.checked;

  warningContainer.innerHTML = "";
  traceTable.style.display = "none";

  if (isNaN(appliedDepth) || appliedDepth < 0) {
    statsGrid.innerHTML = tile("—", "Enter an applied depth above");
    return;
  }

  const result = computeWettingFront(appliedDepth, round);
  if (result === null) {
    statsGrid.innerHTML = tile("—", "Check that every layer has a thickness greater than 0");
    return;
  }

  const { frontDepth, trace, exceededProfile, undeterminable, leftover } = result;

  traceBody.innerHTML = "";
  trace.forEach((seg) => {
    const tr = document.createElement("tr");
    const interval = seg.bottom === null
      ? formatNumber(seg.top) + " " + unitAbbr + " and deeper"
      : formatNumber(seg.top) + "–" + formatNumber(seg.bottom) + " " + unitAbbr;
    tr.innerHTML =
      "<td>L" + (seg.index + 1) + "</td>" +
      "<td>" + interval + "</td>" +
      "<td>" + formatNumber(seg.swd) + " " + unitAbbr + "</td>" +
      "<td>" + seg.status + "</td>";
    traceBody.appendChild(tr);
  });
  traceTable.style.display = "";

  let stats = tile(formatNumber(frontDepth) + " " + unitAbbr, "Wetting front depth");

  if (undeterminable) {
    warningContainer.innerHTML =
      '<div class="warning-box">The unbounded layer\'s water content is already at or above field capacity, ' +
      "so infiltrating water passes straight through it and the wetting front can't be pinned down from this profile. " +
      "Lower that layer's &theta;<sub>v</sub> below &theta;<sub>fc</sub>, or give it a finite thickness.</div>";
    statsGrid.innerHTML = stats;
    return;
  }

  if (exceededProfile) {
    warningContainer.innerHTML =
      '<div class="warning-box">The applied depth exceeds the water storage capacity of this entire profile ' +
      "(about " + formatNumber(leftover) + " " + unitAbbr + " of water is unaccounted for below " +
      formatNumber(frontDepth) + " " + unitAbbr + "). Add another layer, or mark the last layer as " +
      "\"extends indefinitely,\" to model penetration deeper than this.</div>";
  }

  if (rootDepth === null || isNaN(rootDepth)) {
    statsGrid.innerHTML = stats;
    return;
  }

  if (frontDepth <= rootDepth) {
    stats += tile("0 " + unitAbbr, "Deep percolation (front stayed within the root zone)");
    statsGrid.innerHTML = stats;
    return;
  }

  const percolation = computeDeepPercolation(trace, rootDepth, frontDepth, round);
  stats += tile(formatNumber(percolation) + " " + unitAbbr, "Deep percolation below the root zone");
  statsGrid.innerHTML = stats;
}

depthUnitSelect.addEventListener("change", calculate);
appliedDepthInput.addEventListener("input", calculate);
rootDepthInput.addEventListener("input", calculate);
matchTextbook.addEventListener("change", calculate);

document.getElementById("load-example").addEventListener("click", () => {
  layers = [
    { thickness: 12, fc: 34, v: 20, unbounded: false },
    { thickness: 18, fc: 40, v: 33, unbounded: false },
    { thickness: null, fc: 30, v: 24, unbounded: true },
  ];
  depthUnitSelect.value = "in";
  appliedDepthInput.value = 4;
  rootDepthInput.value = 36;
  matchTextbook.checked = false;
  renderLayers();
  calculate();
});

renderLayers();
calculate();
