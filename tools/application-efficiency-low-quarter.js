// Application Efficiency of the Low Quarter calculator (Textbook Eq. 5.6, 5.8-5.12)
// dev = dg - dz - dr
// da  = dg                              (no runoff recovery)
//     = dg - dr*Rt = dg*(1 - Rr*Rt)     (closed recovery, Eq. 5.12a)
//     = dg / (1 - Rr*Rt)                (open recovery, Eq. 5.12b), Rr = dr/dg
// dLQ = DU * dz                          (Eq. 5.8)
// de  = min(dLQ, SWD)                    (Eq. 5.9 / 5.10)
// ELQ = 100% * de / da                   (Eq. 5.11)

const recoveryMode = document.getElementById("recovery-mode");
const fieldRt = document.getElementById("field-rt");
const rtValue = document.getElementById("rt-value");

const dgValue = document.getElementById("dg-value");
const dgUnit = document.getElementById("dg-unit");
const drValue = document.getElementById("dr-value");
const drUnit = document.getElementById("dr-unit");
const dzValue = document.getElementById("dz-value");
const dzUnit = document.getElementById("dz-unit");

const toggleDlq = document.getElementById("toggle-dlq");
const fieldDu = document.getElementById("field-du");
const duValue = document.getElementById("du-value");
const fieldDlqDirect = document.getElementById("field-dlq-direct");
const dlqValue = document.getElementById("dlq-value");
const dlqUnit = document.getElementById("dlq-unit");

const swdValue = document.getElementById("swd-value");
const swdUnit = document.getElementById("swd-unit");

const statsGrid = document.getElementById("stats-grid");

[dgUnit, drUnit, dzUnit, dlqUnit, swdUnit].forEach((sel) => populateUnitSelect(sel, "length", "in"));

function tile(value, label, primary) {
  return '<div class="stat-tile' + (primary ? " stat-tile--primary" : "") + '"><div class="stat-tile__value">' +
    value + '</div><div class="stat-tile__label">' + label + '</div></div>';
}

recoveryMode.addEventListener("change", () => {
  fieldRt.classList.toggle("field--hidden", recoveryMode.value === "none");
  calculate();
});
toggleDlq.addEventListener("change", () => {
  fieldDu.classList.toggle("field--hidden", toggleDlq.checked);
  fieldDlqDirect.classList.toggle("field--hidden", !toggleDlq.checked);
  calculate();
});

function calculate() {
  const dg_m = toBaseValue("length", dgUnit.value, parseFloat(dgValue.value));
  const dr_m = toBaseValue("length", drUnit.value, parseFloat(drValue.value));
  const dz_m = toBaseValue("length", dzUnit.value, parseFloat(dzValue.value));
  const swd_m = toBaseValue("length", swdUnit.value, parseFloat(swdValue.value));

  if (isNaN(dg_m) || isNaN(dr_m) || isNaN(dz_m) || isNaN(swd_m)) {
    statsGrid.innerHTML = tile("—", "Enter values above");
    return;
  }

  const dev_m = dg_m - dz_m - dr_m;

  let da_m;
  if (recoveryMode.value === "none") {
    da_m = dg_m;
  } else {
    const Rt = parseFloat(rtValue.value) / 100;
    if (isNaN(Rt)) { statsGrid.innerHTML = tile("—", "Enter a return ratio above"); return; }
    const Rr = dg_m === 0 ? 0 : dr_m / dg_m;
    if (recoveryMode.value === "closed") {
      da_m = dg_m * (1 - Rr * Rt);
    } else {
      const denom = 1 - Rr * Rt;
      if (denom <= 0) { statsGrid.innerHTML = tile("—", "Return ratio too high — da is undefined"); return; }
      da_m = dg_m / denom;
    }
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

  const de_m = Math.min(dLQ_m, swd_m);

  if (da_m === 0) { statsGrid.innerHTML = tile("—", "Applied depth is zero"); return; }
  const ELQ = (de_m / da_m) * 100;

  // Display everything in the dz unit for consistency, since that's usually the
  // "working" unit for a uniformity test.
  const u = dzUnit.value;
  const label = UNIT_CATEGORIES.length.units[u].label.replace(/^.*\((.*)\)$/, "$1");
  const capBy = dLQ_m <= swd_m ? "nonuniformity (d<sub>LQ</sub> &le; SWD)" : "over-application (d<sub>LQ</sub> &gt; SWD)";

  statsGrid.innerHTML =
    tile(formatNumber(ELQ) + "%", "E<sub>LQ</sub> &mdash; application efficiency of the low quarter", true) +
    tile(formatNumber(fromBaseValue("length", u, de_m)) + " " + label, "Effective depth (d<sub>e</sub>) &mdash; capped by " + capBy, true) +
    tile(formatNumber(fromBaseValue("length", u, dLQ_m)) + " " + label, "Low-quarter depth (d<sub>LQ</sub>)") +
    tile(formatNumber(fromBaseValue("length", u, da_m)) + " " + label, "Depth applied from source (d<sub>a</sub>)") +
    tile(formatNumber(fromBaseValue("length", u, dev_m)) + " " + label, "Evaporation + drift (d<sub>ev</sub>)");
}

[dgValue, drValue, rtValue, dzValue, duValue, dlqValue, swdValue].forEach((el) => el.addEventListener("input", calculate));
[dgUnit, drUnit, dzUnit, dlqUnit, swdUnit].forEach((el) => el.addEventListener("change", calculate));

document.getElementById("load-example-52").addEventListener("click", () => {
  recoveryMode.value = "none";
  fieldRt.classList.add("field--hidden");
  dgUnit.value = "in"; dgValue.value = 2.2;
  drUnit.value = "in"; drValue.value = 0;
  dzUnit.value = "in"; dzValue.value = 2.0;
  toggleDlq.checked = false;
  fieldDu.classList.remove("field--hidden");
  fieldDlqDirect.classList.add("field--hidden");
  duValue.value = 75;
  swdUnit.value = "in"; swdValue.value = 1.6;
  calculate();
});

document.getElementById("load-example-53").addEventListener("click", () => {
  recoveryMode.value = "none";
  fieldRt.classList.add("field--hidden");
  dgUnit.value = "in"; dgValue.value = 2.2;
  drUnit.value = "in"; drValue.value = 0;
  dzUnit.value = "in"; dzValue.value = 2.0;
  toggleDlq.checked = false;
  fieldDu.classList.remove("field--hidden");
  fieldDlqDirect.classList.add("field--hidden");
  duValue.value = 75;
  swdUnit.value = "in"; swdValue.value = 1.2;
  calculate();
});

calculate();
