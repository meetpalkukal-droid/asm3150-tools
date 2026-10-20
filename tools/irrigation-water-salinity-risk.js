// Irrigation Water Salinity & Sodicity Risk (Chapter 7, bundles Examples 7.1-7.3).
// Shared data/digitized curves come from assets/js/salinity-data.js.

// ---------- Panel 1: Water quality & salt load ----------
const concModeToggle = document.getElementById("conc-mode-toggle");
const fieldEc = document.getElementById("field-ec");
const fieldConc = document.getElementById("field-conc");
const ecInput = document.getElementById("ec-input");
const concInput = document.getElementById("conc-input");
const depthInput = document.getElementById("depth-input");
const areaInput = document.getElementById("area-input");
const panel1Stats = document.getElementById("panel1-stats");

function currentEC() {
  return concModeToggle.checked ? parseFloat(concInput.value) / 640 : parseFloat(ecInput.value);
}
function currentConc() {
  return concModeToggle.checked ? parseFloat(concInput.value) : parseFloat(ecInput.value) * 640;
}

function tile(value, label, primary) {
  return '<div class="stat-tile' + (primary ? " stat-tile--primary" : "") + '">' +
    '<div class="stat-tile__value">' + value + "</div>" +
    '<div class="stat-tile__label">' + label + "</div></div>";
}

function updateConcModeVisibility() {
  fieldEc.classList.toggle("field--hidden", concModeToggle.checked);
  fieldConc.classList.toggle("field--hidden", !concModeToggle.checked);
}

function calcPanel1() {
  const EC = currentEC();
  const C = currentConc();
  const depth = parseFloat(depthInput.value);
  const area = parseFloat(areaInput.value);

  if (isNaN(EC) || isNaN(depth) || isNaN(area)) {
    panel1Stats.innerHTML = tile("—", "Enter values above");
    return;
  }

  const cls = classifyWaterQuality(EC);
  const W_lb = 0.226 * C * depth * area;
  const W_tons = W_lb / 2000;

  panel1Stats.innerHTML =
    tile(formatNumber(EC) + " dS/m", "Electrical conductivity") +
    tile(formatNumber(C) + " mg/L", "Salt concentration") +
    tile(cls.label, "Table 7.3 water quality class (" + cls.problems + " crop problems)") +
    tile(formatNumber(W_tons) + " tons", "Salt applied to the field this season", true);

  return { EC, C };
}

// ---------- Panel 2: Crop yield impact ----------
const cropSelect = document.getElementById("crop-select");
const eceModeToggle = document.getElementById("ece-mode-toggle");
const fieldEce = document.getElementById("field-ece");
const eceInput = document.getElementById("ece-input");
const ymaxInput = document.getElementById("ymax-input");
const yieldUnitInput = document.getElementById("yield-unit-input");
const panel2Stats = document.getElementById("panel2-stats");

populateCropSelect(cropSelect, false);
cropSelect.value = "corn";

function updateEceModeVisibility() {
  fieldEce.classList.toggle("field--hidden", !eceModeToggle.checked);
}

function calcPanel2(waterEC) {
  const crop = cropSaltToleranceByKey(cropSelect.value);
  const ECe = eceModeToggle.checked ? parseFloat(eceInput.value) : waterEC;
  const Ymax = parseFloat(ymaxInput.value);
  const yieldUnit = yieldUnitInput.value || "yield units";

  if (!crop || isNaN(ECe) || isNaN(Ymax)) {
    panel2Stats.innerHTML = tile("—", "Enter values above");
    return;
  }

  const Yr = relativeYield(ECe, crop.T, crop.S);
  const Ya = (Yr / 100) * Ymax;

  panel2Stats.innerHTML =
    tile(crop.T.toFixed(1) + " dS/m", "Salt tolerance threshold (T)") +
    tile(crop.S.toFixed(1) + " %/(dS/m)", "Yield decline slope (S)") +
    tile(formatNumber(ECe) + " dS/m", "Root-zone salinity used (ECe)") +
    tile(formatNumber(Yr) + "%", "Relative yield (Yr)", true) +
    tile(formatNumber(Ya) + " " + yieldUnit, "Actual yield (Ya)", true);
}

// ---------- Panel 3: Sodicity hazard ----------
const naInput = document.getElementById("na-input");
const caInput = document.getElementById("ca-input");
const mgInput = document.getElementById("mg-input");
const sarEcModeToggle = document.getElementById("sar-ec-mode-toggle");
const fieldSarEc = document.getElementById("field-sar-ec");
const sarEcInput = document.getElementById("sar-ec-input");
const panel3Stats = document.getElementById("panel3-stats");

function updateSarEcModeVisibility() {
  fieldSarEc.classList.toggle("field--hidden", !sarEcModeToggle.checked);
}

function calcPanel3(waterEC) {
  const CNa = parseFloat(naInput.value) / 1; // valence 1
  const CCa = parseFloat(caInput.value) / 2; // valence 2
  const CMg = parseFloat(mgInput.value) / 2; // valence 2
  const ECa = sarEcModeToggle.checked ? parseFloat(sarEcInput.value) : waterEC;

  if (isNaN(CNa) || isNaN(CCa) || isNaN(CMg) || isNaN(ECa)) {
    panel3Stats.innerHTML = tile("—", "Enter values above");
    renderSodicityChart(null, null);
    return;
  }

  const SAR = CNa / Math.sqrt(CCa + CMg);
  const result = classifySodicity(ECa, SAR);

  panel3Stats.innerHTML =
    tile(formatNumber(SAR), "Sodium adsorption ratio (SAR)") +
    tile(formatNumber(ECa) + " dS/m", "EC used for this check") +
    tile(result.label, "Figure 7.10 classification", true);

  renderSodicityChart(ECa, SAR);
}

function renderSodicityChart(ECa, SAR) {
  const svg = document.getElementById("sodicity-chart");
  const W = 560, H = 420;
  const padL = 60, padR = 20, padT = 20, padB = 50;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const xMax = 6, yMax = 35;
  const xPx = (x) => padL + (x / xMax) * plotW;
  const yPx = (y) => padT + plotH - (y / yMax) * plotH;

  let svgContent = "";
  // gridlines + axis labels
  for (let x = 0; x <= xMax; x++) {
    svgContent += '<line x1="' + xPx(x) + '" y1="' + padT + '" x2="' + xPx(x) + '" y2="' + (padT + plotH) + '" stroke="#e5e0d5" stroke-width="1"/>';
    svgContent += '<text x="' + xPx(x) + '" y="' + (padT + plotH + 20) + '" font-size="12" text-anchor="middle" fill="#666">' + x + "</text>";
  }
  for (let y = 0; y <= yMax; y += 5) {
    svgContent += '<line x1="' + padL + '" y1="' + yPx(y) + '" x2="' + (padL + plotW) + '" y2="' + yPx(y) + '" stroke="#e5e0d5" stroke-width="1"/>';
    svgContent += '<text x="' + (padL - 10) + '" y="' + (yPx(y) + 4) + '" font-size="12" text-anchor="end" fill="#666">' + y + "</text>";
  }
  svgContent += '<text x="' + (padL + plotW / 2) + '" y="' + (H - 8) + '" font-size="13" text-anchor="middle" fill="#333">Salinity of applied water (EC' + "ₐ" + "), dS/m</text>";
  svgContent += '<text x="16" y="' + (padT + plotH / 2) + '" font-size="13" text-anchor="middle" fill="#333" transform="rotate(-90 16 ' + (padT + plotH / 2) + ')">Sodium Adsorption Ratio (SAR)</text>';

  // boundary line A (piecewise)
  const aPts = [[0, sodicityLineA(0)], [0.504, sodicityLineA(0.504)], [xMax, sodicityLineA(xMax)]];
  const bPts = [[sodicityLineB(0) > 0 ? 0 : 3.615 / 6.868, 0], [xMax, sodicityLineB(xMax)]];
  function toPath(pts) {
    return pts.map((p, i) => (i === 0 ? "M" : "L") + xPx(p[0]) + "," + yPx(Math.min(p[1], yMax))).join(" ");
  }
  svgContent += '<path d="' + toPath(aPts) + '" fill="none" stroke="#7a1f1f" stroke-width="2"/>';
  svgContent += '<path d="' + toPath(bPts) + '" fill="none" stroke="#1f4a7a" stroke-width="2"/>';

  svgContent += '<text x="' + xPx(0.3) + '" y="' + yPx(31) + '" font-size="12" fill="#7a1f1f">Severe</text>';
  svgContent += '<text x="' + xPx(2.0) + '" y="' + yPx(31) + '" font-size="12" fill="#444">Slight&#8211;moderate</text>';
  svgContent += '<text x="' + xPx(3.8) + '" y="' + yPx(6) + '" font-size="12" fill="#1f4a7a">No reduction</text>';

  // plot border
  svgContent += '<rect x="' + padL + '" y="' + padT + '" width="' + plotW + '" height="' + plotH + '" fill="none" stroke="#999" stroke-width="1"/>';

  if (ECa !== null && SAR !== null && !isNaN(ECa) && !isNaN(SAR)) {
    const cx = xPx(Math.min(ECa, xMax));
    const cy = yPx(Math.min(SAR, yMax));
    svgContent += '<circle cx="' + cx + '" cy="' + cy + '" r="7" fill="#F1B300" stroke="#191919" stroke-width="2"/>';
  }

  svg.innerHTML = svgContent;
}

// ---------- Wire everything together ----------
function calculateAll() {
  const p1 = calcPanel1();
  const waterEC = p1 ? p1.EC : NaN;
  calcPanel2(waterEC);
  calcPanel3(waterEC);
}

concModeToggle.addEventListener("change", () => { updateConcModeVisibility(); calculateAll(); });
eceModeToggle.addEventListener("change", () => { updateEceModeVisibility(); calculateAll(); });
sarEcModeToggle.addEventListener("change", () => { updateSarEcModeVisibility(); calculateAll(); });

[ecInput, concInput, depthInput, areaInput, cropSelect, eceInput, ymaxInput, yieldUnitInput, naInput, caInput, mgInput, sarEcInput].forEach((el) =>
  el.addEventListener("input", calculateAll)
);

updateConcModeVisibility();
updateEceModeVisibility();
updateSarEcModeVisibility();
calculateAll();
