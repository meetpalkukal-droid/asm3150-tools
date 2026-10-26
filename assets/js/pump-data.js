// Shared pump reference data and formulas for ASM 3150/5150 tools.
// Source: Chapter 8 "Pump and Pipeline Hydraulics" (sections 8.5-8.7),
// Eisenhauer, Martin, Heeren, & Hoffman (2021), Irrigation Systems
// Management, ASABE.

// ---------- Total dynamic head, power, Table 8.6 ----------
function tdhFromLift(Ppsi, Lft) {
  return 2.31 * Ppsi + Lft;
}
function tdhBooster(PoutPsi, PinPsi) {
  return 2.31 * (PoutPsi - PinPsi);
}
function waterHp(Qgpm, TDHft) {
  return (Qgpm * TDHft) / 3960;
}
function brakeHp(whp, Ep) {
  return whp / Ep;
}

// Table 8.6. Nebraska Pumping Plant Performance Criteria (Dorn et al., 1981).
const PUMP_ENERGY_SOURCES = [
  { key: "diesel", label: "Diesel", pc: 12.5, unit: "gallon" },
  { key: "propane", label: "Propane", pc: 6.89, unit: "gallon" },
  { key: "natural-gas", label: "Natural gas", pc: 61.7, unit: "1,000 ft³ (mcf)" },
  { key: "electricity", label: "Electricity", pc: 0.885, unit: "kWh" },
  { key: "gasoline", label: "Gasoline", pc: 8.66, unit: "gallon" },
];
function energySourceByKey(key) {
  return PUMP_ENERGY_SOURCES.find((s) => s.key === key) || null;
}
function populateEnergySourceSelect(selectEl) {
  selectEl.innerHTML = "";
  PUMP_ENERGY_SOURCES.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s.key;
    opt.textContent = s.label + " (" + s.pc + " whp-hr/" + s.unit + ")";
    selectEl.appendChild(opt);
  });
  return selectEl;
}

// Eq. 8.20: performance rating = actual performance / performance criteria.
function performanceRating(actualWhpHrPerUnit, pc) {
  return actualWhpHrPerUnit / pc;
}
// Eq. 8.21: energy consumed per hour of operation.
function energyPerHour(whp, pc, pr) {
  return whp / (pc * pr);
}
// Eq. 8.22: energy consumed per acre-inch of water pumped.
function energyPerAcIn(TDHft, pc, pr) {
  return TDHft / (8.75 * pc * pr);
}

// ---------- Pump curves via the affinity laws (Eq. 8.15a/b) ----------
// Rather than digitizing every drawn curve + the full efficiency-contour
// web on a manufacturer sheet, each pump model stores ONE reference
// head-capacity curve (quadratic fit to a handful of points read off the
// chart, anchored to a textbook-verified point where available) plus an
// approximate peaked efficiency curve. Every other diameter or speed is
// generated from that single reference curve by the affinity laws, which
// is how manufacturers generate trim curves in the first place:
//   Q2 = r*Q1,  H2 = r^2*H1,  BHP2 = r^3*BHP1   (r = DIA2/DIA1 or RPM2/RPM1)
// For H(Q) = A + B*Q + C*Q^2, this scaling preserves the quadratic form
// with A -> r^2*A, B -> r*B, C unchanged (verified algebraically and
// against Example 8.11: this model's trim/speed answers land within ~1%
// of the book's chart-read answers of 7.75 in and 1670 rpm).
const PUMP_MODELS = [
  {
    key: "flowserve-12skl",
    label: "Flowserve 12SKL/12KSL (Figure 8.11)",
    refRpm: 1770,
    refDiameterIn: 8.19,
    minDiameterIn: 6.75,
    maxDiameterIn: 8.19,
    minRpm: 1000,
    maxRpm: 1770,
    // H (ft/stage) = A + B*Q + C*Q^2 at refRpm & refDiameterIn, Q in gpm.
    // Digitized from a 400 DPI render of Figure 8.11 (a handful of points
    // on the 8.19-in curve, quadratic least-squares fit, shifted to pass
    // exactly through this chapter's own Example 8.11 anchor point:
    // Q=800 gpm -> H=57 ft/stage).
    curve: { A: 79.90, B: -0.000306, C: -0.0000354 },
    // Approximate peaked efficiency model (NOT a digitization of the
    // manufacturer's efficiency contours - calibrated from two labeled
    // points on the 8.19-in curve: ~47% near Q=300 and the curve's own
    // peak, ~81.7% near Q=950). Treat as indicative, not exact.
    efficiency: { qBep: 950, effMax: 81.7, k: 8.214e-5 },
    qMin: 270, qMax: 1150,
    // Flowserve curve sheet's own stage-derate table: pumps with fewer
    // than 4 stages produce slightly less than n*(head/stage) because the
    // first stage(s) lack the fully-developed inflow later stages see.
    // Applied once to the pump's total TDH, not scaled by diameter/speed.
    stageDerateFt: { 1: -3, 2: -2, 3: -1, 4: 0, 5: 0, 6: 0 },
  },
];
function pumpModelByKey(key) {
  return PUMP_MODELS.find((m) => m.key === key) || null;
}
function populatePumpModelSelect(selectEl) {
  selectEl.innerHTML = "";
  PUMP_MODELS.forEach((m) => {
    const opt = document.createElement("option");
    opt.value = m.key;
    opt.textContent = m.label;
    selectEl.appendChild(opt);
  });
  return selectEl;
}

// Head (ft) produced by ONE stage of `model`, at a given impeller diameter
// (in) and speed (rpm), for a given flow rate (gpm). Uses the affinity
// laws to scale the model's single reference curve.
function stageHeadFt(model, diameterIn, rpm, Qgpm) {
  const rD = diameterIn / model.refDiameterIn;
  const rN = rpm / model.refRpm;
  const r = rD * rN; // combined scale factor (diameter and speed compound)
  const { A, B, C } = model.curve;
  // Q on the reference curve that maps (via affinity) to the requested Q.
  const Qref = Qgpm / r;
  const Href = A + B * Qref + C * Qref * Qref;
  return r * r * Href;
}
// Total TDH for a multistage pump (n stages), including the stage derate.
function multistageTdhFt(model, diameterIn, rpm, Qgpm, stages) {
  const perStage = stageHeadFt(model, diameterIn, rpm, Qgpm);
  const derate = model.stageDerateFt[stages] !== undefined ? model.stageDerateFt[stages] : 0;
  return perStage * stages + derate;
}
// Approximate efficiency (%) at a given flow rate, diameter, and speed -
// efficiency is preserved along affinity-scaled points, so this evaluates
// the reference curve's own efficiency model at the back-scaled flow Qref.
function stageEfficiencyPct(model, diameterIn, rpm, Qgpm) {
  const rD = diameterIn / model.refDiameterIn;
  const rN = rpm / model.refRpm;
  const r = rD * rN;
  const Qref = Qgpm / r;
  const { qBep, effMax, k } = model.efficiency;
  return Math.max(0, effMax - k * (Qref - qBep) * (Qref - qBep));
}
// Finds the diameter (in, at a fixed rpm) that delivers `targetHeadFt` of
// head per stage at `Qgpm` - i.e. what Example 8.11 reads off Figure 8.11
// by eye. Solves the affinity-scaled quadratic for r = D2/D1 directly
// (same algebra as the validation above), not by searching/iterating.
function diameterForHead(model, rpm, Qgpm, targetHeadFt) {
  const rN = rpm / model.refRpm;
  const { A, B, C } = model.curve;
  // targetHeadFt = r^2*A + r*B*Qgpm + C*Qgpm^2, where r = rD*rN (rD=D2/D1).
  // Solve the quadratic in r: A*r^2 + B*Qgpm*r + (C*Qgpm^2 - target) = 0.
  const a = A, b = B * Qgpm, c = C * Qgpm * Qgpm - targetHeadFt;
  const disc = b * b - 4 * a * c;
  if (disc < 0) return null;
  const r = (-b + Math.sqrt(disc)) / (2 * a); // positive root (physically meaningful)
  if (r <= 0) return null;
  const rD = r / rN;
  return rD * model.refDiameterIn;
}
// Finds the rpm (at a fixed diameter) that delivers `targetHeadFt` at Qgpm -
// the VFD/speed-change scenario in Example 8.11.
function rpmForHead(model, diameterIn, Qgpm, targetHeadFt) {
  const rD = diameterIn / model.refDiameterIn;
  const { A, B, C } = model.curve;
  const a = A, b = B * Qgpm, c = C * Qgpm * Qgpm - targetHeadFt;
  const disc = b * b - 4 * a * c;
  if (disc < 0) return null;
  const r = (-b + Math.sqrt(disc)) / (2 * a);
  if (r <= 0) return null;
  const rN = r / rD;
  return rN * model.refRpm;
}

// Shared pump head-capacity chart: the reference curve's affinity-scaled
// family (one line per stage count, or per diameter/speed scenario),
// system requirement point, and (if oversized) the throttling-loss wedge
// between the pump's actual output and the system's actual need.
function buildPumpCurveChartSVG(opts) {
  const W = opts.width || 640, H = opts.height || 440;
  const padL = 65, padR = 20, padT = 20, padB = 50;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const qMax = opts.qMax || 1200;
  const hMax = opts.hMax || 320;
  const xPx = (q) => padL + (q / qMax) * plotW;
  const yPx = (h) => padT + plotH - (Math.min(h, hMax) / hMax) * plotH;

  let s = "";
  for (let q = 0; q <= qMax; q += qMax / 8) {
    s += '<line x1="' + xPx(q) + '" y1="' + padT + '" x2="' + xPx(q) + '" y2="' + (padT + plotH) + '" stroke="#e5e0d5" stroke-width="1"/>';
    s += '<text x="' + xPx(q) + '" y="' + (padT + plotH + 20) + '" font-size="11" text-anchor="middle" fill="#666">' + Math.round(q) + "</text>";
  }
  for (let h = 0; h <= hMax; h += hMax / 8) {
    s += '<line x1="' + padL + '" y1="' + yPx(h) + '" x2="' + (padL + plotW) + '" y2="' + yPx(h) + '" stroke="#e5e0d5" stroke-width="1"/>';
    s += '<text x="' + (padL - 10) + '" y="' + (yPx(h) + 4) + '" font-size="11" text-anchor="end" fill="#666">' + Math.round(h) + "</text>";
  }
  s += '<text x="' + (padL + plotW / 2) + '" y="' + (H - 8) + '" font-size="13" text-anchor="middle" fill="#333">Flow rate (Q), gpm</text>';
  s += '<text x="18" y="' + (padT + plotH / 2) + '" font-size="13" text-anchor="middle" fill="#333" transform="rotate(-90 18 ' + (padT + plotH / 2) + ')">Total dynamic head (TDH), ft</text>';

  // Pump curve (the multistage TDH curve at the selected diameter/speed/stage count).
  const model = opts.model, diameterIn = opts.diameterIn, rpm = opts.rpm, stages = opts.stages;
  const qLo = model.qMin * (diameterIn / model.refDiameterIn) * (rpm / model.refRpm);
  const qHi = model.qMax * (diameterIn / model.refDiameterIn) * (rpm / model.refRpm);
  let path = "";
  const steps = 40;
  for (let i = 0; i <= steps; i++) {
    const q = qLo + ((qHi - qLo) * i) / steps;
    const tdh = multistageTdhFt(model, diameterIn, rpm, q, stages);
    path += (i === 0 ? "M" : "L") + xPx(q) + "," + yPx(tdh) + " ";
  }
  s += '<path d="' + path + '" fill="none" stroke="#5a7fa6" stroke-width="3"/>';

  // System operating point.
  const sysQ = opts.systemQ, sysTdh = opts.systemTdh;
  const pumpTdhAtSysQ = multistageTdhFt(model, diameterIn, rpm, sysQ, stages);

  // Throttling-loss wedge: the gap between what the pump produces at the
  // system's flow and what the system actually needs.
  if (pumpTdhAtSysQ > sysTdh + 0.5) {
    const x = xPx(sysQ);
    s += '<line x1="' + x + '" y1="' + yPx(pumpTdhAtSysQ) + '" x2="' + x + '" y2="' + yPx(sysTdh) + '" stroke="#d9534f" stroke-width="10" opacity="0.55"/>';
    s += '<text x="' + (x + 10) + '" y="' + ((yPx(pumpTdhAtSysQ) + yPx(sysTdh)) / 2) + '" font-size="11" fill="#7a1f1f">throttled</text>';
  }

  s += '<circle cx="' + xPx(sysQ) + '" cy="' + yPx(sysTdh) + '" r="7" fill="#F1B300" stroke="#191919" stroke-width="2"/>';
  s += '<text x="' + xPx(sysQ) + '" y="' + (yPx(sysTdh) - 14) + '" font-size="12" font-weight="700" text-anchor="middle" fill="#191919">System need</text>';

  s += '<circle cx="' + xPx(sysQ) + '" cy="' + yPx(pumpTdhAtSysQ) + '" r="7" fill="#5a7fa6" stroke="#191919" stroke-width="2"/>';

  s += '<rect x="' + padL + '" y="' + padT + '" width="' + plotW + '" height="' + plotH + '" fill="none" stroke="#999" stroke-width="1"/>';
  return s;
}
