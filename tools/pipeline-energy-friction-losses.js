// Pipeline Energy, Friction & Minor Losses (Chapter 8, bundles Examples 8.2-8.4).
// Shared data/formulas come from assets/js/hydraulics-data.js.

function tile(value, label, primary) {
  return '<div class="stat-tile' + (primary ? " stat-tile--primary" : "") + '">' +
    '<div class="stat-tile__value">' + value + "</div>" +
    '<div class="stat-tile__label">' + label + "</div></div>";
}

const MAX_SAFE_V = 5; // ft/s, textbook's general water-hammer guideline

// ---------- Section 1: Total head at a point ----------
const ptQ = document.getElementById("pt-q");
const ptQNumber = document.getElementById("pt-q-number");
const ptZ1 = document.getElementById("pt-z1"), ptP1 = document.getElementById("pt-p1"), ptD1 = document.getElementById("pt-d1");
const ptZ2 = document.getElementById("pt-z2"), ptP2 = document.getElementById("pt-p2"), ptD2 = document.getElementById("pt-d2");
const ptSecondToggle = document.getElementById("pt-second-toggle");
const ptPoint2Col = document.getElementById("pt-point2-col");
const ptStats = document.getElementById("pt-stats");

function pointHead(Q, Z, P, d) {
  const V = velocityFtPerSec(Q, d);
  const hv = velocityHeadFt(V);
  const h = ftHeadFromPsi(P);
  const H = hv + parseFloat(Z) + h;
  return { V, hv, h, H };
}

function calcPoints() {
  const Q = parseFloat(ptQ.value);
  const showSecond = ptSecondToggle.checked;
  ptPoint2Col.classList.toggle("field--hidden", !showSecond);

  const p1 = pointHead(Q, ptZ1.value, parseFloat(ptP1.value), parseFloat(ptD1.value));
  let p2 = null;
  if (showSecond) p2 = pointHead(Q, ptZ2.value, parseFloat(ptP2.value), parseFloat(ptD2.value));

  let html =
    tile(formatNumber(p1.V) + " ft/s" + (p1.V > MAX_SAFE_V ? " ⚠" : ""), "Point 1 velocity (Vm)") +
    tile(formatNumber(p1.hv) + " ft", "Point 1 velocity head") +
    tile(formatNumber(p1.h) + " ft", "Point 1 pressure head") +
    tile(formatNumber(p1.H) + " ft", "Point 1 total head (H)", true);
  if (p2) {
    html +=
      tile(formatNumber(p2.V) + " ft/s" + (p2.V > MAX_SAFE_V ? " ⚠" : ""), "Point 2 velocity (Vm)") +
      tile(formatNumber(p2.hv) + " ft", "Point 2 velocity head") +
      tile(formatNumber(p2.h) + " ft", "Point 2 pressure head") +
      tile(formatNumber(p2.H) + " ft", "Point 2 total head (H)", true);
  }
  ptStats.innerHTML = html;

  const points = [{ Z: parseFloat(ptZ1.value), h: p1.h, hv: p1.hv, label: "Point 1" }];
  if (p2) points.push({ Z: parseFloat(ptZ2.value), h: p2.h, hv: p2.hv, label: "Point 2" });
  document.getElementById("head-bars-chart").innerHTML = buildHeadProfileSVG({ width: 520, height: 420, points });
}

// ---------- Section 2: Friction loss ----------
const frMaterial = document.getElementById("fr-material");
const frDiameter = document.getElementById("fr-diameter");
const frLength = document.getElementById("fr-length");
const frQSingle = document.getElementById("fr-q-single");
const frQSingleNumber = document.getElementById("fr-q-single-number");
const fieldSingleQ = document.getElementById("field-single-q");
const fieldLateralInputs = document.getElementById("field-lateral-inputs");
const frOutlets = document.getElementById("fr-outlets");
const frOutletQ = document.getElementById("fr-outlet-q");
const frSpacing = document.getElementById("fr-spacing");
const frPivotToggle = document.getElementById("fr-pivot-toggle");
const fieldPivotEndgun = document.getElementById("field-pivot-endgun");
const frictionStats = document.getElementById("friction-stats");

populatePipeMaterialSelect(frMaterial);
frMaterial.value = "aluminum-couplers";

let frictionState = { Q: 0, d: 0, Pf_total: 0, F: 1 };

function currentFrictionMode() {
  return document.querySelector('input[name="friction-mode"]:checked').value;
}
function updateFrictionModeVisibility() {
  const lateral = currentFrictionMode() === "lateral";
  fieldSingleQ.classList.toggle("field--hidden", lateral);
  fieldLateralInputs.classList.toggle("field--hidden", !lateral);
}
function updatePivotVisibility() {
  fieldPivotEndgun.classList.toggle("field--hidden", !frPivotToggle.checked);
}

function calcFriction() {
  const lateral = currentFrictionMode() === "lateral";
  const material = pipeMaterialByKey(frMaterial.value);
  const d = parseFloat(frDiameter.value);
  const L = parseFloat(frLength.value);
  let Q, F;

  if (lateral) {
    const n = parseFloat(frOutlets.value);
    const q = parseFloat(frOutletQ.value);
    Q = n * q;
    if (frPivotToggle.checked) {
      F = document.getElementById("pivot-no-gun").checked ? OUTLET_FACTOR_PIVOT_NO_END_GUN : OUTLET_FACTOR_PIVOT_END_GUN;
    } else {
      F = outletFactor(n);
    }
  } else {
    Q = parseFloat(frQSingle.value);
    F = 1;
  }

  if ([Q, L, d].some(isNaN) || !material) {
    frictionStats.innerHTML = tile("—", "Enter values above");
    return;
  }

  const V = velocityFtPerSec(Q, d);
  const pfPer100NoF = hazenWilliamsPf_psiPer100ft(Q, material.C, d, 1);
  const Pf_total = pfPer100NoF * F * (L / 100);

  frictionState = { Q, d, Pf_total, F };

  let html =
    tile(formatNumber(Q) + " gpm", "Flow rate (Q)") +
    tile(formatNumber(V) + " ft/s" + (V > MAX_SAFE_V ? " ⚠" : ""), "Mean velocity (Vm)") +
    tile(formatNumber(pfPer100NoF) + " psi/100 ft", "Friction loss, before outlet factor") +
    tile(F.toFixed(3), "Outlet factor used (F)") +
    tile(formatNumber(Pf_total) + " psi", "Total friction loss (Pf)", true);
  frictionStats.innerHTML = html;

  calcMinorLosses();
  calcPressureChange();
}

// ---------- Section 3: Minor losses ----------
const fittingsContainer = document.getElementById("fittings-container");
const minorLossStats = document.getElementById("minor-loss-stats");
let fittingRows = [];

function renderFittingOptions(selectedKey) {
  return FITTING_K_TABLE.map((f) => '<option value="' + f.key + '"' + (f.key === selectedKey ? " selected" : "") + ">" + f.label + "</option>").join("");
}

function renderFittings() {
  let html = "";
  fittingRows.forEach((row, i) => {
    html += '<div class="fitting-row">' +
      '<select class="fitting-select" data-i="' + i + '">' + renderFittingOptions(row.key) + "</select>" +
      '<input type="number" class="fitting-count" data-i="' + i + '" min="0" step="1" value="' + row.count + '">' +
      '<div class="fitting-k" data-i="' + i + '" style="font-size:0.85rem; color:var(--text-muted);"></div>' +
      '<div class="row-remove"><button type="button" data-i="' + i + '" aria-label="Remove">&times;</button></div>' +
      "</div>";
  });
  fittingsContainer.innerHTML = html;

  fittingsContainer.querySelectorAll(".fitting-select").forEach((el) =>
    el.addEventListener("change", (e) => { fittingRows[+e.target.dataset.i].key = e.target.value; calcMinorLosses(); calcPressureChange(); })
  );
  fittingsContainer.querySelectorAll(".fitting-count").forEach((el) =>
    el.addEventListener("input", (e) => { fittingRows[+e.target.dataset.i].count = parseFloat(e.target.value) || 0; calcMinorLosses(); calcPressureChange(); })
  );
  fittingsContainer.querySelectorAll(".row-remove button").forEach((el) =>
    el.addEventListener("click", (e) => {
      fittingRows.splice(+e.target.dataset.i, 1);
      renderFittings();
      calcMinorLosses();
      calcPressureChange();
    })
  );
}

let minorLossState = { Pm_total: 0 };

function calcMinorLosses() {
  const d = frictionState.d;
  const Q = frictionState.Q;
  const V = velocityFtPerSec(Q, d);

  let totalK = 0;
  fittingRows.forEach((row, i) => {
    const K = fittingK(row.key, d);
    totalK += K * row.count;
    const el = fittingsContainer.querySelector('.fitting-k[data-i="' + i + '"]');
    if (el) el.textContent = "K=" + K.toFixed(2);
  });

  const hm = minorLossHeadFt(totalK, V);
  const Pm_total = psiFromFtHead(hm);
  minorLossState = { Pm_total };

  minorLossStats.innerHTML =
    tile(totalK.toFixed(3), "Total resistance coefficient (ΣK)") +
    tile(formatNumber(hm) + " ft", "Minor head loss (hm)") +
    tile(formatNumber(Pm_total) + " psi", "Total minor loss (Pm)", true);
}

// ---------- Section 4: Pressure change ----------
const pcP1 = document.getElementById("pc-p1");
const pcElevation = document.getElementById("pc-elevation");
const pressureChangeStats = document.getElementById("pressure-change-stats");

function calcPressureChange() {
  const P1 = parseFloat(pcP1.value);
  const elev = parseFloat(pcElevation.value);
  const rising = document.getElementById("elev-rise").checked;

  if ([P1, elev].some(isNaN)) {
    pressureChangeStats.innerHTML = tile("—", "Enter values above");
    return;
  }

  const elevTerm = rising ? -0.433 * elev : 0.433 * elev;
  const P2 = P1 - frictionState.Pf_total - minorLossState.Pm_total + elevTerm;

  pressureChangeStats.innerHTML =
    tile(formatNumber(frictionState.Pf_total) + " psi", "Friction loss (Pf, from Section 2)") +
    tile(formatNumber(minorLossState.Pm_total) + " psi", "Minor loss (Pm, from Section 3)") +
    tile(formatNumber(P2) + " psi", "Outlet pressure (P2)", true);

  renderProfileDiagram(P1, P2, elev, rising);
}

function renderProfileDiagram(P1, P2, elev, rising) {
  const svg = document.getElementById("profile-diagram");
  svg.innerHTML = buildPipeProfileSVG({ width: 560, height: 220, P1, P2, elevMag: elev, rising });
}

// ---------- Wire up ----------
document.querySelectorAll('input[name="friction-mode"]').forEach((r) =>
  r.addEventListener("change", () => { updateFrictionModeVisibility(); calcFriction(); })
);
frPivotToggle.addEventListener("change", () => { updatePivotVisibility(); calcFriction(); });
document.querySelectorAll('input[name="pivot-endgun"]').forEach((r) => r.addEventListener("change", calcFriction));
document.querySelectorAll('input[name="elevation-dir"]').forEach((r) => r.addEventListener("change", calcPressureChange));

ptSecondToggle.addEventListener("change", calcPoints);
[ptZ1, ptP1, ptD1, ptZ2, ptP2, ptD2].forEach((el) => el.addEventListener("input", calcPoints));
bindSliderNumber(ptQ, ptQNumber, calcPoints);

[frMaterial, frDiameter, frLength, frOutlets, frOutletQ, frSpacing].forEach((el) => el.addEventListener("input", calcFriction));
frMaterial.addEventListener("change", calcFriction);
bindSliderNumber(frQSingle, frQSingleNumber, calcFriction);

document.getElementById("fill-length-btn").addEventListener("click", () => {
  const n = parseFloat(frOutlets.value);
  const spacing = parseFloat(frSpacing.value);
  if (!isNaN(n) && !isNaN(spacing)) {
    frLength.value = n * spacing;
    calcFriction();
  }
});

document.getElementById("add-fitting").addEventListener("click", () => {
  fittingRows.push({ key: FITTING_K_TABLE[0].key, count: 1 });
  renderFittings();
  calcMinorLosses();
  calcPressureChange();
});

[pcP1, pcElevation].forEach((el) => el.addEventListener("input", calcPressureChange));

updateFrictionModeVisibility();
updatePivotVisibility();
renderFittings();
calcPoints();
calcFriction();
