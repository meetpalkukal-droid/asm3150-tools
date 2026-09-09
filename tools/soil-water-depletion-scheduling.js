// Soil Water Depletion & Irrigation Scheduling calculator (Textbook Eq. 2.8-2.14)
// AWC = fc - wp; fd = (fc - v)/AWC; fr = 1 - fd; SWD = (fc - v) * L; TAW = AWC * L.
// "Irrigation trigger" mode inverts fd's formula to solve for the water
// content at a target management allowed depletion (MAD).

const textureAutofill = document.getElementById("texture-autofill");
const fcInput = document.getElementById("fc-input");
const wpInput = document.getElementById("wp-input");
const fieldCurrentThetaV = document.getElementById("field-current-theta-v");
const currentThetaV = document.getElementById("current-theta-v");
const fieldTargetFd = document.getElementById("field-target-fd");
const targetFd = document.getElementById("target-fd");
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

function currentTarget() {
  return document.querySelector('input[name="solve-for"]:checked').value;
}

function updateVisibility() {
  const target = currentTarget();
  fieldCurrentThetaV.classList.toggle("field--hidden", target !== "status");
  fieldTargetFd.classList.toggle("field--hidden", target !== "trigger");
}

function tile(value, label) {
  return '<div class="stat-tile"><div class="stat-tile__value">' + value +
    '</div><div class="stat-tile__label">' + label + '</div></div>';
}

function calculate() {
  const target = currentTarget();
  const fc = parseFloat(fcInput.value) / 100;
  const wp = parseFloat(wpInput.value) / 100;
  const L = parseFloat(rootDepth.value);
  const unitAbbr = UNIT_CATEGORIES.length.units[rootDepthUnit.value].label.replace(/^.*\((.*)\)$/, "$1");

  if (isNaN(fc) || isNaN(wp) || isNaN(L)) {
    statsGrid.innerHTML = tile("—", "Enter values above");
    return;
  }

  const AWC = fc - wp;

  if (target === "status") {
    const v = parseFloat(currentThetaV.value) / 100;
    if (isNaN(v) || AWC === 0) { statsGrid.innerHTML = tile("—", "Enter values above"); return; }
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
  } else {
    const mad = parseFloat(targetFd.value) / 100;
    if (isNaN(mad) || AWC === 0) { statsGrid.innerHTML = tile("—", "Enter values above"); return; }
    const vTrigger = fc - mad * AWC;
    const SWDTrigger = mad * AWC * L;
    const TAW = AWC * L;
    statsGrid.innerHTML =
      tile(formatNumber(AWC), "AWC (per unit depth)") +
      tile(formatNumber(vTrigger * 100) + "%", "Trigger water content (&theta;<sub>v</sub>)") +
      tile(formatNumber(SWDTrigger) + " " + unitAbbr, "Depth to apply at trigger point") +
      tile(formatNumber(TAW) + " " + unitAbbr, "Total available water (TAW) in root zone");
  }
}

document.querySelectorAll('input[name="solve-for"]').forEach((r) =>
  r.addEventListener("change", () => { updateVisibility(); calculate(); })
);
[fcInput, wpInput, currentThetaV, targetFd, rootDepth].forEach((el) => el.addEventListener("input", calculate));
rootDepthUnit.addEventListener("change", calculate);

document.getElementById("load-example").addEventListener("click", () => {
  document.getElementById("solve-status").checked = true;
  updateVisibility();
  textureAutofill.value = "";
  fcInput.value = 34;
  wpInput.value = 16;
  currentThetaV.value = 26;
  rootDepthUnit.value = "in";
  rootDepth.value = 36;
  calculate();
});

updateVisibility();
calculate();
