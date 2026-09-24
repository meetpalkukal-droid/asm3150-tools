// Depth - Volume - Area calculator (Textbook Eq. 3.1 / 3.2: d = V/A, V = A*d)
// Generic solver: given any two of {depth, volume, area}, solves for the third.
// Volume base unit is liters (L); this file converts L <-> m3 with the
// constant 1000 so it can combine with the shared length (m) and area (m2)
// base units from assets/js/units.js.

const solveForRadios = document.querySelectorAll('input[name="solve-for"]');
const fieldVolume = document.getElementById("field-volume");
const fieldArea = document.getElementById("field-area");
const fieldDepth = document.getElementById("field-depth");

const volumeValue = document.getElementById("volume-value");
const volumeUnit = document.getElementById("volume-unit");
const areaValue = document.getElementById("area-value");
const areaUnit = document.getElementById("area-unit");
const depthValue = document.getElementById("depth-value");
const depthUnit = document.getElementById("depth-unit");

const totalizerToggle = document.getElementById("totalizer-toggle");
const volumeSimple = document.getElementById("volume-simple");
const volumeTotalizer = document.getElementById("volume-totalizer");
const totalizerBefore = document.getElementById("totalizer-before");
const totalizerAfter = document.getElementById("totalizer-after");

const outputUnit = document.getElementById("output-unit");
const resultValue = document.getElementById("result-value");
const resultLabel = document.getElementById("result-label");
const formulaDisplay = document.getElementById("formula-display");

populateUnitSelect(volumeUnit, "volume", "ac-in");
populateUnitSelect(areaUnit, "area", "ac");
populateUnitSelect(depthUnit, "length", "in");

const FORMULAS = {
  depth: "d = \\dfrac{V}{A}",
  volume: "V = A \\times d",
  area: "A = \\dfrac{V}{d}",
};

const OUTPUT_CATEGORY = { depth: "length", volume: "volume", area: "area" };
const DEFAULT_OUTPUT_UNIT = { depth: "in", volume: "ac-in", area: "ac" };
const lastOutputUnit = { ...DEFAULT_OUTPUT_UNIT };

function currentTarget() {
  return document.querySelector('input[name="solve-for"]:checked').value;
}

function updateVisibility() {
  const target = currentTarget();

  fieldVolume.classList.toggle("field--hidden", target === "volume");
  fieldArea.classList.toggle("field--hidden", target === "area");
  fieldDepth.classList.toggle("field--hidden", target === "depth");

  formulaDisplay.setAttribute("data-latex", FORMULAS[target]);
  renderMathFormulas();

  populateUnitSelect(outputUnit, OUTPUT_CATEGORY[target], lastOutputUnit[target]);
}

function getVolumeInBase() {
  const unit = volumeUnit.value;
  if (totalizerToggle.checked) {
    const before = parseFloat(totalizerBefore.value);
    const after = parseFloat(totalizerAfter.value);
    if (isNaN(before) || isNaN(after)) return null;
    return toBaseValue("volume", unit, after - before);
  }
  const raw = parseFloat(volumeValue.value);
  if (isNaN(raw)) return null;
  return toBaseValue("volume", unit, raw);
}

function calculate() {
  const target = currentTarget();
  lastOutputUnit[target] = outputUnit.value;

  const area_m2 = target === "area" ? null : toBaseValue("area", areaUnit.value, parseFloat(areaValue.value));
  const depth_m = target === "depth" ? null : toBaseValue("length", depthUnit.value, parseFloat(depthValue.value));
  const volume_L = target === "volume" ? null : getVolumeInBase();

  let outputValue = null;

  if (target === "depth") {
    if (volume_L === null || isNaN(area_m2) || area_m2 === 0) { showEmpty(); return; }
    const volume_m3 = volume_L / 1000;
    const d_m = volume_m3 / area_m2;
    outputValue = fromBaseValue("length", outputUnit.value, d_m);
  } else if (target === "volume") {
    if (isNaN(area_m2) || isNaN(depth_m)) { showEmpty(); return; }
    const volume_m3 = area_m2 * depth_m;
    const volume_L_calc = volume_m3 * 1000;
    outputValue = fromBaseValue("volume", outputUnit.value, volume_L_calc);
  } else if (target === "area") {
    if (volume_L === null || isNaN(depth_m) || depth_m === 0) { showEmpty(); return; }
    const volume_m3 = volume_L / 1000;
    const a_m2 = volume_m3 / depth_m;
    outputValue = fromBaseValue("area", outputUnit.value, a_m2);
  }

  if (outputValue === null || isNaN(outputValue) || !isFinite(outputValue)) {
    showEmpty();
    return;
  }

  resultValue.textContent = formatNumber(outputValue);
  resultLabel.textContent = UNIT_CATEGORIES[OUTPUT_CATEGORY[target]].units[outputUnit.value].label;
}

function showEmpty() {
  resultValue.textContent = "—";
  resultLabel.textContent = "Enter values above";
}

function toggleTotalizer() {
  const on = totalizerToggle.checked;
  volumeSimple.classList.toggle("field--hidden", on);
  volumeTotalizer.classList.toggle("field--hidden", !on);
  calculate();
}

solveForRadios.forEach((r) => r.addEventListener("change", () => { updateVisibility(); calculate(); }));
[volumeValue, areaValue, depthValue, totalizerBefore, totalizerAfter].forEach((el) =>
  el.addEventListener("input", calculate)
);
[volumeUnit, areaUnit, depthUnit, outputUnit].forEach((el) => el.addEventListener("change", calculate));
totalizerToggle.addEventListener("change", toggleTotalizer);

document.getElementById("load-example").addEventListener("click", () => {
  document.getElementById("solve-depth").checked = true;
  updateVisibility();

  totalizerToggle.checked = true;
  toggleTotalizer();

  volumeUnit.value = "gal";
  totalizerBefore.value = 8925100;
  totalizerAfter.value = 12590900;

  areaUnit.value = "ac";
  areaValue.value = 90;

  outputUnit.value = "in";

  calculate();
});

updateVisibility();
calculate();
