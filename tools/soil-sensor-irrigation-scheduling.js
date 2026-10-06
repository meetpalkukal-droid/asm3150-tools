// Soil Moisture Sensor Irrigation Scheduling calculator
// Not from the textbook - built from a class slide and the "midpoint method" for
// assigning each sensor a soil depth zone (see USU Extension's soil sensor setup
// guide: https://extension.usu.edu/crops/tools/soil-sensor-setup).
//
// Each sensor's zone runs from the midpoint to its shallower neighbor (or the
// surface, for the shallowest sensor) to the midpoint to its deeper neighbor (or
// the root zone depth, for the deepest sensor). Water content x zone thickness,
// summed over all sensors, gives the total water in the profile - done once for
// field capacity and once for wilting point, with AWC simply the difference.
//
// SWD = FC - D_current   (soil water depletion = depth needed to refill to FC)
// MAD = MAD% x AWC       (management allowed depletion)
// Irrigate when SWD >= MAD - shown as a direct bar-for-bar comparison of the
// two quantities rather than collapsing them into a single threshold number.
//
// Current moisture (per sensor) is a slider bounded by that sensor's own PWP and
// FC, since theta_v can only physically fall between those two limits.

const rootZoneDepthInput = document.getElementById("root-zone-depth");

const singleFcToggle = document.getElementById("single-fc-toggle");
const fieldSingleFc = document.getElementById("field-single-fc");
const singleFcValue = document.getElementById("single-fc-value");

const fieldSinglePwp = document.getElementById("field-single-pwp");
const singlePwpValue = document.getElementById("single-pwp-value");
const fieldPwpTexture = document.getElementById("field-pwp-texture");
const pwpTextureSelect = document.getElementById("pwp-texture-select");

const sensorHeader = document.getElementById("sensor-header");
const sensorsContainer = document.getElementById("sensors-container");

const awcStatsGrid = document.getElementById("awc-stats-grid");
const madPct = document.getElementById("mad-pct");
const madReadout = document.getElementById("mad-readout");

const etRate = document.getElementById("et-rate");
const etReadout = document.getElementById("et-readout");
const appEfficiency = document.getElementById("app-efficiency");
const efficiencyReadout = document.getElementById("efficiency-readout");
const decisionBanner = document.getElementById("decision-banner");
const decisionStatsGrid = document.getElementById("decision-stats-grid");

const profileDiagram = document.getElementById("profile-diagram");
const swdMadChart = document.getElementById("swd-mad-chart");

populateSoilTextureSelect(pwpTextureSelect, false);

let sensors = [
  { depth: 6, fc: 30, pwp: 15, current: 24 },
  { depth: 12, fc: 30, pwp: 15, current: 24 },
  { depth: 24, fc: 30, pwp: 15, current: 24 },
];

const COL_LABELS = { depth: "Depth", fc: "Field capacity", pwp: "Wilting point", current: "Current moisture" };

function pwpMode() {
  return document.querySelector('input[name="pwp-mode"]:checked').value;
}

function visibleColumns() {
  const cols = ["depth"];
  if (!singleFcToggle.checked) cols.push("fc");
  if (pwpMode() === "per-sensor") cols.push("pwp");
  cols.push("current");
  return cols;
}

function tile(value, label, primary) {
  return '<div class="stat-tile' + (primary ? " stat-tile--primary" : "") + '"><div class="stat-tile__value">' +
    value + '</div><div class="stat-tile__label">' + label + '</div></div>';
}

function getFcValues() {
  return singleFcToggle.checked
    ? sensors.map(() => parseFloat(singleFcValue.value))
    : sensors.map((s) => s.fc);
}

function getPwpValues() {
  const mode = pwpMode();
  if (mode === "per-sensor") return sensors.map((s) => s.pwp);
  if (mode === "single") return sensors.map(() => parseFloat(singlePwpValue.value));
  const t = soilTextureByKey(pwpTextureSelect.value);
  const val = t ? t.wp * 100 : NaN;
  return sensors.map(() => val);
}

function renderSensors() {
  const cols = visibleColumns();
  const gridCols = "3rem repeat(" + cols.length + ", 1fr) 2.2rem";
  const fcValues = getFcValues();
  const pwpValues = getPwpValues();

  sensorHeader.style.gridTemplateColumns = gridCols;
  sensorHeader.innerHTML = "<div></div>" + cols.map((c) => "<div>" + COL_LABELS[c] + "</div>").join("") + "<div></div>";

  sensorsContainer.innerHTML = "";
  sensors.forEach((s, i) => {
    const row = document.createElement("div");
    row.className = "sensor-row";
    row.style.gridTemplateColumns = gridCols;

    let html = '<div class="sensor-row__label">S' + (i + 1) + "</div>";
    cols.forEach((c) => {
      if (c === "current") {
        const lo = Math.min(pwpValues[i], fcValues[i]);
        const hi = Math.max(pwpValues[i], fcValues[i]);
        const val = isNaN(s.current) ? lo : Math.min(Math.max(s.current, lo), hi);
        html += '<div class="sensor-current-cell">' +
          '<div class="slider-readout" id="current-readout-' + i + '"><em>&theta;</em><sub>v</sub> = ' + (isNaN(val) ? "?" : val.toFixed(1)) + '%</div>' +
          '<input type="range" class="sensor-current" step="0.1" min="' + lo + '" max="' + hi + '" value="' + val + '"></div>';
      } else {
        html += '<div><input type="number" step="any" class="sensor-' + c + '" value="' + s[c] + '"></div>';
      }
    });
    html += '<div class="row-remove"><button type="button" title="Remove sensor">&times;</button></div>';
    row.innerHTML = html;

    cols.forEach((c) => {
      if (c === "current") {
        const slider = row.querySelector(".sensor-current");
        const readout = row.querySelector("#current-readout-" + i);
        slider.addEventListener("input", (e) => {
          sensors[i].current = parseFloat(e.target.value);
          readout.innerHTML = "<em>θ</em><sub>v</sub> = " + sensors[i].current.toFixed(1) + "%";
          calculate();
        });
      } else {
        row.querySelector(".sensor-" + c).addEventListener("input", (e) => {
          sensors[i][c] = parseFloat(e.target.value);
          if (c === "fc" || c === "pwp") syncCurrentSliderBounds();
          calculate();
        });
      }
    });
    row.querySelector(".row-remove button").addEventListener("click", () => {
      if (sensors.length <= 1) return;
      sensors.splice(i, 1);
      renderSensors();
      calculate();
    });

    sensorsContainer.appendChild(row);
  });
}

// Keeps each current-moisture slider's min/max in sync with the sensor's FC/PWP
// without rebuilding the DOM (so dragging a slider doesn't get interrupted).
function syncCurrentSliderBounds() {
  const fcValues = getFcValues();
  const pwpValues = getPwpValues();
  const sliders = sensorsContainer.querySelectorAll(".sensor-current");
  sliders.forEach((slider, i) => {
    const lo = Math.min(pwpValues[i], fcValues[i]);
    const hi = Math.max(pwpValues[i], fcValues[i]);
    if (isNaN(lo) || isNaN(hi)) return;
    slider.min = lo;
    slider.max = hi;
    let val = parseFloat(slider.value);
    if (isNaN(val) || val < lo || val > hi) {
      val = Math.min(Math.max(isNaN(val) ? lo : val, lo), hi);
      slider.value = val;
      sensors[i].current = val;
    }
    const readout = document.getElementById("current-readout-" + i);
    if (readout) readout.innerHTML = "<em>θ</em><sub>v</sub> = " + val.toFixed(1) + "%";
  });
}

document.getElementById("add-sensor").addEventListener("click", () => {
  const last = sensors[sensors.length - 1];
  sensors.push({
    depth: (last ? last.depth : 0) + 6,
    fc: last ? last.fc : 30,
    pwp: last ? last.pwp : 15,
    current: last ? last.current : 24,
  });
  renderSensors();
  calculate();
});

singleFcToggle.addEventListener("change", () => {
  fieldSingleFc.classList.toggle("field--hidden", !singleFcToggle.checked);
  renderSensors();
  calculate();
});

document.querySelectorAll('input[name="pwp-mode"]').forEach((r) =>
  r.addEventListener("change", () => {
    const mode = pwpMode();
    fieldSinglePwp.classList.toggle("field--hidden", mode !== "single");
    fieldPwpTexture.classList.toggle("field--hidden", mode !== "texture");
    renderSensors();
    calculate();
  })
);
pwpTextureSelect.addEventListener("change", () => { syncCurrentSliderBounds(); calculate(); });
singleFcValue.addEventListener("input", () => { syncCurrentSliderBounds(); calculate(); });
singlePwpValue.addEventListener("input", () => { syncCurrentSliderBounds(); calculate(); });

// Returns {thicknesses, warning}; thicknesses is indexed the same as `sensors`.
function computeZoneThicknesses(rootZoneDepth) {
  const indexed = sensors.map((s, i) => ({ ...s, i })).filter((s) => !isNaN(s.depth));
  if (indexed.length === 0) return { thicknesses: [], zones: [], warning: null };
  const sorted = [...indexed].sort((a, b) => a.depth - b.depth);

  let warning = null;
  if (rootZoneDepth < sorted[sorted.length - 1].depth) {
    warning = "Root zone depth is shallower than your deepest sensor — the deepest sensor's zone was clamped to end at the root zone depth. Increase the root zone depth, or remove that sensor.";
  }

  const thicknesses = new Array(sensors.length).fill(0);
  const zones = []; // [{i, top, bottom}] in depth-sorted order, for labeling
  sorted.forEach((s, pos) => {
    const top = pos === 0 ? 0 : (sorted[pos - 1].depth + s.depth) / 2;
    const bottom = pos === sorted.length - 1 ? rootZoneDepth : (s.depth + sorted[pos + 1].depth) / 2;
    thicknesses[s.i] = Math.max(0, bottom - top);
    zones.push({ i: s.i, top: Math.max(0, top), bottom: Math.max(0, bottom) });
  });

  return { thicknesses, zones, warning };
}

// Builds "θ<sub>sub</sub> = value%" as SVG markup using offset tspans - a reliable
// cross-browser way to fake a subscript in SVG text.
function thetaLabel(sub, value) {
  const v = isNaN(value) ? "?" : Math.round(value * 10) / 10;
  return '<tspan font-style="italic">θ</tspan>' +
    '<tspan font-size="10" dy="3">' + sub + '</tspan>' +
    '<tspan dy="-3"> = ' + v + '%</tspan>';
}

// --- Live SVG diagram of the sensor profile (realistic probe styling) -----
function renderProfileDiagram(rootZoneDepth, zones, fcValues, currentValues) {
  const depths = sensors.map((s) => s.depth);
  const validDepths = depths.filter((d) => !isNaN(d) && d >= 0);
  const profileBottom = Math.max(rootZoneDepth || 0, ...validDepths, 1);

  const width = 460, height = Math.max(420, 86 * sensors.length + 130);
  const top = 34, bottom = height - 34;
  const colX = 150, colW = 120;
  const colCenter = colX + colW / 2;
  const scale = (bottom - top) / profileBottom;
  const y = (d) => top + d * scale;

  const indexed = sensors.map((s, i) => ({ ...s, i })).filter((s) => !isNaN(s.depth));
  const sorted = [...indexed].sort((a, b) => a.depth - b.depth);

  let bands = "";
  let zoneLabels = "";
  zones.forEach((z, pos) => {
    const fill = pos % 2 === 0 ? "#D9C19A" : "#CBAE80";
    const yTop = y(z.top), yBottom = y(Math.min(profileBottom, z.bottom));
    bands += '<rect x="' + colX + '" y="' + yTop + '" width="' + colW + '" height="' + Math.max(0, yBottom - yTop) + '" fill="' + fill + '"></rect>';

    // Explicit depth range used for this sensor's zone, labeled to the left of the column.
    const midY = (yTop + yBottom) / 2;
    zoneLabels +=
      '<text x="' + (colX - 10) + '" y="' + (midY + 4) + '" font-size="12" text-anchor="end" font-family="Public Sans, sans-serif" fill="#5a4a33">' +
      formatNumber(z.top) + '&ndash;' + formatNumber(Math.min(profileBottom, z.bottom)) + ' in</text>';
  });

  let dividers = "";
  sorted.slice(0, -1).forEach((s, pos) => {
    const mid = (s.depth + sorted[pos + 1].depth) / 2;
    dividers += '<line x1="' + colX + '" y1="' + y(mid) + '" x2="' + (colX + colW) + '" y2="' + y(mid) +
      '" stroke="#8a7355" stroke-width="1" stroke-dasharray="4,3"></line>';
  });

  // Access tube running down the middle, with a data cable inside it, like a real
  // capacitance-probe installation (sensor collars clipped to a central tube).
  const tubeW = 20;
  const tubeBottomY = sorted.length ? y(sorted[sorted.length - 1].depth) + 12 : y(0);
  let tube =
    '<rect x="' + (colCenter - tubeW / 2) + '" y="' + top + '" width="' + tubeW + '" height="' + (tubeBottomY - top) +
    '" fill="#F3EDE0" stroke="#8a7355" stroke-width="1"></rect>' +
    '<line x1="' + colCenter + '" y1="' + top + '" x2="' + colCenter + '" y2="' + tubeBottomY +
    '" stroke="#E0B400" stroke-width="2"></line>';

  let sensorMarks = "";
  sorted.forEach((s) => {
    const sy = y(s.depth);
    const fc = fcValues[s.i];
    const cur = currentValues[s.i];
    const nodeW = 42, nodeH = 12;

    // The sensor "collar" clipped onto the access tube.
    const node =
      '<rect x="' + (colCenter - nodeW / 2) + '" y="' + (sy - nodeH / 2) + '" width="' + nodeW + '" height="' + nodeH +
      '" rx="2.5" fill="#8c8c8c" stroke="#4a4a4a" stroke-width="1.2"></rect>' +
      '<rect x="' + (colCenter - nodeW / 2) + '" y="' + (sy - 2) + '" width="' + nodeW + '" height="4" fill="#5a5a5a"></rect>';

    // Leader line from the collar out to the label block on the right.
    const leaderStartX = colX + colW;
    const leaderEndX = leaderStartX + 20;
    const leader = '<line x1="' + (colCenter + nodeW / 2) + '" y1="' + sy + '" x2="' + leaderEndX + '" y2="' + sy +
      '" stroke="#191919" stroke-width="1.2" stroke-dasharray="2,2"></line>';

    const labelX = leaderEndX + 8;
    const depthLabel = (isNaN(s.depth) ? "?" : s.depth) + " in";
    const label =
      '<text x="' + labelX + '" y="' + (sy - 16) + '" font-size="15" font-weight="800" font-family="Public Sans, sans-serif" fill="#191919">S' + (s.i + 1) + ' — ' + depthLabel + '</text>' +
      '<text x="' + labelX + '" y="' + (sy + 4) + '" font-size="14" font-family="Public Sans, sans-serif" fill="#191919">' + thetaLabel("v", cur) + '</text>' +
      '<text x="' + labelX + '" y="' + (sy + 23) + '" font-size="14" font-family="Public Sans, sans-serif" fill="var(--text-muted)">' + thetaLabel("fc", fc) + '</text>';

    sensorMarks += leader + node + label;
  });

  const svg =
    '<rect x="' + colX + '" y="' + top + '" width="' + colW + '" height="' + (bottom - top) + '" fill="#E8D5B5" stroke="#8a7355"></rect>' +
    bands +
    '<rect x="' + colX + '" y="' + top + '" width="' + colW + '" height="' + (bottom - top) + '" fill="none" stroke="#8a7355" stroke-width="1.5"></rect>' +
    dividers +
    tube +
    zoneLabels +
    '<line x1="' + (colX - 12) + '" y1="' + top + '" x2="' + (colX + colW) + '" y2="' + top + '" stroke="#2c5a2a" stroke-width="2.5"></line>' +
    '<text x="' + (colX - 12) + '" y="' + (top - 10) + '" font-size="13" font-family="Public Sans, sans-serif" fill="#2c5a2a" text-anchor="start">surface (0 in)</text>' +
    '<text x="' + colX + '" y="' + (bottom + 22) + '" font-size="12" font-family="Public Sans, sans-serif" fill="var(--text-muted)">root zone bottom: ' + (isNaN(rootZoneDepth) ? "?" : rootZoneDepth) + ' in</text>' +
    sensorMarks;

  profileDiagram.setAttribute("viewBox", "0 0 " + width + " " + height);
  profileDiagram.setAttribute("height", height);
  profileDiagram.innerHTML = svg;
}

// --- SWD vs. MAD bar comparison --------------------------------------------
function renderSwdMadChart(SWD, MAD_total) {
  const width = 300, height = 270;
  const left = 46, top = 20, bottom = height - 50;
  const plotH = bottom - top;
  const maxVal = Math.max(SWD, MAD_total, 0.1) * 1.25;
  const barW = 70, gap = 50;
  const bar1X = left + 20;
  const bar2X = bar1X + barW + gap;

  const yOf = (v) => bottom - (Math.max(0, v) / maxVal) * plotH;
  const barColor = SWD >= MAD_total ? "#d9534f" : "#5a7fa6";

  let gridlines = "";
  for (let i = 0; i <= 4; i++) {
    const v = (maxVal * i) / 4;
    const gy = yOf(v);
    gridlines +=
      '<line x1="' + left + '" y1="' + gy + '" x2="' + (bar2X + barW) + '" y2="' + gy + '" stroke="#e2ded4" stroke-width="1"></line>' +
      '<text x="' + (left - 6) + '" y="' + (gy + 3) + '" font-size="9" text-anchor="end" font-family="Public Sans, sans-serif" fill="var(--text-muted)">' + v.toFixed(1) + '</text>';
  }

  const swdBarY = yOf(SWD);
  const madBarY = yOf(MAD_total);

  const svg =
    gridlines +
    '<line x1="' + left + '" y1="' + bottom + '" x2="' + (bar2X + barW) + '" y2="' + bottom + '" stroke="#191919" stroke-width="1.5"></line>' +
    '<rect x="' + bar1X + '" y="' + swdBarY + '" width="' + barW + '" height="' + (bottom - swdBarY) + '" fill="' + barColor + '"></rect>' +
    '<rect x="' + bar2X + '" y="' + madBarY + '" width="' + barW + '" height="' + (bottom - madBarY) + '" fill="#F1B300" stroke="#191919" stroke-width="1"></rect>' +
    '<text x="' + (bar1X + barW / 2) + '" y="' + (swdBarY - 8) + '" font-size="13" font-weight="800" text-anchor="middle" font-family="Public Sans, sans-serif" fill="#191919">' + formatNumber(SWD) + ' in</text>' +
    '<text x="' + (bar2X + barW / 2) + '" y="' + (madBarY - 8) + '" font-size="13" font-weight="800" text-anchor="middle" font-family="Public Sans, sans-serif" fill="#191919">' + formatNumber(MAD_total) + ' in</text>' +
    '<text x="' + (bar1X + barW / 2) + '" y="' + (bottom + 18) + '" font-size="12" font-weight="700" text-anchor="middle" font-family="Public Sans, sans-serif" fill="#191919">SWD</text>' +
    '<text x="' + (bar1X + barW / 2) + '" y="' + (bottom + 32) + '" font-size="9" text-anchor="middle" font-family="Public Sans, sans-serif" fill="var(--text-muted)">water depleted</text>' +
    '<text x="' + (bar2X + barW / 2) + '" y="' + (bottom + 18) + '" font-size="12" font-weight="700" text-anchor="middle" font-family="Public Sans, sans-serif" fill="#191919">MAD</text>' +
    '<text x="' + (bar2X + barW / 2) + '" y="' + (bottom + 32) + '" font-size="9" text-anchor="middle" font-family="Public Sans, sans-serif" fill="var(--text-muted)">allowed limit</text>';

  swdMadChart.setAttribute("viewBox", "0 0 " + width + " " + height);
  swdMadChart.innerHTML = svg;
}

function calculate() {
  const rootZoneDepth = parseFloat(rootZoneDepthInput.value);

  madReadout.textContent = madPct.value + "% of AWC";
  etReadout.textContent = parseFloat(etRate.value).toFixed(2) + " in/d";
  efficiencyReadout.textContent = appEfficiency.value + "%";

  if (isNaN(rootZoneDepth) || sensors.length === 0) {
    awcStatsGrid.innerHTML = tile("—", "Enter values above");
    decisionStatsGrid.innerHTML = "";
    decisionBanner.innerHTML = "";
    return;
  }

  const { thicknesses, zones, warning } = computeZoneThicknesses(rootZoneDepth);
  const fcValues = getFcValues();
  const pwpValues = getPwpValues();
  const currentValues = sensors.map((s) => s.current);

  renderProfileDiagram(rootZoneDepth, zones, fcValues, currentValues);

  if (fcValues.some((v) => isNaN(v)) || pwpValues.some((v) => isNaN(v)) || currentValues.some((v) => isNaN(v)) || sensors.some((s) => isNaN(s.depth))) {
    awcStatsGrid.innerHTML = tile("—", "Enter values above");
    decisionStatsGrid.innerHTML = "";
    decisionBanner.innerHTML = "";
    return;
  }

  const FC_total = fcValues.reduce((sum, v, i) => sum + (v / 100) * thicknesses[i], 0);
  const PWP_total = pwpValues.reduce((sum, v, i) => sum + (v / 100) * thicknesses[i], 0);
  const current_total = currentValues.reduce((sum, v, i) => sum + (v / 100) * thicknesses[i], 0);
  const AWC_total = FC_total - PWP_total;

  const mad = parseFloat(madPct.value);
  const MAD_total = (mad / 100) * AWC_total;

  let awcHtml =
    tile(formatNumber(FC_total) + " in", "Total water at field capacity") +
    tile(formatNumber(PWP_total) + " in", "Permanent wilting point (whole profile)") +
    tile(formatNumber(AWC_total) + " in", "Available water capacity (whole profile)") +
    tile(formatNumber(MAD_total) + " in", "Allowable depletion (MAD, in)", true);
  if (warning) {
    awcHtml = '<div class="note" style="grid-column:1/-1; color:#7a1f1f;">' + warning + '</div>' + awcHtml;
  }
  awcStatsGrid.innerHTML = awcHtml;

  const SWD = FC_total - current_total; // also the net depth to apply, by definition

  renderSwdMadChart(Math.max(0, SWD), MAD_total);

  const eff = parseFloat(appEfficiency.value);
  const grossDepth = SWD > 0 ? SWD / (eff / 100) : null;

  const et = parseFloat(etRate.value);
  const daysUntilMad = SWD < MAD_total ? (MAD_total - SWD) / et : null;

  if (SWD <= 0) {
    decisionBanner.innerHTML = '<div class="ok-box">Soil is at or above field capacity (SWD &le; 0) — no irrigation needed.</div>';
  } else if (SWD >= MAD_total) {
    decisionBanner.innerHTML = '<div class="warning-box">IRRIGATE NOW — SWD (' + formatNumber(SWD) +
      ' in) has reached or exceeded MAD (' + formatNumber(MAD_total) + ' in).</div>';
  } else {
    let msg = "OK for now — SWD (" + formatNumber(SWD) + " in) is below MAD (" + formatNumber(MAD_total) + " in), with " +
      formatNumber(MAD_total - SWD) + " in of room left.";
    if (daysUntilMad !== null) msg += " At " + formatNumber(et) + " in/d, that's about " + formatNumber(daysUntilMad) + " more days.";
    decisionBanner.innerHTML = '<div class="ok-box">' + msg + '</div>';
  }

  let decisionHtml =
    tile(formatNumber(current_total) + " in", "Current total water in profile", true) +
    tile(formatNumber(Math.max(0, SWD)) + " in", "SWD = depth to apply to reach field capacity", true);
  if (grossDepth !== null) {
    decisionHtml += tile(formatNumber(grossDepth) + " in", "Gross depth to apply (at " + formatNumber(eff) + "% efficiency)");
  }
  if (daysUntilMad !== null) {
    decisionHtml += tile(formatNumber(daysUntilMad) + " d", "Estimated days until SWD reaches MAD");
  }
  decisionStatsGrid.innerHTML = decisionHtml;
}

[rootZoneDepthInput, madPct, etRate, appEfficiency].forEach((el) => el.addEventListener("input", calculate));

renderSensors();
calculate();
