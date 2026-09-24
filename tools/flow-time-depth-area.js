// Flow - Time - Depth - Area calculator (Textbook Eq. 3.3 / 3.4: Q*t = A*d)
// Generic solver: given any three of {flow rate, time, area, depth}, solves
// for the fourth. Internally: volume_L = Q(L/s) * t(s); volume_m3 = volume_L
// / 1000; depth_m = volume_m3 / area_m2 — chaining the shared flow (L/s),
// time (s), area (m2), and length (m) base units from assets/js/units.js.

const flowValue = document.getElementById("flow-value");
const flowUnit = document.getElementById("flow-unit");
const timeValue = document.getElementById("time-value");
const timeUnit = document.getElementById("time-unit");
const areaValue = document.getElementById("area-value");
const areaUnit = document.getElementById("area-unit");
const depthValue = document.getElementById("depth-value");
const depthUnit = document.getElementById("depth-unit");

const fieldFlow = document.getElementById("field-flow");
const fieldTime = document.getElementById("field-time");
const fieldArea = document.getElementById("field-area");
const fieldDepth = document.getElementById("field-depth");

const outputUnit = document.getElementById("output-unit");
const resultValue = document.getElementById("result-value");
const resultLabel = document.getElementById("result-label");
const formulaDisplay = document.getElementById("formula-display");

populateUnitSelect(flowUnit, "flow", "gpm");
populateUnitSelect(timeUnit, "time", "hr");
populateUnitSelect(areaUnit, "area", "ac");
populateUnitSelect(depthUnit, "length", "in");

const FIELDS = { flow: fieldFlow, time: fieldTime, area: fieldArea, depth: fieldDepth };
const FORMULAS = {
  depth: "d = \\dfrac{Q \\times t}{A}",
  flow: "Q = \\dfrac{A \\times d}{t}",
  time: "t = \\dfrac{A \\times d}{Q}",
  area: "A = \\dfrac{Q \\times t}{d}",
};
const OUTPUT_CATEGORY = { flow: "flow", time: "time", area: "area", depth: "length" };
const DEFAULT_OUTPUT_UNIT = { flow: "gpm", time: "hr", area: "ac", depth: "in" };
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

  const Q_Ls = target === "flow" ? null : toBaseValue("flow", flowUnit.value, parseFloat(flowValue.value));
  const t_s = target === "time" ? null : toBaseValue("time", timeUnit.value, parseFloat(timeValue.value));
  const A_m2 = target === "area" ? null : toBaseValue("area", areaUnit.value, parseFloat(areaValue.value));
  const d_m = target === "depth" ? null : toBaseValue("length", depthUnit.value, parseFloat(depthValue.value));

  let outputValue = null;

  if (target === "depth") {
    if (isNaN(Q_Ls) || isNaN(t_s) || isNaN(A_m2) || A_m2 === 0) return showEmpty();
    const d = (Q_Ls * t_s) / 1000 / A_m2;
    outputValue = fromBaseValue("length", outputUnit.value, d);
  } else if (target === "flow") {
    if (isNaN(A_m2) || isNaN(d_m) || isNaN(t_s) || t_s === 0) return showEmpty();
    const Q = (A_m2 * d_m * 1000) / t_s;
    outputValue = fromBaseValue("flow", outputUnit.value, Q);
  } else if (target === "time") {
    if (isNaN(A_m2) || isNaN(d_m) || isNaN(Q_Ls) || Q_Ls === 0) return showEmpty();
    const t = (A_m2 * d_m * 1000) / Q_Ls;
    outputValue = fromBaseValue("time", outputUnit.value, t);
  } else if (target === "area") {
    if (isNaN(Q_Ls) || isNaN(t_s) || isNaN(d_m) || d_m === 0) return showEmpty();
    const A = (Q_Ls * t_s) / 1000 / d_m;
    outputValue = fromBaseValue("area", outputUnit.value, A);
  }

  if (outputValue === null || isNaN(outputValue) || !isFinite(outputValue)) return showEmpty();

  resultValue.textContent = formatNumber(outputValue);
  resultLabel.textContent = UNIT_CATEGORIES[OUTPUT_CATEGORY[target]].units[outputUnit.value].label;
}

document.querySelectorAll('input[name="solve-for"]').forEach((r) =>
  r.addEventListener("change", () => { updateVisibility(); calculate(); })
);
[flowValue, timeValue, areaValue, depthValue].forEach((el) => el.addEventListener("input", calculate));
[flowUnit, timeUnit, areaUnit, depthUnit, outputUnit].forEach((el) => el.addEventListener("change", calculate));

document.getElementById("load-example").addEventListener("click", () => {
  document.getElementById("solve-depth").checked = true;
  updateVisibility();

  flowUnit.value = "gpm";
  flowValue.value = 900;

  timeUnit.value = "hr";
  timeValue.value = 24;

  areaUnit.value = "ac";
  areaValue.value = 30;

  outputUnit.value = "in";

  calculate();
});

updateVisibility();
calculate();
