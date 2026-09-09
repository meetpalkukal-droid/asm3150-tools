// Soil Water Depletion & Irrigation Scheduling calculator (Textbook Eq. 2.8-2.14)
// AWC = fc - wp; fd = (fc - v)/AWC; fr = 1 - fd; SWD = (fc - v) * L; TAW = AWC * L.

const textureAutofill = document.getElementById("texture-autofill");
const fcInput = document.getElementById("fc-input");
const wpInput = document.getElementById("wp-input");
const currentThetaV = document.getElementById("current-theta-v");
const rootDepth = document.getElementById("root-depth");
const rootDepthUnit = document.getElementById("root-depth-unit");
const statsGrid = document.getElementById("stats-grid");

populateSoilTextureSelect(textureAutofill, true);
populateUnitSelect(rootDepthUnit, "length", "in");

textureAutofill.addEventListener("change", () => {
  const t = soilTextureByKey(textureAutofill.value);
  if (t) {
    fcInput.value = (t.fc * 100).toFixed(0);
    wpInput.value = (t.wp * 100).toFixed(0);
    calculate();
  }
});

// Prefill from a soil-texture-lookup.html "Use these values" link, e.g.
// ?fc=0.3&wp=0.12 (ratios, not percentages).
(function prefillFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const fc = parseFloat(params.get("fc"));
  const wp = parseFloat(params.get("wp"));
  if (!isNaN(fc)) fcInput.value = (fc * 100).toFixed(0);
  if (!isNaN(wp)) wpInput.value = (wp * 100).toFixed(0);
})();

function tile(value, label) {
  return '<div class="stat-tile"><div class="stat-tile__value">' + value +
    '</div><div class="stat-tile__label">' + label + '</div></div>';
}

function calculate() {
  const fc = parseFloat(fcInput.value) / 100;
  const wp = parseFloat(wpInput.value) / 100;
  const v = parseFloat(currentThetaV.value) / 100;
  const L = parseFloat(rootDepth.value);
  const unitAbbr = UNIT_CATEGORIES.length.units[rootDepthUnit.value].label.replace(/^.*\((.*)\)$/, "$1");

  const AWC = fc - wp;

  if (isNaN(fc) || isNaN(wp) || isNaN(v) || isNaN(L) || AWC === 0) {
    statsGrid.innerHTML = tile("—", "Enter values above");
    return;
  }

  const fd = (fc - v) / AWC;
  const fr = 1 - fd;
  const SWD = (fc - v) * L;
  const TAW = AWC * L;

  statsGrid.innerHTML =
    tile(formatNumber(AWC), "AWC (per unit depth)") +
    tile(formatNumber(fd * 100) + "%", "Fraction depleted (f<sub>d</sub>)") +
    tile(formatNumber(fr * 100) + "%", "Fraction remaining (f<sub>r</sub>)") +
    tile(formatNumber(SWD) + " " + unitAbbr, "Soil water deficit (SWD) &mdash; depth to irrigate now") +
    tile(formatNumber(TAW) + " " + unitAbbr, "Total available water (TAW) in root zone");
}

[fcInput, wpInput, currentThetaV, rootDepth].forEach((el) => el.addEventListener("input", calculate));
rootDepthUnit.addEventListener("change", calculate);

document.getElementById("load-example").addEventListener("click", () => {
  textureAutofill.value = "";
  fcInput.value = 34;
  wpInput.value = 16;
  currentThetaV.value = 26;
  rootDepthUnit.value = "in";
  rootDepth.value = 36;
  calculate();
});

calculate();
