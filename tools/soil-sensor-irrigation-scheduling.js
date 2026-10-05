// Soil Moisture Sensor Irrigation Scheduling calculator
// Not from the textbook - built from a class slide and the "midpoint method" for
// assigning each sensor a soil depth zone (see USU Extension's soil sensor setup
// guide: https://extension.usu.edu/crops/tools/soil-sensor-setup).
//
// Each sensor's zone runs from the midpoint to its shallower neighbor (or the
// surface, for the shallowest sensor) to the midpoint to its deeper neighbor (or
// the root zone depth, for the deepest sensor). Water content x zone thickness,
// summed over all sensors, gives the total water in the profile.
//
// Dg = FC - MAD                         (refill/trigger point)
// Depth to apply = FC - D_current       (net depth to return to field capacity)
// Remaining buffer = D_current - trigger
//
// Verified against the class slide: although the absolute FC/current totals shift
// slightly with the exact zone-thickness convention used, "depth to apply" and
// "remaining buffer" are differences that come out identical regardless, as long as
// the same thicknesses are applied to every reading.

const rootZoneDepthInput = document.getElementById("root-zone-depth");
const singleFcToggle = document.getElementById("single-fc-toggle");
const fieldSingleFc = document.getElementById("field-single-fc");
const singleFcValue = document.getElementById("single-fc-value");
const sensorHeader = document.getElementById("sensor-header");
const sensorsContainer = document.getElementById("sensors-container");

const awcStatsGrid = document.getElementById("awc-stats-grid");
const fieldAwc = document.getElementById("field-awc");
const fieldPwp = document.getElementById("field-pwp");
const awcPerFt = document.getElementById("awc-per-ft");
const pwpValue = document.getElementById("pwp-value");
const madPct = document.getElementById("mad-pct");

const etRate = document.getElementById("et-rate");
const appEfficiency = document.getElementById("app-efficiency");
const decisionBanner = document.getElementById("decision-banner");
const decisionStatsGrid = document.getElementById("decision-stats-grid");

let sensors = [
  { depth: 6, fc: 32, current: 24 },
  { depth: 12, fc: 29, current: 27 },
  { depth: 24, fc: 34, current: 29 },
];

function tile(value, label, primary) {
  return '<div class="stat-tile' + (primary ? " stat-tile--primary" : "") + '"><div class="stat-tile__value">' +
    value + '</div><div class="stat-tile__label">' + label + '</div></div>';
}

function renderSensors() {
  const singleFc = singleFcToggle.checked;
  sensorHeader.classList.toggle("sensor-header--single-fc", singleFc);
  sensorsContainer.innerHTML = "";

  sensors.forEach((s, i) => {
    const row = document.createElement("div");
    row.className = "sensor-row" + (singleFc ? " sensor-row--single-fc" : "");
    const fcCell = singleFc ? "" :
      '<div><input type="number" step="any" class="sensor-fc" value="' + s.fc + '"></div>';
    row.innerHTML =
      '<div class="sensor-row__label">S' + (i + 1) + '</div>' +
      '<div><input type="number" step="any" class="sensor-depth" value="' + s.depth + '"></div>' +
      fcCell +
      '<div><input type="number" step="any" class="sensor-current" value="' + s.current + '"></div>' +
      '<div class="row-remove"><button type="button" title="Remove sensor">&times;</button></div>';

    row.querySelector(".sensor-depth").addEventListener("input", (e) => {
      sensors[i].depth = parseFloat(e.target.value);
      calculate();
    });
    const fcInput = row.querySelector(".sensor-fc");
    if (fcInput) {
      fcInput.addEventListener("input", (e) => {
        sensors[i].fc = parseFloat(e.target.value);
        calculate();
      });
    }
    row.querySelector(".sensor-current").addEventListener("input", (e) => {
      sensors[i].current = parseFloat(e.target.value);
      calculate();
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
  sensors.push({ depth: (last ? last.depth : 0) + 6, fc: last ? last.fc : 30, current: last ? last.current : 25 });
  renderSensors();
  calculate();
});

singleFcToggle.addEventListener("change", () => {
  fieldSingleFc.classList.toggle("field--hidden", !singleFcToggle.checked);
  renderSensors();
  calculate();
});

document.querySelectorAll('input[name="awc-mode"]').forEach((r) =>
  r.addEventListener("change", () => {
    const mode = document.querySelector('input[name="awc-mode"]:checked').value;
    fieldAwc.classList.toggle("field--hidden", mode !== "awc");
    fieldPwp.classList.toggle("field--hidden", mode !== "pwp");
    calculate();
  })
);

// Returns {thicknesses, order, warning} where `order` maps sensor array indices to
// their position in depth-sorted order (thicknesses is indexed the same way as the
// *original* `sensors` array, not the sorted one).
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

function calculate() {
  const rootZoneDepth = parseFloat(rootZoneDepthInput.value);
  const singleFc = singleFcToggle.checked;
  const fcShared = parseFloat(singleFcValue.value);

  if (isNaN(rootZoneDepth) || sensors.length === 0) {
    awcStatsGrid.innerHTML = tile("—", "Enter values above");
    decisionStatsGrid.innerHTML = "";
    decisionBanner.innerHTML = "";
    return;
  }

  const { thicknesses, warning } = computeZoneThicknesses(rootZoneDepth);

  const fcValues = sensors.map((s) => (singleFc ? fcShared : s.fc));
  const currentValues = sensors.map((s) => s.current);

  if (fcValues.some((v) => isNaN(v)) || currentValues.some((v) => isNaN(v)) || sensors.some((s) => isNaN(s.depth))) {
    awcStatsGrid.innerHTML = tile("—", "Enter values above");
    decisionStatsGrid.innerHTML = "";
    decisionBanner.innerHTML = "";
    return;
  }

  const FC_total = fcValues.reduce((sum, v, i) => sum + (v / 100) * thicknesses[i], 0);
  const current_total = currentValues.reduce((sum, v, i) => sum + (v / 100) * thicknesses[i], 0);

  const mode = document.querySelector('input[name="awc-mode"]:checked').value;
  let AWC_total, PWP_total;
  if (mode === "awc") {
    const perFt = parseFloat(awcPerFt.value);
    if (isNaN(perFt)) { awcStatsGrid.innerHTML = tile("—", "Enter AWC above"); return; }
    AWC_total = perFt * (rootZoneDepth / 12);
    PWP_total = FC_total - AWC_total;
  } else {
    const pwp = parseFloat(pwpValue.value);
    if (isNaN(pwp)) { awcStatsGrid.innerHTML = tile("—", "Enter PWP above"); return; }
    PWP_total = pwp;
    AWC_total = FC_total - PWP_total;
  }

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

[rootZoneDepthInput, singleFcValue, awcPerFt, pwpValue, madPct, etRate, appEfficiency].forEach((el) =>
  el.addEventListener("input", calculate)
);

document.getElementById("load-example").addEventListener("click", () => {
  sensors = [
    { depth: 6, fc: 32, current: 24 },
    { depth: 12, fc: 29, current: 27 },
    { depth: 24, fc: 34, current: 29 },
  ];
  rootZoneDepthInput.value = 24;
  singleFcToggle.checked = false;
  fieldSingleFc.classList.add("field--hidden");
  document.getElementById("mode-awc").checked = true;
  fieldAwc.classList.remove("field--hidden");
  fieldPwp.classList.add("field--hidden");
  awcPerFt.value = 2.1;
  madPct.value = 50;
  etRate.value = "";
  appEfficiency.value = "";
  renderSensors();
  calculate();
});

renderSensors();
calculate();
