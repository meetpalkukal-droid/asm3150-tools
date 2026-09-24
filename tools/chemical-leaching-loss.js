// Chemical Leaching Loss calculator (Textbook Eq. 5.14-5.18, Table 5.1)
// Vdp1 = dz*A*(1-F1) ; Vdp2 = 0.95*A*(dLQ-SWD) if dLQ>SWD else 0
// Vdp = Vdp1+Vdp2 ; dp = Vdp/A ; Cl = 0.226*C*dp  (dp must be in inches)

// Table 5.1: Relationship between CU and F1 for a 90% adequacy of irrigation.
const TABLE_5_1 = [
  [70, 0.46], [71, 0.48], [72, 0.49], [73, 0.51], [74, 0.53],
  [75, 0.55], [76, 0.57], [77, 0.58], [78, 0.60], [79, 0.62],
  [80, 0.64], [81, 0.66], [82, 0.67], [83, 0.69], [84, 0.71],
  [85, 0.73], [86, 0.75], [87, 0.77], [88, 0.78], [89, 0.80],
  [90, 0.82], [92, 0.86], [94, 0.89], [96, 0.93], [98, 0.96],
];

// Piecewise-linear interpolation. Returns {f1, outOfRange} - outOfRange is true
// (and f1 is clamped to the nearest tabulated endpoint) when CU falls outside
// Table 5.1's documented range of 70-98.
function lookupF1(cu) {
  const first = TABLE_5_1[0], last = TABLE_5_1[TABLE_5_1.length - 1];
  if (cu <= first[0]) return { f1: first[1], outOfRange: cu < first[0] };
  if (cu >= last[0]) return { f1: last[1], outOfRange: cu > last[0] };
  for (let i = 0; i < TABLE_5_1.length - 1; i++) {
    const [cu1, f1a] = TABLE_5_1[i];
    const [cu2, f1b] = TABLE_5_1[i + 1];
    if (cu >= cu1 && cu <= cu2) {
      const frac = (cu - cu1) / (cu2 - cu1);
      return { f1: f1a + frac * (f1b - f1a), outOfRange: false };
    }
  }
  return { f1: NaN, outOfRange: true };
}

const dzValue = document.getElementById("dz-value");
const dzUnit = document.getElementById("dz-unit");
const areaValue = document.getElementById("area-value");
const areaUnit = document.getElementById("area-unit");
const cuValue = document.getElementById("cu-value");
const f1Warning = document.getElementById("f1-warning");

const toggleDlq = document.getElementById("toggle-dlq");
const fieldDu = document.getElementById("field-du");
const duValue = document.getElementById("du-value");
const fieldDlqDirect = document.getElementById("field-dlq-direct");
const dlqValue = document.getElementById("dlq-value");
const dlqUnit = document.getElementById("dlq-unit");

const swdValue = document.getElementById("swd-value");
const swdUnit = document.getElementById("swd-unit");
const concValue = document.getElementById("conc-value");

const statsGrid = document.getElementById("stats-grid");

populateUnitSelect(dzUnit, "length", "in");
populateUnitSelect(areaUnit, "area", "ac");
populateUnitSelect(dlqUnit, "length", "in");
populateUnitSelect(swdUnit, "length", "in");

function tile(value, label, primary) {
  return '<div class="stat-tile' + (primary ? " stat-tile--primary" : "") + '"><div class="stat-tile__value">' +
    value + '</div><div class="stat-tile__label">' + label + '</div></div>';
}

toggleDlq.addEventListener("change", () => {
  fieldDu.classList.toggle("field--hidden", toggleDlq.checked);
  fieldDlqDirect.classList.toggle("field--hidden", !toggleDlq.checked);
  calculate();
});

function calculate() {
  f1Warning.innerHTML = "";

  const dz_m = toBaseValue("length", dzUnit.value, parseFloat(dzValue.value));
  const A_m2 = toBaseValue("area", areaUnit.value, parseFloat(areaValue.value));
  const cu = parseFloat(cuValue.value);
  const swd_m = toBaseValue("length", swdUnit.value, parseFloat(swdValue.value));
  const C = parseFloat(concValue.value);

  if (isNaN(dz_m) || isNaN(A_m2) || isNaN(cu) || isNaN(swd_m) || isNaN(C) || A_m2 === 0) {
    statsGrid.innerHTML = tile("—", "Enter values above");
    return;
  }

  const { f1, outOfRange } = lookupF1(cu);
  if (outOfRange) {
    f1Warning.innerHTML = '<div class="warning-box">CU = ' + formatNumber(cu) +
      '% is outside Table 5.1\'s documented range (70-98%). F<sub>1</sub> shown is clamped ' +
      'to the nearest tabulated value (' + f1 + ') and may not be reliable.</div>';
  }

  let dLQ_m;
  if (toggleDlq.checked) {
    dLQ_m = toBaseValue("length", dlqUnit.value, parseFloat(dlqValue.value));
  } else {
    const DU = parseFloat(duValue.value) / 100;
    if (isNaN(DU)) { statsGrid.innerHTML = tile("—", "Enter a DU value above"); return; }
    dLQ_m = DU * dz_m;
  }
  if (isNaN(dLQ_m)) { statsGrid.innerHTML = tile("—", "Enter values above"); return; }

  const Vz_m3 = dz_m * A_m2;
  const Vdp1_m3 = Vz_m3 * (1 - f1);
  const Vdp2_m3 = dLQ_m > swd_m ? 0.95 * A_m2 * (dLQ_m - swd_m) : 0;
  const Vdp_m3 = Vdp1_m3 + Vdp2_m3;
  const dp_m = Vdp_m3 / A_m2;
  const dp_in = fromBaseValue("length", "in", dp_m);
  const Cl = 0.226 * C * dp_in;

  const toAcIn = (m3) => convertValue("volume", "m3", "ac-in", m3);

  statsGrid.innerHTML =
    tile(formatNumber(Cl) + " lb/ac", "Chemical loss (C<sub>l</sub>)", true) +
    tile(formatNumber(dp_in) + " in", "Depth of deep percolation (d<sub>p</sub>)", true) +
    tile(formatNumber(f1), "F<sub>1</sub> (from Table 5.1)") +
    tile(formatNumber(toAcIn(Vdp1_m3)) + " ac-in", "V<sub>dp1</sub> &mdash; from nonuniformity") +
    tile(formatNumber(toAcIn(Vdp2_m3)) + " ac-in", "V<sub>dp2</sub> &mdash; from over-application") +
    tile(formatNumber(toAcIn(Vdp_m3)) + " ac-in", "V<sub>dp</sub> total deep percolation volume");
}

[dzValue, areaValue, cuValue, duValue, dlqValue, swdValue, concValue].forEach((el) => el.addEventListener("input", calculate));
[dzUnit, areaUnit, dlqUnit, swdUnit].forEach((el) => el.addEventListener("change", calculate));

document.getElementById("load-example").addEventListener("click", () => {
  dzUnit.value = "in"; dzValue.value = 2.0;
  areaUnit.value = "ac"; areaValue.value = 1;
  cuValue.value = 84;
  toggleDlq.checked = false;
  fieldDu.classList.remove("field--hidden");
  fieldDlqDirect.classList.add("field--hidden");
  duValue.value = 75;
  swdUnit.value = "in"; swdValue.value = 1.2;
  concValue.value = 20;
  calculate();
});

calculate();
