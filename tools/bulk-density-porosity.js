// Soil Bulk Density & Porosity calculator (Textbook Eq. 2.1 / 2.2)
// rho_b = Ms / Vb (generic solver for any of the three), then
// phi = (1 - rho_b/rho_p) * 100% computed from whichever rho_b results.

const massValue = document.getElementById("mass-value");
const massUnit = document.getElementById("mass-unit");
const volumeValue = document.getElementById("volume-value");
const volumeUnit = document.getElementById("volume-unit");
const densityValue = document.getElementById("density-value");

const fieldMass = document.getElementById("field-mass");
const fieldVolume = document.getElementById("field-volume");
const fieldDensity = document.getElementById("field-density");

const outputUnit = document.getElementById("output-unit");
const resultValue = document.getElementById("result-value");
const resultLabel = document.getElementById("result-label");
const formulaDisplay = document.getElementById("formula-display");

const particleDensity = document.getElementById("particle-density");
const porosityValue = document.getElementById("porosity-value");
const solidsValue = document.getElementById("solids-value");

populateUnitSelect(massUnit, "mass", "g");

const FIELDS = { density: fieldDensity, mass: fieldMass, volume: fieldVolume };
const FORMULAS = {
  density: "\\rho_b = \\dfrac{M_s}{V_b}",
  mass: "M_s = \\rho_b \\times V_b",
  volume: "V_b = \\dfrac{M_s}{\\rho_b}",
};

const DENSITY_UNITS = { "g/cm3": { label: "g/cm³", factor: 1 }, "kg/m3": { label: "kg/m³", factor: 1000 } };
const VOLUME_UNITS = { cm3: "Cubic centimeters (cm³)", m3: "Cubic meters (m³)" };

function currentTarget() {
  return document.querySelector('input[name="solve-for"]:checked').value;
}

function volumeToCm3(value, unit) {
  return unit === "m3" ? value * 1e6 : value;
}
function cm3ToVolumeUnit(valueCm3, unit) {
  return unit === "m3" ? valueCm3 / 1e6 : valueCm3;
}

function populateOutputUnit(target) {
  outputUnit.innerHTML = "";
  if (target === "density") {
    Object.keys(DENSITY_UNITS).forEach((key) => {
      const opt = document.createElement("option");
      opt.value = key;
      opt.textContent = DENSITY_UNITS[key].label;
      outputUnit.appendChild(opt);
    });
  } else if (target === "mass") {
    populateUnitSelect(outputUnit, "mass", "g");
  } else if (target === "volume") {
    Object.keys(VOLUME_UNITS).forEach((key) => {
      const opt = document.createElement("option");
      opt.value = key;
      opt.textContent = VOLUME_UNITS[key];
      outputUnit.appendChild(opt);
    });
  }
}

function updateVisibility() {
  const target = currentTarget();
  Object.keys(FIELDS).forEach((key) => FIELDS[key].classList.toggle("field--hidden", key === target));
  formulaDisplay.setAttribute("data-latex", FORMULAS[target]);
  renderMathFormulas();
  populateOutputUnit(target);
}

function showEmpty() {
  resultValue.textContent = "—";
  resultLabel.textContent = "Enter values above";
}

// Returns the bulk density (g/cm3) currently in effect, whether it's a
// direct input (target = mass or volume) or the computed result (target =
// density). Returns null if the inputs needed to know it aren't valid yet.
function currentBulkDensityGcm3() {
  const target = currentTarget();
  if (target === "density") {
    const Ms_g = toBaseValue("mass", massUnit.value, parseFloat(massValue.value));
    const Vb_cm3 = volumeToCm3(parseFloat(volumeValue.value), volumeUnit.value);
    if (isNaN(Ms_g) || isNaN(Vb_cm3) || Vb_cm3 === 0) return null;
    return Ms_g / Vb_cm3;
  }
  const rho = parseFloat(densityValue.value);
  return isNaN(rho) ? null : rho;
}

function calculate() {
  const target = currentTarget();
  let outputValue = null;

  if (target === "density") {
    const rho = currentBulkDensityGcm3();
    if (rho === null) { showEmpty(); } else {
      const unitDef = DENSITY_UNITS[outputUnit.value];
      outputValue = rho * unitDef.factor;
      resultValue.textContent = formatNumber(outputValue);
      resultLabel.textContent = unitDef.label;
    }
  } else if (target === "mass") {
    const rho = parseFloat(densityValue.value);
    const Vb_cm3 = volumeToCm3(parseFloat(volumeValue.value), volumeUnit.value);
    if (isNaN(rho) || isNaN(Vb_cm3)) { showEmpty(); } else {
      const Ms_g = rho * Vb_cm3;
      outputValue = fromBaseValue("mass", outputUnit.value, Ms_g);
      resultValue.textContent = formatNumber(outputValue);
      resultLabel.textContent = UNIT_CATEGORIES.mass.units[outputUnit.value].label;
    }
  } else if (target === "volume") {
    const rho = parseFloat(densityValue.value);
    const Ms_g = toBaseValue("mass", massUnit.value, parseFloat(massValue.value));
    if (isNaN(rho) || isNaN(Ms_g) || rho === 0) { showEmpty(); } else {
      const Vb_cm3 = Ms_g / rho;
      outputValue = cm3ToVolumeUnit(Vb_cm3, outputUnit.value);
      resultValue.textContent = formatNumber(outputValue);
      resultLabel.textContent = VOLUME_UNITS[outputUnit.value];
    }
  }

  calculatePorosity();
}

function calculatePorosity() {
  const rho_b = currentBulkDensityGcm3();
  const rho_p = parseFloat(particleDensity.value);
  if (rho_b === null || isNaN(rho_p) || rho_p === 0) {
    porosityValue.textContent = "—";
    solidsValue.textContent = "—";
    return;
  }
  const phi = (1 - rho_b / rho_p) * 100;
  porosityValue.textContent = formatNumber(phi) + "%";
  solidsValue.textContent = formatNumber(100 - phi) + "%";
}

document.querySelectorAll('input[name="solve-for"]').forEach((r) =>
  r.addEventListener("change", () => { updateVisibility(); calculate(); })
);
[massValue, volumeValue, densityValue, particleDensity].forEach((el) => el.addEventListener("input", calculate));
[massUnit, volumeUnit, outputUnit].forEach((el) => el.addEventListener("change", calculate));

document.getElementById("load-example").addEventListener("click", () => {
  document.getElementById("solve-density").checked = true;
  updateVisibility();

  massUnit.value = "g";
  massValue.value = 100;
  volumeUnit.value = "cm3";
  volumeValue.value = 80;
  particleDensity.value = 2.65;
  outputUnit.value = "g/cm3";

  calculate();
});

updateVisibility();
calculate();
