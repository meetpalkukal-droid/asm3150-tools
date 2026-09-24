// Pipe Flow (Continuity) calculator (Textbook Eq. 3.6: Q = Vm * Af, Af = (pi/4)*D^2)
// Generic solver: given any two of {flow rate, velocity, diameter}, solves
// for the third, assuming a full, circular pipe.

const diameterValue = document.getElementById("diameter-value");
const diameterUnit = document.getElementById("diameter-unit");
const velocityValue = document.getElementById("velocity-value");
const velocityUnit = document.getElementById("velocity-unit");
const flowValue = document.getElementById("flow-value");
const flowUnit = document.getElementById("flow-unit");

const fieldDiameter = document.getElementById("field-diameter");
const fieldVelocity = document.getElementById("field-velocity");
const fieldFlow = document.getElementById("field-flow");

const outputUnit = document.getElementById("output-unit");
const resultValue = document.getElementById("result-value");
const resultLabel = document.getElementById("result-label");
const formulaDisplay = document.getElementById("formula-display");

populateUnitSelect(diameterUnit, "length", "in");
populateUnitSelect(velocityUnit, "velocity", "ft/s");
populateUnitSelect(flowUnit, "flow", "gpm");

const FIELDS = { diameter: fieldDiameter, velocity: fieldVelocity, flow: fieldFlow };
const FORMULAS = {
  flow: "Q = V_m \\times \\dfrac{\\pi}{4} \\times D^2",
  velocity: "V_m = \\dfrac{Q}{\\frac{\\pi}{4}D^2}",
  diameter: "D = \\sqrt{\\dfrac{4Q}{\\pi V_m}}",
};
const OUTPUT_CATEGORY = { flow: "flow", velocity: "velocity", diameter: "length" };
const DEFAULT_OUTPUT_UNIT = { flow: "gpm", velocity: "ft/s", diameter: "in" };
const lastOutputUnit = { ...DEFAULT_OUTPUT_UNIT };

function currentTarget() {
  return document.querySelector('input[name="solve-for"]:checked').value;
}

function updateVisibility() {
  const target = currentTarget();
  Object.keys(FIELDS).forEach((key) => FIELDS[key].classList.toggle("field--hidden", key === target));
  formulaDisplay.setAttribute("data-latex", FORMULAS[target]);
  renderMathFormulas();
  populateUnitSelect(outputUnit, OUTPUT_CATEGORY[target], lastOutputUnit[target]);
}

function showEmpty() {
  resultValue.textContent = "—";
  resultLabel.textContent = "Enter values above";
}

function calculate() {
  const target = currentTarget();
  lastOutputUnit[target] = outputUnit.value;

  const D_m = target === "diameter" ? null : toBaseValue("length", diameterUnit.value, parseFloat(diameterValue.value));
  const Vm_ms = target === "velocity" ? null : toBaseValue("velocity", velocityUnit.value, parseFloat(velocityValue.value));
  const Q_Ls = target === "flow" ? null : toBaseValue("flow", flowUnit.value, parseFloat(flowValue.value));

  let outputValue = null;

  if (target === "flow") {
    if (isNaN(D_m) || isNaN(Vm_ms)) return showEmpty();
    const Af_m2 = (Math.PI / 4) * D_m * D_m;
    const Q_m3s = Vm_ms * Af_m2;
    outputValue = fromBaseValue("flow", outputUnit.value, Q_m3s * 1000);
  } else if (target === "velocity") {
    if (isNaN(D_m) || isNaN(Q_Ls) || D_m === 0) return showEmpty();
    const Af_m2 = (Math.PI / 4) * D_m * D_m;
    const Q_m3s = Q_Ls / 1000;
    const Vm = Q_m3s / Af_m2;
    outputValue = fromBaseValue("velocity", outputUnit.value, Vm);
  } else if (target === "diameter") {
    if (isNaN(Vm_ms) || isNaN(Q_Ls) || Vm_ms === 0) return showEmpty();
    const Q_m3s = Q_Ls / 1000;
    const Af_m2 = Q_m3s / Vm_ms;
    const D = Math.sqrt((Af_m2 * 4) / Math.PI);
    outputValue = fromBaseValue("length", outputUnit.value, D);
  }

  if (outputValue === null || isNaN(outputValue) || !isFinite(outputValue)) return showEmpty();

  resultValue.textContent = formatNumber(outputValue);
  resultLabel.textContent = UNIT_CATEGORIES[OUTPUT_CATEGORY[target]].units[outputUnit.value].label;
}

document.querySelectorAll('input[name="solve-for"]').forEach((r) =>
  r.addEventListener("change", () => { updateVisibility(); calculate(); })
);
[diameterValue, velocityValue, flowValue].forEach((el) => el.addEventListener("input", calculate));
[diameterUnit, velocityUnit, flowUnit, outputUnit].forEach((el) => el.addEventListener("change", calculate));

document.getElementById("load-example").addEventListener("click", () => {
  document.getElementById("solve-flow").checked = true;
  updateVisibility();

  diameterUnit.value = "in";
  diameterValue.value = 8;

  velocityUnit.value = "ft/s";
  velocityValue.value = 5;

  outputUnit.value = "gpm";

  calculate();
});

updateVisibility();
calculate();
