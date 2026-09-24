// Canal/Ditch Seepage Loss calculator (Textbook Example 5.6, no numbered equation)
// Seepage loss (ac-ft) = wetted_perimeter(ft2/ft) * length(ft) * seepage_rate(ft3/ft2/d)
//                         * days / 43560
// Vegetative loss: convert Q to ac-in/hr, apply %/mile over the ditch length, over
// the season length, converted to ac-ft.

const lengthValue = document.getElementById("length-value");
const lengthUnit = document.getElementById("length-unit");
const wettedValue = document.getElementById("wetted-value");
const seepageRate = document.getElementById("seepage-rate");
const flowValue = document.getElementById("flow-value");
const flowUnit = document.getElementById("flow-unit");
const vegPct = document.getElementById("veg-pct");
const daysValue = document.getElementById("days-value");
const statsGrid = document.getElementById("stats-grid");

populateUnitSelect(lengthUnit, "length", "ft");
populateUnitSelect(flowUnit, "flow", "cfs");

function tile(value, label, primary) {
  return '<div class="stat-tile' + (primary ? " stat-tile--primary" : "") + '"><div class="stat-tile__value">' +
    value + '</div><div class="stat-tile__label">' + label + '</div></div>';
}

function calculate() {
  const length_ft = fromBaseValue("length", "ft", toBaseValue("length", lengthUnit.value, parseFloat(lengthValue.value)));
  const wetted = parseFloat(wettedValue.value); // ft2/ft
  const rate = parseFloat(seepageRate.value); // ft3/ft2/d
  const Q_cfs = convertValue("flow", flowUnit.value, "cfs", parseFloat(flowValue.value));
  const veg = parseFloat(vegPct.value) / 100;
  const days = parseFloat(daysValue.value);

  if ([length_ft, wetted, rate, Q_cfs, veg, days].some((v) => isNaN(v))) {
    statsGrid.innerHTML = tile("—", "Enter values above");
    return;
  }

  // Seepage loss: ft3 -> ac-ft via 43,560 ft2/ac (a ft3 volume divided by ft2 gives ac-ft directly)
  const seepageLoss_acft = (wetted * length_ft * rate * days) / 43560;

  // Vegetative loss: Q(cfs) -> ac-in/hr (precise), scale by length/5280 mi, by days, convert to ac-ft
  const Q_acinhr = convertValue("flow", "cfs", "ac-in/hr", Q_cfs);
  const vegLossRate_acin_per_day = veg * Q_acinhr * (length_ft / 5280) * 24;
  const vegLoss_acft = (vegLossRate_acin_per_day / 12) * days;

  const total_acft = seepageLoss_acft + vegLoss_acft;

  statsGrid.innerHTML =
    tile(formatNumber(total_acft) + " ac-ft", "Total conveyance loss (per season)", true) +
    tile(formatNumber(seepageLoss_acft) + " ac-ft", "Seepage loss") +
    tile(formatNumber(vegLoss_acft) + " ac-ft", "Vegetative loss") +
    tile(formatNumber(Q_acinhr) + " ac-in/hr", "Flow rate (converted)");
}

[lengthValue, wettedValue, seepageRate, flowValue, vegPct, daysValue].forEach((el) => el.addEventListener("input", calculate));
[lengthUnit, flowUnit].forEach((el) => el.addEventListener("change", calculate));

document.getElementById("load-example").addEventListener("click", () => {
  lengthUnit.value = "ft"; lengthValue.value = 1320;
  wettedValue.value = 2.5;
  seepageRate.value = 1.4;
  flowUnit.value = "cfs"; flowValue.value = 2.5;
  vegPct.value = 1;
  daysValue.value = 180;
  calculate();
});

calculate();
