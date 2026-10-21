// Mainline Pipe Sizing & Pressure Change (Chapter 8, Example 8.5, generalized).
// Shared data/formulas/charts come from assets/js/hydraulics-data.js.

const qInput = document.getElementById("q-input");
const qNumber = document.getElementById("q-number");
const maxvInput = document.getElementById("maxv-input");
const maxvNumber = document.getElementById("maxv-number");
const categorySelect = document.getElementById("category-select");
const sizeSelect = document.getElementById("size-select");
const sizingStats = document.getElementById("sizing-stats");

const materialSelect = document.getElementById("material-select");
const lengthInput = document.getElementById("length-input");
const p1Input = document.getElementById("p1-input");
const elevationInput = document.getElementById("elevation-input");
const minorLossInput = document.getElementById("minor-loss-input");
const pressureStats = document.getElementById("pressure-stats");

function tile(value, label, primary) {
  return '<div class="stat-tile' + (primary ? " stat-tile--primary" : "") + '">' +
    '<div class="stat-tile__value">' + value + "</div>" +
    '<div class="stat-tile__label">' + label + "</div></div>";
}

const CATEGORY_TO_MATERIAL_KEY = {
  "aluminum-sprinkler": "aluminum-couplers",
  "aluminum-gated": "aluminum-gates",
  "pvc-ips": "pvc",
  "pvc-pip": "pvc",
};

populatePipeCategorySelect(categorySelect);
categorySelect.value = "pvc-pip";
populatePipeMaterialSelect(materialSelect);
materialSelect.value = CATEGORY_TO_MATERIAL_KEY[categorySelect.value];

// Repopulates the size dropdown for the current category and pre-selects
// the recommended size. Only called when Q, target velocity, or category
// change - NOT when the user picks a different size themselves, so their
// manual override sticks.
function updateRecommendationAndOptions() {
  const Q = parseFloat(qInput.value);
  const maxV = parseFloat(maxvInput.value);
  const recommended = recommendPipeSize(categorySelect.value, Q, maxV);
  populatePipeSizeSelect(sizeSelect, categorySelect.value);
  if (recommended) sizeSelect.value = recommended.id.toFixed(3);
  calcSizing();
}

function calcSizing() {
  const Q = parseFloat(qInput.value);
  const maxV = parseFloat(maxvInput.value);
  const category = categorySelect.value;

  if (isNaN(Q) || isNaN(maxV)) {
    sizingStats.innerHTML = tile("—", "Enter values above");
    return;
  }

  const requiredD = requiredDiameterIn(Q, maxV);
  const recommended = recommendPipeSize(category, Q, maxV);

  const selectedD = parseFloat(sizeSelect.value);
  const V = velocityFtPerSec(Q, selectedD);
  const risky = V > maxV;

  let html =
    tile(formatNumber(requiredD) + " in", "Minimum inside diameter needed") +
    tile(recommended ? recommended.nominal + '" nominal' : "none large enough", "Recommended size (" + PIPE_SIZE_CATALOG[category].label + ")", true) +
    tile(formatNumber(selectedD) + " in", "Selected inside diameter") +
    tile(formatNumber(V) + " ft/s" + (risky ? " ⚠" : ""), "Resulting mean velocity", true);
  sizingStats.innerHTML = html;

  const svg = document.getElementById("velocity-chart");
  svg.innerHTML = buildVelocityChartSVG({
    width: 640, height: 440,
    qMax: 1500, vMax: 12,
    maxVelocity: maxV,
    referenceDiameters: allCatalogDiameters(),
    selectedDiameter: selectedD,
    pointQ: Q, pointV: V,
  });

  calcPressure();
}

function calcPressure() {
  const Q = parseFloat(qInput.value);
  const d = parseFloat(sizeSelect.value);
  const material = pipeMaterialByKey(materialSelect.value);
  const L = parseFloat(lengthInput.value);
  const P1 = parseFloat(p1Input.value);
  const elev = parseFloat(elevationInput.value);
  const minorLoss = parseFloat(minorLossInput.value) || 0;
  const rising = document.getElementById("elev-rise").checked;

  if ([Q, d, L, P1, elev].some(isNaN) || !material) {
    pressureStats.innerHTML = tile("—", "Enter values above");
    return;
  }

  const pfPer100 = hazenWilliamsPf_psiPer100ft(Q, material.C, d, 1);
  const Pf = pfPer100 * (L / 100);
  const elevTerm = rising ? -0.433 * elev : 0.433 * elev;
  const P2 = P1 - Pf - minorLoss + elevTerm;

  pressureStats.innerHTML =
    tile(formatNumber(pfPer100) + " psi/100 ft", "Friction loss per 100 ft") +
    tile(formatNumber(Pf) + " psi", "Total friction loss (Pf)") +
    tile(formatNumber(minorLoss) + " psi", "Minor losses (Pm)") +
    tile(formatNumber(P2) + " psi", "Outlet pressure (P2)", true);

  document.getElementById("profile-diagram").innerHTML = buildPipeProfileSVG({
    width: 560, height: 220, P1, P2, elevMag: elev, rising,
  });
}

categorySelect.addEventListener("change", () => {
  materialSelect.value = CATEGORY_TO_MATERIAL_KEY[categorySelect.value];
  updateRecommendationAndOptions();
});
sizeSelect.addEventListener("change", calcSizing);
[materialSelect, lengthInput, p1Input, elevationInput, minorLossInput].forEach((el) => el.addEventListener("input", calcPressure));
materialSelect.addEventListener("change", calcPressure);
document.querySelectorAll('input[name="elevation-dir"]').forEach((r) => r.addEventListener("change", calcPressure));

bindSliderNumber(qInput, qNumber, updateRecommendationAndOptions);
bindSliderNumber(maxvInput, maxvNumber, updateRecommendationAndOptions);

updateRecommendationAndOptions();
