// Pipe Velocity & Water Hammer Check (Chapter 8, Figure 8.3 equivalent).
// Velocity and velocity head are computed directly from physics (Eq. 8.1,
// 8.5), not digitized from the book's nomograph - see hydraulics-data.js.

const qInput = document.getElementById("q-input");
const qNumber = document.getElementById("q-number");
const standardSizeToggle = document.getElementById("standard-size-toggle");
const fieldStandardSize = document.getElementById("field-standard-size");
const fieldCustomDiameter = document.getElementById("field-custom-diameter");
const categorySelect = document.getElementById("category-select");
const sizeSelect = document.getElementById("size-select");
const diameterInput = document.getElementById("diameter-input");
const diameterNumber = document.getElementById("diameter-number");
const maxvInput = document.getElementById("maxv-input");
const maxvNumber = document.getElementById("maxv-number");
const resultStats = document.getElementById("result-stats");

function tile(value, label, primary) {
  return '<div class="stat-tile' + (primary ? " stat-tile--primary" : "") + '">' +
    '<div class="stat-tile__value">' + value + "</div>" +
    '<div class="stat-tile__label">' + label + "</div></div>";
}

populatePipeCategorySelect(categorySelect);
categorySelect.value = "aluminum-sprinkler";
populatePipeSizeSelect(sizeSelect, categorySelect.value);
sizeSelect.value = "3.900";

function updateDiameterModeVisibility() {
  fieldStandardSize.classList.toggle("field--hidden", !standardSizeToggle.checked);
  fieldCustomDiameter.classList.toggle("field--hidden", standardSizeToggle.checked);
}

function currentDiameter() {
  return standardSizeToggle.checked ? parseFloat(sizeSelect.value) : parseFloat(diameterInput.value);
}

function calculate() {
  const Q = parseFloat(qInput.value);
  const d = currentDiameter();
  const maxV = parseFloat(maxvInput.value);

  if (isNaN(Q) || isNaN(d) || d <= 0) {
    resultStats.innerHTML = tile("—", "Enter values above");
    return;
  }

  const V = velocityFtPerSec(Q, d);
  const hv = velocityHeadFt(V);
  const risky = V > maxV;

  resultStats.innerHTML =
    tile(formatNumber(V) + " ft/s", "Mean velocity (Vm)", true) +
    tile(formatNumber(hv) + " ft", "Velocity head (hv)") +
    tile(risky ? "Water hammer risk" : "Within safe range", risky ? "Exceeds " + maxV.toFixed(1) + " ft/s threshold" : "At or below " + maxV.toFixed(1) + " ft/s threshold", true);

  const svg = document.getElementById("velocity-chart");
  svg.innerHTML = buildVelocityChartSVG({
    width: 640, height: 440,
    qMax: 1500, vMax: 12,
    maxVelocity: maxV,
    referenceDiameters: allCatalogDiameters(),
    selectedDiameter: d,
    pointQ: Q, pointV: V,
  });
}

standardSizeToggle.addEventListener("change", () => { updateDiameterModeVisibility(); calculate(); });
categorySelect.addEventListener("change", () => { populatePipeSizeSelect(sizeSelect, categorySelect.value); calculate(); });
sizeSelect.addEventListener("change", calculate);

bindSliderNumber(qInput, qNumber, calculate);
bindSliderNumber(diameterInput, diameterNumber, calculate);
bindSliderNumber(maxvInput, maxvNumber, calculate);

updateDiameterModeVisibility();
calculate();
