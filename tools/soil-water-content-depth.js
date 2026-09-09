// Soil Water Content & Irrigation Depth calculator (Textbook Eq. 2.3-2.6)
// theta_m = Mw/Ms -> theta_v = theta_m * rho_b/rho_w -> d = theta_v * L,
// then the extra depth needed to raise theta_v to a target value.
// theta_v is dimensionless (cm3/cm3), so Steps 3-4 multiply it directly by
// the layer depth in whatever unit was entered - no base-unit conversion
// needed for that step.

const toggleThetaM = document.getElementById("toggle-theta-m");
const thetaMMeasured = document.getElementById("theta-m-measured");
const thetaMDirect = document.getElementById("theta-m-direct");
const wetMass = document.getElementById("wet-mass");
const wetMassUnit = document.getElementById("wet-mass-unit");
const dryMass1 = document.getElementById("dry-mass-1");
const dryMass1Unit = document.getElementById("dry-mass-1-unit");
const thetaMInput = document.getElementById("theta-m-input");
const thetaMResult = document.getElementById("theta-m-result");

const toggleDensity = document.getElementById("toggle-density");
const densityComputed = document.getElementById("density-computed");
const densityDirect = document.getElementById("density-direct");
const dryMass2 = document.getElementById("dry-mass-2");
const dryMass2Unit = document.getElementById("dry-mass-2-unit");
const bulkVolume = document.getElementById("bulk-volume");
const bulkVolumeUnit = document.getElementById("bulk-volume-unit");
const densityInput = document.getElementById("density-input");
const thetaVResult = document.getElementById("theta-v-result");

const layerDepth = document.getElementById("layer-depth");
const layerDepthUnit = document.getElementById("layer-depth-unit");
const depthResult = document.getElementById("depth-result");
const depthResultLabel = document.getElementById("depth-result-label");

const targetThetaV = document.getElementById("target-theta-v");
const irrigationResult = document.getElementById("irrigation-result");
const irrigationResultLabel = document.getElementById("irrigation-result-label");

populateUnitSelect(wetMassUnit, "mass", "g");
populateUnitSelect(dryMass1Unit, "mass", "g");
populateUnitSelect(dryMass2Unit, "mass", "g");
populateUnitSelect(layerDepthUnit, "length", "in");

function volumeToCm3(value, unit) {
  return unit === "m3" ? value * 1e6 : value;
}

// Returns theta_m as a ratio (not percent), or null if inputs are incomplete.
function getThetaM() {
  if (toggleThetaM.checked) {
    const pct = parseFloat(thetaMInput.value);
    return isNaN(pct) ? null : pct / 100;
  }
  const wet_g = toBaseValue("mass", wetMassUnit.value, parseFloat(wetMass.value));
  const dry_g = toBaseValue("mass", dryMass1Unit.value, parseFloat(dryMass1.value));
  if (isNaN(wet_g) || isNaN(dry_g) || dry_g === 0) return null;
  return (wet_g - dry_g) / dry_g;
}

// Returns bulk density in g/cm3, or null if inputs are incomplete.
function getBulkDensity() {
  if (toggleDensity.checked) {
    const rho = parseFloat(densityInput.value);
    return isNaN(rho) ? null : rho;
  }
  const Ms_g = toBaseValue("mass", dryMass2Unit.value, parseFloat(dryMass2.value));
  const Vb_cm3 = volumeToCm3(parseFloat(bulkVolume.value), bulkVolumeUnit.value);
  if (isNaN(Ms_g) || isNaN(Vb_cm3) || Vb_cm3 === 0) return null;
  return Ms_g / Vb_cm3;
}

// Returns theta_v as a ratio, or null.
function getThetaV() {
  const thetaM = getThetaM();
  const rhoB = getBulkDensity();
  if (thetaM === null || rhoB === null) return null;
  return thetaM * rhoB; // rho_w = 1 g/cm3
}

function calculate() {
  const thetaM = getThetaM();
  thetaMResult.textContent = thetaM === null ? "—" : formatNumber(thetaM);

  const thetaV = getThetaV();
  thetaVResult.textContent = thetaV === null ? "—" : formatNumber(thetaV);

  const L = parseFloat(layerDepth.value);
  const unitLabel = UNIT_CATEGORIES.length.units[layerDepthUnit.value].label;

  if (thetaV === null || isNaN(L)) {
    depthResult.textContent = "—";
    depthResultLabel.textContent = "Current water depth in this layer";
    irrigationResult.textContent = "—";
    irrigationResultLabel.textContent = "Enter values above";
    return;
  }

  const dCurrent = thetaV * L;
  depthResult.textContent = formatNumber(dCurrent) + " " + unitLabel.replace(/^.*\((.*)\)$/, "$1");
  depthResultLabel.textContent = "Current water depth in this " + unitLabel.replace(/^.*\((.*)\)$/, "$1") + " layer (d = θv × L)";

  const targetPct = parseFloat(targetThetaV.value);
  if (isNaN(targetPct)) {
    irrigationResult.textContent = "—";
    irrigationResultLabel.textContent = "Enter a target water content above";
    return;
  }
  const thetaVTarget = targetPct / 100;
  const dTarget = thetaVTarget * L;
  const diff = dTarget - dCurrent;
  const unitAbbr = unitLabel.replace(/^.*\((.*)\)$/, "$1");
  irrigationResult.textContent = formatNumber(diff) + " " + unitAbbr;
  irrigationResultLabel.textContent = diff >= 0
    ? "Depth of water to add to reach the target"
    : "Soil is already above the target (negative = surplus, no irrigation needed)";
}

[toggleThetaM].forEach((el) => el.addEventListener("change", () => {
  thetaMMeasured.classList.toggle("field--hidden", toggleThetaM.checked);
  thetaMDirect.classList.toggle("field--hidden", !toggleThetaM.checked);
  calculate();
}));
[toggleDensity].forEach((el) => el.addEventListener("change", () => {
  densityComputed.classList.toggle("field--hidden", toggleDensity.checked);
  densityDirect.classList.toggle("field--hidden", !toggleDensity.checked);
  calculate();
}));

[wetMass, dryMass1, thetaMInput, dryMass2, bulkVolume, densityInput, layerDepth, targetThetaV].forEach((el) =>
  el.addEventListener("input", calculate)
);
[wetMassUnit, dryMass1Unit, dryMass2Unit, bulkVolumeUnit, layerDepthUnit].forEach((el) =>
  el.addEventListener("change", calculate)
);

document.getElementById("load-example").addEventListener("click", () => {
  toggleThetaM.checked = false;
  thetaMMeasured.classList.remove("field--hidden");
  thetaMDirect.classList.add("field--hidden");

  toggleDensity.checked = false;
  densityComputed.classList.remove("field--hidden");
  densityDirect.classList.add("field--hidden");

  wetMassUnit.value = "g"; wetMass.value = 120;
  dryMass1Unit.value = "g"; dryMass1.value = 100;
  dryMass2Unit.value = "g"; dryMass2.value = 100;
  bulkVolumeUnit.value = "cm3"; bulkVolume.value = 80;
  layerDepthUnit.value = "in"; layerDepth.value = 12;
  targetThetaV.value = 30;

  calculate();
});

calculate();
