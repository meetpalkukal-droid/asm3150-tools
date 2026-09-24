// Scheduling Coefficient calculator (Textbook Eq. 5.8, 5.13)
// SC = dz / dLQ = 1 / DU ; actual time = ideal time * SC

const duValue = document.getElementById("du-value");
const fieldIdeal = document.getElementById("field-ideal");
const idealTime = document.getElementById("ideal-time");
const idealUnit = document.getElementById("ideal-unit");
const fieldActual = document.getElementById("field-actual");
const actualTime = document.getElementById("actual-time");
const actualUnit = document.getElementById("actual-unit");

const resultValue = document.getElementById("result-value");
const resultLabel = document.getElementById("result-label");
const resultFactor = document.getElementById("result-factor");

populateUnitSelect(idealUnit, "time", "hr");
populateUnitSelect(actualUnit, "time", "hr");

function currentTarget() {
  return document.querySelector('input[name="solve-for"]:checked').value;
}

function updateVisibility() {
  const target = currentTarget();
  fieldIdeal.classList.toggle("field--hidden", target === "ideal");
  fieldActual.classList.toggle("field--hidden", target === "actual");
}

function showEmpty() {
  resultValue.textContent = "—";
  resultLabel.textContent = "Enter values above";
  resultFactor.textContent = "";
}

function calculate() {
  const DU = parseFloat(duValue.value) / 100;
  if (isNaN(DU) || DU <= 0) return showEmpty();
  const SC = 1 / DU;
  const target = currentTarget();

  if (target === "actual") {
    const ideal_s = toBaseValue("time", idealUnit.value, parseFloat(idealTime.value));
    if (isNaN(ideal_s)) return showEmpty();
    const actual_s = ideal_s * SC;
    resultValue.textContent = formatNumber(fromBaseValue("time", idealUnit.value, actual_s));
    resultLabel.textContent = "Actual run time needed (" + UNIT_CATEGORIES.time.units[idealUnit.value].label + ")";
  } else {
    const actual_s = toBaseValue("time", actualUnit.value, parseFloat(actualTime.value));
    if (isNaN(actual_s)) return showEmpty();
    const ideal_s = actual_s / SC;
    resultValue.textContent = formatNumber(fromBaseValue("time", actualUnit.value, ideal_s));
    resultLabel.textContent = "Run time if uniformity were perfect (" + UNIT_CATEGORIES.time.units[actualUnit.value].label + ")";
  }

  resultFactor.textContent = "SC = 1/DU = " + formatNumber(SC) + " (system needs to run " +
    formatNumber((SC - 1) * 100) + "% longer than perfect uniformity would require)";
}

document.querySelectorAll('input[name="solve-for"]').forEach((r) =>
  r.addEventListener("change", () => { updateVisibility(); calculate(); })
);
[duValue, idealTime, actualTime].forEach((el) => el.addEventListener("input", calculate));
[idealUnit, actualUnit].forEach((el) => el.addEventListener("change", calculate));

document.getElementById("load-example").addEventListener("click", () => {
  document.getElementById("solve-ideal").checked = true;
  updateVisibility();
  duValue.value = 80;
  actualUnit.value = "hr";
  actualTime.value = 5;
  calculate();
});

updateVisibility();
calculate();
