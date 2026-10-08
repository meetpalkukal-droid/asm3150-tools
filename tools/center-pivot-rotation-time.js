// Center Pivot Rotation Time & Application Depth calculator.
// Generalizes WSU's "1 Inch Application Time" calculator (irrigation.wsu.edu)
// to any target depth, solvable in either direction:
//   T = 452.6 * A * d * P / (Q * E)
// T: rotation time (hr), A: irrigated area (ac), d: depth applied (in),
// P: fraction of full circle irrigated (decimal), Q: flow rate at pivot (gpm),
// E: application efficiency (decimal). 452.6 = 27,154 gal/ac-in / 60 min/hr.
const CONST_452_6 = 452.6;

const areaInput = document.getElementById("area-input");
const areaNumber = document.getElementById("area-number");
const flowInput = document.getElementById("flow-input");
const flowNumber = document.getElementById("flow-number");
const percentInput = document.getElementById("percent-input");
const percentNumber = document.getElementById("percent-number");
const efficiencyInput = document.getElementById("efficiency-input");
const efficiencyNumber = document.getElementById("efficiency-number");
const depthInput = document.getElementById("depth-input");
const depthNumber = document.getElementById("depth-number");
const timeInput = document.getElementById("time-input");
const timeNumber = document.getElementById("time-number");

const fieldDepth = document.getElementById("field-depth");
const fieldTime = document.getElementById("field-time");

const resultValue = document.getElementById("result-value");
const resultLabel = document.getElementById("result-label");
const formulaDisplay = document.getElementById("formula-display");

const FORMULAS = {
  time: "T = \\dfrac{452.6 \\times A \\times d \\times P}{Q \\times E}",
  depth: "d = \\dfrac{T \\times Q \\times E}{452.6 \\times A \\times P}",
};

// Keeps a range slider and a number box in sync, clamping the number box to
// the slider's min/max, and running `calculate` whenever either changes.
function bindSliderNumber(slider, number) {
  const min = parseFloat(slider.min);
  const max = parseFloat(slider.max);

  slider.addEventListener("input", () => {
    number.value = slider.value;
    calculate();
  });

  number.addEventListener("input", () => {
    if (number.value === "") return;
    const clamped = Math.min(Math.max(parseFloat(number.value), min), max);
    if (!isNaN(clamped)) slider.value = clamped;
    calculate();
  });

  number.addEventListener("blur", () => {
    const clamped = Math.min(Math.max(parseFloat(number.value) || min, min), max);
    number.value = clamped;
    slider.value = clamped;
    calculate();
  });
}

function currentTarget() {
  return document.querySelector('input[name="solve-for"]:checked').value;
}

function updateVisibility() {
  const target = currentTarget();
  fieldDepth.classList.toggle("field--hidden", target === "depth");
  fieldTime.classList.toggle("field--hidden", target === "time");
  formulaDisplay.setAttribute("data-latex", FORMULAS[target]);
  renderMathFormulas();
}

function calculate() {
  const target = currentTarget();

  const A = parseFloat(areaInput.value);
  const Q = parseFloat(flowInput.value);
  const P = parseFloat(percentInput.value) / 100;
  const E = parseFloat(efficiencyInput.value) / 100;

  if (target === "time") {
    const d = parseFloat(depthInput.value);
    const T = (CONST_452_6 * A * d * P) / (Q * E);
    resultValue.textContent = T.toFixed(1) + " hr";
    resultLabel.textContent = "Rotation time to apply " + d.toFixed(2) + " in (" + (T / 24).toFixed(2) + " days)";
  } else {
    const T = parseFloat(timeInput.value);
    const d = (T * Q * E) / (CONST_452_6 * A * P);
    resultValue.textContent = d.toFixed(2) + " in";
    resultLabel.textContent = "Depth applied over " + T + " hr (" + (T / 24).toFixed(2) + " days)";
  }
}

document.querySelectorAll('input[name="solve-for"]').forEach((r) =>
  r.addEventListener("change", () => { updateVisibility(); calculate(); })
);

bindSliderNumber(areaInput, areaNumber);
bindSliderNumber(flowInput, flowNumber);
bindSliderNumber(percentInput, percentNumber);
bindSliderNumber(efficiencyInput, efficiencyNumber);
bindSliderNumber(depthInput, depthNumber);
bindSliderNumber(timeInput, timeNumber);

updateVisibility();
calculate();
