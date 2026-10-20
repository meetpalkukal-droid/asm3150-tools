// Leaching Requirement & Reclamation Planner (Chapter 7, bundles Examples 7.4-7.6).
// Shared data/digitized curves come from assets/js/salinity-data.js.

function tile(value, label, primary) {
  return '<div class="stat-tile' + (primary ? " stat-tile--primary" : "") + '">' +
    '<div class="stat-tile__value">' + value + "</div>" +
    '<div class="stat-tile__label">' + label + "</div></div>";
}

// ---------- Panel 1: Actual leaching fraction ----------
const lfDz = document.getElementById("lf-dz");
const lfDr = document.getElementById("lf-dr");
const lfEci = document.getElementById("lf-eci");
const lfEcd = document.getElementById("lf-ecd");
const lfStats = document.getElementById("lf-stats");

function calcLf() {
  const dz = parseFloat(lfDz.value);
  const dr = parseFloat(lfDr.value);
  const Ci = parseFloat(lfEci.value);
  const Cd = parseFloat(lfEcd.value);

  if ([dz, dr, Ci, Cd].some(isNaN) || dz + dr === 0 || Cd === 0) {
    lfStats.innerHTML = tile("—", "Enter values above");
    return;
  }
  const Ca = (Ci * dz + 0 * dr) / (dz + dr);
  const Lf = Ca / Cd;

  lfStats.innerHTML =
    tile(formatNumber(Ca) + " dS/m", "Weighted mean applied-water EC (Ca)") +
    tile(formatNumber(Lf), "Actual leaching fraction (Lf)", true);
}

// ---------- Panel 2: Leaching requirement ----------
const lrEci = document.getElementById("lr-eci");
const lrCrop = document.getElementById("lr-crop");
const lrDz = document.getElementById("lr-dz");
const lrDr = document.getElementById("lr-dr");
const lrStats = document.getElementById("lr-stats");
const lrGrossToggle = document.getElementById("lr-gross-toggle");
const lrGrossField = document.getElementById("lr-gross-field");
const lrNetDepth = document.getElementById("lr-net-depth");
const lrGrossStats = document.getElementById("lr-gross-stats");

populateCropSelect(lrCrop, false);
lrCrop.value = "tomato";

function updateLrGrossVisibility() {
  lrGrossField.classList.toggle("field--hidden", !lrGrossToggle.checked);
}

function calcLr() {
  const ECi = parseFloat(lrEci.value);
  const dz = parseFloat(lrDz.value);
  const dr = parseFloat(lrDr.value);
  const crop = cropSaltToleranceByKey(lrCrop.value);

  if ([ECi, dz, dr].some(isNaN) || !crop || dz + dr === 0) {
    lrStats.innerHTML = tile("—", "Enter values above");
    lrGrossStats.innerHTML = "";
    return;
  }

  const ECa = (ECi * dz + 0 * dr) / (dz + dr);
  const result = leachingRequirement(ECa, crop.T);

  let html =
    tile(formatNumber(ECa) + " dS/m", "Weighted mean applied-water salinity (ECa)") +
    tile(crop.T.toFixed(1) + " dS/m", "Crop salt tolerance threshold (T)") +
    tile(formatNumber(result.Lr), "Leaching requirement (Lr)", true);
  if (result.note) {
    html = '<div class="note" style="grid-column:1/-1; color:#7a1f1f; font-size:0.85rem;">' + result.note + "</div>" + html;
  }
  lrStats.innerHTML = html;

  if (lrGrossToggle.checked) {
    const net = parseFloat(lrNetDepth.value);
    if (isNaN(net)) {
      lrGrossStats.innerHTML = tile("—", "Enter a net depth above");
    } else {
      const gross = net / (1 - result.Lr);
      const extra = gross - net;
      lrGrossStats.innerHTML =
        tile(formatNumber(gross) + " in", "Gross depth to apply (net / (1-Lr))", true) +
        tile(formatNumber(extra) + " in", "Extra depth for leaching");
    }
  } else {
    lrGrossStats.innerHTML = "";
  }
}

// ---------- Panel 3: Reclamation ----------
const rcDepth = document.getElementById("rc-depth");
const rcTexture = document.getElementById("rc-texture");
const rcCo = document.getElementById("rc-co");
const rcCf = document.getElementById("rc-cf");
const rcStats = document.getElementById("rc-stats");

populateReclamationTextureSelect(rcTexture);
rcTexture.value = "clay-loam";

function calcReclamation() {
  const ds = parseFloat(rcDepth.value);
  const Co = parseFloat(rcCo.value);
  const Cf = parseFloat(rcCf.value);
  const K = reclamationKByKey(rcTexture.value);

  if ([ds, Co, Cf].some(isNaN) || Cf === 0) {
    rcStats.innerHTML = tile("—", "Enter values above");
    return;
  }

  const dLPonding = K * ds * (Co / Cf);
  const dLSprinkling = RECLAMATION_K_SPRINKLING * ds * (Co / Cf);

  rcStats.innerHTML =
    tile(formatNumber(dLPonding) + " ft", "Water needed by continuous ponding (K=" + K.toFixed(2) + ")", true) +
    tile(formatNumber(dLSprinkling) + " ft", "Water needed by intermittent ponding / sprinkling (K=0.10)", true);
}

// ---------- Wire up ----------
lrGrossToggle.addEventListener("change", () => { updateLrGrossVisibility(); calcLr(); });

[lfDz, lfDr, lfEci, lfEcd].forEach((el) => el.addEventListener("input", calcLf));
[lrEci, lrCrop, lrDz, lrDr, lrNetDepth].forEach((el) => el.addEventListener("input", calcLr));
[rcDepth, rcTexture, rcCo, rcCf].forEach((el) => el.addEventListener("input", calcReclamation));

updateLrGrossVisibility();
calcLf();
calcLr();
calcReclamation();
