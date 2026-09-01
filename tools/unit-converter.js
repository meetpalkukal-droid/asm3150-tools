// Unit conversion tool for ASM 3150/5150
// Unit data and conversion helpers live in assets/js/units.js (shared
// across all tools on this site) — this file just wires up the UI.

const categorySelect = document.getElementById("category");
const fromSelect = document.getElementById("from-unit");
const toSelect = document.getElementById("to-unit");
const inputValue = document.getElementById("input-value");
const swapBtn = document.getElementById("swap-btn");
const resultValue = document.getElementById("result-value");
const resultLabel = document.getElementById("result-label");
const resultFactor = document.getElementById("result-factor");

function populateUnitSelects() {
  const cat = UNIT_CATEGORIES[categorySelect.value];
  const unitKeys = Object.keys(cat.units);

  populateUnitSelect(fromSelect, categorySelect.value);
  populateUnitSelect(toSelect, categorySelect.value);

  fromSelect.selectedIndex = 0;
  toSelect.selectedIndex = unitKeys.length > 1 ? 1 : 0;
}

function convert() {
  const cat = UNIT_CATEGORIES[categorySelect.value];
  const fromUnit = cat.units[fromSelect.value];
  const toUnit = cat.units[toSelect.value];
  const raw = parseFloat(inputValue.value);

  if (isNaN(raw) || !fromUnit || !toUnit) {
    resultValue.textContent = "—";
    resultLabel.textContent = "Enter a value above";
    resultFactor.textContent = "";
    return;
  }

  const converted = convertValue(categorySelect.value, fromSelect.value, toSelect.value, raw);
  const perUnitFactor = convertValue(categorySelect.value, fromSelect.value, toSelect.value, 1);

  resultValue.textContent = formatNumber(converted);
  resultLabel.textContent = toUnit.label;
  resultFactor.textContent =
    `1 ${fromUnit.label.replace(/^.*\((.*)\)$/, "$1")} = ` +
    `${formatNumber(perUnitFactor)} ${toUnit.label.replace(/^.*\((.*)\)$/, "$1")}` +
    ` (via ${cat.baseLabel})`;
}

function swapUnits() {
  const fromIndex = fromSelect.selectedIndex;
  const toIndex = toSelect.selectedIndex;
  fromSelect.selectedIndex = toIndex;
  toSelect.selectedIndex = fromIndex;
  convert();
}

categorySelect.addEventListener("change", () => {
  populateUnitSelects();
  convert();
});
fromSelect.addEventListener("change", convert);
toSelect.addEventListener("change", convert);
inputValue.addEventListener("input", convert);
swapBtn.addEventListener("click", swapUnits);

populateUnitSelects();
inputValue.value = 1;
convert();

// ---------------- Water weight equivalence (gal <-> lb, L <-> kg) ----------------
const wwInput = document.getElementById("ww-input");
const wwDirection = document.getElementById("ww-direction");
const wwResult = document.getElementById("ww-result");

const WATER = {
  "gal-to-lb": { factor: 8.33, from: "gal", to: "lb" },
  "lb-to-gal": { factor: 1 / 8.33, from: "lb", to: "gal" },
  "L-to-kg":   { factor: 1, from: "L", to: "kg" },
  "kg-to-L":   { factor: 1, from: "kg", to: "L" },
};

function convertWater() {
  const raw = parseFloat(wwInput.value);
  const def = WATER[wwDirection.value];
  if (isNaN(raw) || !def) {
    wwResult.textContent = "—";
    return;
  }
  const out = raw * def.factor;
  wwResult.textContent = `${formatNumber(raw)} ${def.from} = ${formatNumber(out)} ${def.to}`;
}

if (wwInput && wwDirection) {
  wwInput.addEventListener("input", convertWater);
  wwDirection.addEventListener("change", convertWater);
  wwInput.value = 1;
  convertWater();
}
