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
// trigger = FC - MAD                    (refill/trigger point)
// Depth to apply = FC - D_current       (net depth to return to field capacity)
// Remaining buffer = D_current - trigger

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

const etRate = document.getElementById("et-rate");
const appEfficiency = document.getElementById("app-efficiency");
const decisionBanner = document.getElementById("decision-banner");
const decisionStatsGrid = document.getElementById("decision-stats-grid");

const profileDiagram = document.getElementById("profile-diagram");

populateSoilTextureSelect(pwpTextureSelect, false);

let sensors = [
  { depth: 6, fc: 30, pwp: 15, current: 20 },
  { depth: 12, fc: 30, pwp: 15, current: 20 },
  { depth: 24, fc: 30, pwp: 15, current: 20 },
];

const COL_LABELS = { depth: "Depth", fc: "Field capacity", pwp: "Wilting point", current: "Current reading" };

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

function renderSensors() {
  const cols = visibleColumns();
  const gridCols = "3rem repeat(" + cols.length + ", 1fr) 2.2rem";

  sensorHeader.style.gridTemplateColumns = gridCols;
  sensorHeader.innerHTML = "<div></div>" + cols.map((c) => "<div>" + COL_LABELS[c] + "</div>").join("") + "<div></div>";

  sensorsContainer.innerHTML = "";
  sensors.forEach((s, i) => {
    const row = document.createElement("div");
    row.className = "sensor-row";
    row.style.gridTemplateColumns = gridCols;

    let html = '<div class="sensor-row__label">S' + (i + 1) + "</div>";
    cols.forEach((c) => {
      html += '<div><input type="number" step="any" class="sensor-' + c + '" value="' + s[c] + '"></div>';
    });
    html += '<div class="row-remove"><button type="button" title="Remove sensor">&times;</button></div>';
    row.innerHTML = html;

    cols.forEach((c) => {
      row.querySelector(".sensor-" + c).addEventListener("input", (e) => {
        sensors[i][c] = parseFloat(e.target.value);
        calculate();
      });
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

document.getElementById("add-sensor").addEventListener("click", () => {
  const last = sensors[sensors.length - 1];
  sensors.push({
    depth: (last ? last.depth : 0) + 6,
    fc: last ? last.fc : 30,
    pwp: last ? last.pwp : 15,
    current: last ? last.current : 20,
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
pwpTextureSelect.addEventListener("change", calculate);

// Returns {thicknesses, warning}; thicknesses is indexed the same as `sensors`.
function computeZoneThicknesses(rootZoneDepth) {
  const indexed = sensors.map((s, i) => ({ ...s, i })).filter((s) => !isNaN(s.depth));
  if (indexed.length === 0) return { thicknesses: [], warning: null };
  const sorted = [...indexed].sort((a, b) => a.depth - b.depth);

  let warning = null;
  if (rootZoneDepth < sorted[sorted.length - 1].depth) {
    warning = "Root zone depth is shallower than your deepest sensor — the deepest sensor's zone was clamped to end at the root zone depth. Increase the root zone depth, or remove that sensor.";
  }

  const thicknesses = new Array(sensors.length).fill(0);
  sorted.forEach((s, pos) => {
    const top = pos === 0 ? 0 : (sorted[pos - 1].depth + s.depth) / 2;
    const bottom = pos === sorted.length - 1 ? rootZoneDepth : (s.depth + sorted[pos + 1].depth) / 2;
    thicknesses[s.i] = Math.max(0, bottom - top);
  });

  return { thicknesses, warning };
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

// --- Live SVG diagram of the sensor profile -------------------------------
function renderProfileDiagram(rootZoneDepth, thicknesses, fcValues, currentValues) {
  const depths = sensors.map((s) => s.depth);
  const validDepths = depths.filter((d) => !isNaN(d) && d >= 0);
  const profileBottom = Math.max(rootZoneDepth || 0, ...validDepths, 1);

  const width = 340, height = 380;
  const top = 26, bottom = height - 20;
  const colX = 70, colW = 110;
  const scale = (bottom - top) / profileBottom;
  const y = (d) => top + d * scale;

  // Sort sensors by depth for drawing zone bands in order.
  const indexed = sensors.map((s, i) => ({ ...s, i })).filter((s) => !isNaN(s.depth));
  const sorted = [...indexed].sort((a, b) => a.depth - b.depth);

  let bands = "";
  sorted.forEach((s, pos) => {
    const zTop = pos === 0 ? 0 : (sorted[pos - 1].depth + s.depth) / 2;
    const zBottom = pos === sorted.length - 1 ? rootZoneDepth : (s.depth + sorted[pos + 1].depth) / 2;
    const fill = pos % 2 === 0 ? "#D9C19A" : "#CBAE80";
    bands += '<rect x="' + colX + '" y="' + y(Math.max(0, zTop)) + '" width="' + colW + '" height="' +
      Math.max(0, y(Math.min(profileBottom, zBottom)) - y(Math.max(0, zTop))) + '" fill="' + fill + '"></rect>';
  });

  let dividers = "";
  sorted.slice(0, -1).forEach((s, pos) => {
    const mid = (s.depth + sorted[pos + 1].depth) / 2;
    dividers += '<line x1="' + colX + '" y1="' + y(mid) + '" x2="' + (colX + colW) + '" y2="' + y(mid) +
      '" stroke="#8a7355" stroke-width="1" stroke-dasharray="4,3"></line>';
  });

  let sensorMarks = "";
  sorted.forEach((s) => {
    const sy = y(s.depth);
    const fc = fcValues[s.i];
    const cur = currentValues[s.i];
    const label = (isNaN(s.depth) ? "?" : s.depth) + " in" +
      (isNaN(cur) ? "" : " — " + Math.round(cur * 10) / 10 + "%" + (isNaN(fc) ? "" : " of " + Math.round(fc * 10) / 10 + "%"));
    sensorMarks +=
      '<line x1="' + (colX + colW) + '" y1="' + sy + '" x2="' + (colX + colW + 14) + '" y2="' + sy + '" stroke="#191919" stroke-width="1.5"></line>' +
      '<circle cx="' + (colX + colW) + '" cy="' + sy + '" r="5" fill="' + "#F1B300" + '" stroke="#191919" stroke-width="1.5"></circle>' +
      '<text x="' + (colX + colW + 18) + '" y="' + (sy + 4) + '" font-size="11" font-family="Public Sans, sans-serif" fill="#191919">' + label + '</text>';
  });

  const svg =
    '<rect x="' + colX + '" y="' + top + '" width="' + colW + '" height="' + (bottom - top) + '" fill="#E8D5B5" stroke="#8a7355"></rect>' +
    bands +
    '<rect x="' + colX + '" y="' + top + '" width="' + colW + '" height="' + (bottom - top) + '" fill="none" stroke="#8a7355" stroke-width="1.5"></rect>' +
    dividers +
    '<line x1="' + (colX - 8) + '" y1="' + top + '" x2="' + (colX + colW) + '" y2="' + top + '" stroke="#2c5a2a" stroke-width="2"></line>' +
    '<text x="' + (colX - 12) + '" y="' + (top - 6) + '" font-size="10" font-family="Public Sans, sans-serif" fill="#2c5a2a" text-anchor="start">surface (0 in)</text>' +
    '<text x="' + colX + '" y="' + (bottom + 14) + '" font-size="10" font-family="Public Sans, sans-serif" fill="var(--text-muted)">root zone bottom: ' + (isNaN(rootZoneDepth) ? "?" : rootZoneDepth) + ' in</text>' +
    sensorMarks;

  profileDiagram.setAttribute("viewBox", "0 0 " + width + " " + height);
  profileDiagram.innerHTML = svg;
}

function calculate() {
  const rootZoneDepth = parseFloat(rootZoneDepthInput.value);

  if (isNaN(rootZoneDepth) || sensors.length === 0) {
    awcStatsGrid.innerHTML = tile("—", "Enter values above");
    decisionStatsGrid.innerHTML = "";
    decisionBanner.innerHTML = "";
    return;
  }

  const { thicknesses, warning } = computeZoneThicknesses(rootZoneDepth);
  const fcValues = getFcValues();
  const pwpValues = getPwpValues();
  const currentValues = sensors.map((s) => s.current);

  renderProfileDiagram(rootZoneDepth, thicknesses, fcValues, currentValues);

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
  if (isNaN(mad)) { awcStatsGrid.innerHTML = tile("—", "Enter MAD above"); return; }
  const MAD_total = (mad / 100) * AWC_total;
  const trigger = FC_total - MAD_total;

  let awcHtml =
    tile(formatNumber(FC_total) + " in", "Total water at field capacity") +
    tile(formatNumber(PWP_total) + " in", "Permanent wilting point (whole profile)") +
    tile(formatNumber(AWC_total) + " in", "Available water capacity (whole profile)") +
    tile(formatNumber(MAD_total) + " in", "Allowable depletion (MAD, in)") +
    tile(formatNumber(trigger) + " in", "Trigger / refill point", true);
  if (warning) {
    awcHtml = '<div class="note" style="grid-column:1/-1; color:#7a1f1f;">' + warning + '</div>' + awcHtml;
  }
  awcStatsGrid.innerHTML = awcHtml;

  const depthToApply = FC_total - current_total;
  const remainingBuffer = current_total - trigger;

  const eff = parseFloat(appEfficiency.value);
  const grossDepth = !isNaN(eff) && eff > 0 && depthToApply > 0 ? depthToApply / (eff / 100) : null;

  const et = parseFloat(etRate.value);
  const daysUntilTrigger = !isNaN(et) && et > 0 && remainingBuffer > 0 ? remainingBuffer / et : null;

  if (remainingBuffer <= 0) {
    decisionBanner.innerHTML = '<div class="warning-box">IRRIGATE NOW — current water is ' +
      formatNumber(Math.abs(remainingBuffer)) + ' in below the trigger point.</div>';
  } else {
    let msg = "OK for now — " + formatNumber(remainingBuffer) + " in of buffer remain before the trigger.";
    if (daysUntilTrigger !== null) msg += " At " + formatNumber(et) + " in/d, that's about " + formatNumber(daysUntilTrigger) + " more days.";
    decisionBanner.innerHTML = '<div class="ok-box">' + msg + '</div>';
  }

  let decisionHtml =
    tile(formatNumber(current_total) + " in", "Current total water in profile", true) +
    tile(formatNumber(Math.max(0, depthToApply)) + " in", "Net depth to apply (to reach field capacity)", true);
  if (depthToApply <= 0) {
    decisionHtml += tile("0 in", "Already at or above field capacity — no irrigation needed");
  }
  if (grossDepth !== null) {
    decisionHtml += tile(formatNumber(grossDepth) + " in", "Gross depth to apply (at " + formatNumber(eff) + "% efficiency)");
  }
  if (daysUntilTrigger !== null) {
    decisionHtml += tile(formatNumber(daysUntilTrigger) + " d", "Estimated days until trigger");
  }
  decisionStatsGrid.innerHTML = decisionHtml;
}

[rootZoneDepthInput, singleFcValue, singlePwpValue, madPct, etRate, appEfficiency].forEach((el) =>
  el.addEventListener("input", calculate)
);

renderSensors();
calculate();
