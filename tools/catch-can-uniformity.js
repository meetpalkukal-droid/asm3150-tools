// Catch-Can Uniformity calculator (Textbook Eq. 5.2-5.4, Example 5.1)
//
// DU  = dLQ / dz * 100                                    (low-quarter, unweighted)
// CU  = 100 * (1 - sum(|di-dz|) / (n * dz))                (Christiansen, unweighted)
// CUH = 100 * (1 - sum(Si*|di-dz*|) / sum(Si*di))          (Heermann-Hein, distance-weighted)
//   where dz* = sum(di*Si) / sum(Si)
//
// If every can's distance Si is left blank, Si defaults to 1 for all cans, which
// makes CUH collapse to exactly CU (weighting by a constant changes nothing) -
// appropriate for lateral/solid-set tests where every can represents equal area.
//
// IMPORTANT (verified against the course's own worked spreadsheets): the low-quarter
// count and CU's denominator both use the ACTUAL number of valid cans (n), not a
// fixed constant. A hardcoded "20" (matching Example 5.1's can count) was found to be
// a bug in two independent copies of the class's Excel template - correct only by
// coincidence when n happens to equal 20. This tool always uses the true n.

const volumeMode = document.getElementById("volume-mode");
const throatAreaField = document.getElementById("throat-area-field");
const throatArea = document.getElementById("throat-area");
const catchColHeader = document.getElementById("catch-col-header");
const pasteInput = document.getElementById("paste-input");
const canTableBody = document.getElementById("can-table-body");
const statsGrid = document.getElementById("stats-grid");
const warningContainer = document.getElementById("warning-container");

const ML_TO_IN3 = 0.0610237; // 1 mL = 0.0610237 in3 (exact: 1/16.387064)

let rows = []; // {si: number|null, di: number|null}

function defaultRows() {
  return Array.from({ length: 20 }, () => ({ si: null, di: null }));
}
rows = defaultRows();

function renderTable() {
  canTableBody.innerHTML = "";
  rows.forEach((r, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML =
      '<td>' + (i + 1) + '</td>' +
      '<td><input type="number" step="any" class="row-si" placeholder="(equal area)" value="' + (r.si ?? "") + '"></td>' +
      '<td><input type="number" step="any" class="row-di" value="' + (r.di ?? "") + '"></td>' +
      '<td class="row-remove"><button type="button" title="Remove can">&times;</button></td>';
    tr.querySelector(".row-si").addEventListener("input", (e) => {
      rows[i].si = e.target.value === "" ? null : parseFloat(e.target.value);
      calculate();
    });
    tr.querySelector(".row-di").addEventListener("input", (e) => {
      rows[i].di = e.target.value === "" ? null : parseFloat(e.target.value);
      calculate();
    });
    tr.querySelector(".row-remove button").addEventListener("click", () => {
      if (rows.length <= 1) return;
      rows.splice(i, 1);
      renderTable();
      calculate();
    });
    canTableBody.appendChild(tr);
  });
}

document.getElementById("add-row").addEventListener("click", () => {
  rows.push({ si: null, di: null });
  renderTable();
  calculate();
});

document.getElementById("clear-rows").addEventListener("click", () => {
  rows = defaultRows();
  document.getElementById("row-count-input").value = 20;
  renderTable();
  calculate();
});

document.getElementById("set-row-count").addEventListener("click", () => {
  const target = Math.max(1, Math.round(parseFloat(document.getElementById("row-count-input").value) || rows.length));
  if (target > rows.length) {
    while (rows.length < target) rows.push({ si: null, di: null });
  } else if (target < rows.length) {
    rows = rows.slice(0, target);
  }
  renderTable();
  calculate();
});

volumeMode.addEventListener("change", () => {
  throatAreaField.classList.toggle("field--hidden", !volumeMode.checked);
  catchColHeader.textContent = volumeMode.checked ? "Catch (mL)" : "Catch (in)";
  calculate();
});
throatArea.addEventListener("input", calculate);

document.getElementById("parse-btn").addEventListener("click", () => {
  const lines = pasteInput.value.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  const parsed = [];
  lines.forEach((line) => {
    const parts = line.split(/[,\t ]+/).map((p) => p.trim()).filter((p) => p.length > 0);
    const nums = parts.map(Number).filter((n) => !isNaN(n));
    if (nums.length >= 2) {
      parsed.push({ si: nums[0], di: nums[1] });
    } else if (nums.length === 1) {
      parsed.push({ si: null, di: nums[0] });
    }
  });
  if (parsed.length > 0) {
    rows = parsed;
    renderTable();
    calculate();
  }
});

function tile(value, label, primary) {
  return '<div class="stat-tile' + (primary ? " stat-tile--primary" : "") + '"><div class="stat-tile__value">' +
    value + '</div><div class="stat-tile__label">' + label + '</div></div>';
}

function getDepths() {
  // Returns array of {si, di} in inches, with si defaulted to 1 when blank.
  const valid = rows.filter((r) => r.di !== null && !isNaN(r.di));
  return valid.map((r) => {
    let di = r.di;
    if (volumeMode.checked) {
      const area = parseFloat(throatArea.value);
      di = area > 0 ? (di * ML_TO_IN3) / area : NaN;
    }
    const si = r.si === null || isNaN(r.si) ? 1 : r.si;
    return { si, di };
  });
}

function calculate() {
  const data = getDepths();
  const n = data.length;
  warningContainer.innerHTML = "";

  if (n < 4) {
    statsGrid.innerHTML = tile("—", "Enter at least 4 catch cans");
    return;
  }

  const dis = data.map((d) => d.di);
  if (dis.some((d) => isNaN(d))) {
    statsGrid.innerHTML = tile("—", "Check for invalid entries above");
    return;
  }

  const dz = dis.reduce((a, b) => a + b, 0) / n;

  if (dz === 0) {
    statsGrid.innerHTML = tile("—", "Mean catch is zero — check your data");
    return;
  }

  // CU (Christiansen, unweighted, full n)
  const sumAbsDev = dis.reduce((sum, d) => sum + Math.abs(d - dz), 0);
  const CU = (1 - sumAbsDev / (n * dz)) * 100;

  // DU (low-quarter, unweighted)
  const sortedAsc = [...dis].sort((a, b) => a - b);
  const lowQuarterCount = Math.max(1, Math.round(n / 4));
  const dLQ = sortedAsc.slice(0, lowQuarterCount).reduce((a, b) => a + b, 0) / lowQuarterCount;
  const DU = (dLQ / dz) * 100;

  // CUH (Heermann-Hein, distance-weighted; collapses to CU if all Si equal)
  const sumSi = data.reduce((s, d) => s + d.si, 0);
  const sumDiSi = data.reduce((s, d) => s + d.di * d.si, 0);
  const dzStar = sumDiSi / sumSi;
  const sumWeightedAbsDev = data.reduce((s, d) => s + d.si * Math.abs(d.di - dzStar), 0);
  const CUH = (1 - sumWeightedAbsDev / sumDiSi) * 100;

  const allSiDefault = data.every((d) => d.si === 1) || new Set(data.map((d) => d.si)).size === 1;

  statsGrid.innerHTML =
    tile(formatNumber(DU / 100), "DU (low-quarter distribution uniformity)", true) +
    tile(formatNumber(CU) + "%", "CU (Christiansen)", true) +
    tile(formatNumber(CUH) + "%", "CU<sub>H</sub> (Heermann-Hein, distance-weighted)" + (allSiDefault ? " &mdash; equals CU (equal-area cans)" : ""), true) +
    tile(n, "Valid cans (n)") +
    tile(formatNumber(dz), "Mean catch (d<sub>z</sub>)") +
    tile(formatNumber(dLQ), "Low-quarter mean (d<sub>LQ</sub>, n=" + lowQuarterCount + ")") +
    tile(formatNumber(Math.min(...dis)), "Minimum catch") +
    tile(formatNumber(Math.max(...dis)), "Maximum catch");
}

document.getElementById("load-example-51").addEventListener("click", () => {
  const di = [1.2, 2.6, 1.8, 2.1, 2.2, 1.7, 2.9, 2.7, 1.6, 2.0, 2.1, 1.7, 1.9, 1.4, 2.4, 2.0, 1.6, 2.3, 1.8, 2.0];
  rows = di.map((d) => ({ si: null, di: d }));
  volumeMode.checked = false;
  throatAreaField.classList.add("field--hidden");
  catchColHeader.textContent = "Catch (in)";
  renderTable();
  calculate();
});

document.getElementById("load-example-xlsx").addEventListener("click", () => {
  // Radial distance (ft) repeats every 20 cans (three replicate lines);
  // catch volumes (mL) are the class's own 59-valid-can center-pivot dataset
  // (can 53's reading was lost in the field, matching the source spreadsheet).
  const siLine = [1306, 1296, 1286, 1276, 1266, 1256, 1246, 1236, 1226, 1216, 1206, 1196, 1186, 1176, 1166, 1156, 1146, 1136, 1126, 1116];
  const si = [...siLine, ...siLine, ...siLine];
  const di = [
    156, 170, 178, 180, 173, 167, 172, 177, 168, 168,
    170, 177, 166, 173, 173, 175, 172, 176, 203, 223,
    162, 172, 173, 183, 178, 174, 173, 178, 174, 170,
    174, 176, 174, 176, 167, 170, 170, 174, 197, 220,
    174, 176, 181, 180, 184, 176, 168, 178, 174, 162,
    180, 180, null, 185, 173, 178, 183, 176, 195, 226,
  ];
  rows = [];
  for (let i = 0; i < di.length; i++) {
    if (di[i] === null) continue; // can 53's reading was lost in the field
    rows.push({ si: si[i], di: di[i] });
  }
  volumeMode.checked = true;
  throatAreaField.classList.remove("field--hidden");
  throatArea.value = 28.27;
  catchColHeader.textContent = "Catch (mL)";
  renderTable();
  calculate();
});

renderTable();
calculate();
