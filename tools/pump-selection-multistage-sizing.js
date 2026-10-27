// Pump Selection & Multistage Sizing (Chapter 8, Example 8.11).
// Shared data/formulas/charts come from assets/js/pump-data.js.

function tile(value, label, primary) {
  return '<div class="stat-tile' + (primary ? " stat-tile--primary" : "") + '">' +
    '<div class="stat-tile__value">' + value + "</div>" +
    '<div class="stat-tile__label">' + label + "</div></div>";
}

const MAX_SAFE_RISE_FT = 0.5; // tolerance band (ft) to call a pump "matched" rather than over/undersized

// ---------- Section 1: System requirement ----------
const sysQ = document.getElementById("sys-q"), sysQNumber = document.getElementById("sys-q-number");
const sysP = document.getElementById("sys-p"), sysPNumber = document.getElementById("sys-p-number");
const sysL = document.getElementById("sys-l"), sysLNumber = document.getElementById("sys-l-number");
const sysStats = document.getElementById("sys-stats");

let systemTdh = NaN;

function calcSystem() {
  const Q = parseFloat(sysQ.value);
  const P = parseFloat(sysP.value);
  const L = parseFloat(sysL.value);
  systemTdh = tdhFromLift(P, L);
  sysStats.innerHTML =
    tile(formatNumber(Q) + " gpm", "System flow rate") +
    tile(formatNumber(systemTdh) + " ft", "Total dynamic head required", true);
  calcPump();
}

// ---------- Section 2: Pump configuration ----------
const pumpModelSelect = document.getElementById("pump-model");
const fitModeGroup = document.getElementById("fit-mode-group");
const pumpDiameter = document.getElementById("pump-diameter"), pumpDiameterNumber = document.getElementById("pump-diameter-number");
const pumpRpm = document.getElementById("pump-rpm"), pumpRpmNumber = document.getElementById("pump-rpm-number");
const pumpStages = document.getElementById("pump-stages"), pumpStagesNumber = document.getElementById("pump-stages-number");
const pumpStats = document.getElementById("pump-stats");

populatePumpModelSelect(pumpModelSelect);
pumpModelSelect.value = "flowserve-12skl";

function fitMode() {
  return document.querySelector('input[name="fit-mode"]:checked').value;
}
function setFieldEnabled(slider, number, enabled) {
  slider.disabled = !enabled;
  number.disabled = !enabled;
}
function updateFitModeControls() {
  const mode = fitMode();
  setFieldEnabled(pumpDiameter, pumpDiameterNumber, mode !== "trim");
  setFieldEnabled(pumpRpm, pumpRpmNumber, mode !== "vfd");
}

function renderStageStack(stages, model) {
  const svg = document.getElementById("stage-stack");
  const W = 560, H = 120;
  const bowlW = 70, gap = 12;
  const totalW = stages * bowlW + (stages - 1) * gap;
  const startX = (W - totalW) / 2;
  let s = "";
  for (let i = 0; i < stages; i++) {
    const x = startX + i * (bowlW + gap);
    s += '<rect x="' + x + '" y="30" width="' + bowlW + '" height="55" rx="8" fill="#8c8c8c" stroke="#191919" stroke-width="2"/>';
    s += '<circle cx="' + (x + bowlW / 2) + '" cy="' + (30 + 55 / 2) + '" r="14" fill="#5a7fa6" stroke="#191919" stroke-width="2"/>';
    s += '<text x="' + (x + bowlW / 2) + '" y="100" font-size="11" text-anchor="middle" fill="#444">Stage ' + (i + 1) + "</text>";
    if (i < stages - 1) {
      s += '<line x1="' + (x + bowlW) + '" y1="57.5" x2="' + (x + bowlW + gap) + '" y2="57.5" stroke="#F1B300" stroke-width="4"/>';
    }
  }
  s += '<text x="' + (startX - 10) + '" y="62" font-size="20" text-anchor="end" fill="#444">Q&rarr;</text>';
  svg.innerHTML = s;
}

function calcPump() {
  const model = pumpModelByKey(pumpModelSelect.value);
  const stages = parseInt(pumpStages.value, 10);
  const Q = parseFloat(sysQ.value);
  const mode = fitMode();

  let diameterIn = parseFloat(pumpDiameter.value);
  let rpm = parseFloat(pumpRpm.value);

  if (!isNaN(systemTdh) && !isNaN(Q)) {
    const derate = model.stageDerateFt[stages] !== undefined ? model.stageDerateFt[stages] : 0;
    const targetPerStage = (systemTdh - derate) / stages;

    if (mode === "trim") {
      const d = diameterForHead(model, rpm, Q, targetPerStage);
      if (d !== null) {
        diameterIn = Math.max(model.minDiameterIn, Math.min(model.maxDiameterIn, d));
        pumpDiameter.value = diameterIn.toFixed(2);
        pumpDiameterNumber.value = diameterIn.toFixed(2);
      }
    } else if (mode === "vfd") {
      const n = rpmForHead(model, diameterIn, Q, targetPerStage);
      if (n !== null) {
        rpm = Math.max(model.minRpm, Math.min(model.maxRpm, n));
        pumpRpm.value = rpm.toFixed(0);
        pumpRpmNumber.value = rpm.toFixed(0);
      }
    }
  }

  renderStageStack(stages, model);

  const perStageHead = stageHeadFt(model, diameterIn, rpm, Q);
  const totalTdh = multistageTdhFt(model, diameterIn, rpm, Q, stages);
  const eff = stageEfficiencyPct(model, diameterIn, rpm, Q);
  const bhp = brakeHp(waterHp(Q, totalTdh), eff / 100);

  pumpStats.innerHTML =
    tile(formatNumber(perStageHead) + " ft/stage", "Head per stage at this diameter &amp; speed") +
    tile(formatNumber(totalTdh) + " ft", "Total TDH produced (" + stages + " stages)", true) +
    tile(formatNumber(eff) + "%", "Approx. efficiency at this operating point") +
    tile(formatNumber(bhp) + " hp", "Brake horsepower");

  calcMatch(model, diameterIn, rpm, stages, totalTdh, Q, eff);
}

// ---------- Section 3: Match verdict + chart ----------
const verdictBox = document.getElementById("verdict-box");
const matchStats = document.getElementById("match-stats");

let lastMatch = null;

function calcMatch(model, diameterIn, rpm, stages, pumpTdh, Q, eff) {
  if (isNaN(systemTdh)) {
    verdictBox.className = "verdict-box";
    verdictBox.textContent = "Enter system requirements above.";
    matchStats.innerHTML = "";
    return;
  }

  const excess = pumpTdh - systemTdh;
  let verdictClass, verdictText;
  if (excess > MAX_SAFE_RISE_FT) {
    verdictClass = "oversized";
    verdictText = "⚠ Oversized — this pump develops " + formatNumber(excess) + " ft more head than the system needs at " + formatNumber(Q) + " gpm.";
  } else if (excess < -MAX_SAFE_RISE_FT) {
    verdictClass = "undersized";
    verdictText = "⚠ Undersized — this pump falls short by " + formatNumber(-excess) + " ft at " + formatNumber(Q) + " gpm.";
  } else {
    verdictClass = "matched";
    verdictText = "✓ Matched — this pump's output is within " + MAX_SAFE_RISE_FT.toFixed(1) + " ft of what the system needs.";
  }
  verdictBox.className = "verdict-box verdict-box--" + verdictClass;
  verdictBox.textContent = verdictText;

  let html =
    tile(formatNumber(pumpTdh) + " ft", "Pump output at system flow") +
    tile(formatNumber(systemTdh) + " ft", "System requirement") +
    tile((excess >= 0 ? "+" : "") + formatNumber(excess) + " ft", "Excess head", true);
  if (excess > MAX_SAFE_RISE_FT) {
    html += tile(formatNumber(excess * 0.433) + " psi", "A throttling valve would have to dissipate", true);
  }
  matchStats.innerHTML = html;

  lastMatch = { model, diameterIn, rpm, stages, pumpTdh, Q, eff, excess };

  const svg = document.getElementById("pump-chart");
  svg.innerHTML = buildPumpCurveChartSVG({
    width: 640, height: 440,
    qMax: 1500, hMax: Math.max(pumpTdh, systemTdh) * 1.25,
    model, diameterIn, rpm, stages,
    systemQ: Q, systemTdh: systemTdh,
  });
}

// ---------- Wire up ----------
document.querySelectorAll('input[name="fit-mode"]').forEach((r) =>
  r.addEventListener("change", () => { updateFitModeControls(); calcPump(); })
);
pumpModelSelect.addEventListener("change", calcPump);

bindSliderNumber(sysQ, sysQNumber, calcSystem);
bindSliderNumber(sysP, sysPNumber, calcSystem);
bindSliderNumber(sysL, sysLNumber, calcSystem);
bindSliderNumber(pumpDiameter, pumpDiameterNumber, calcPump);
bindSliderNumber(pumpRpm, pumpRpmNumber, calcPump);
bindSliderNumber(pumpStages, pumpStagesNumber, calcPump);

updateFitModeControls();
calcSystem();
