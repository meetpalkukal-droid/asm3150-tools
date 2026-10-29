// Pump Power, Performance Rating & Energy Cost (Chapter 8, bundles Examples 8.6-8.10).
// Shared data/formulas come from assets/js/pump-data.js.

function tile(value, label, primary) {
  return '<div class="stat-tile' + (primary ? " stat-tile--primary" : "") + '">' +
    '<div class="stat-tile__value">' + value + "</div>" +
    '<div class="stat-tile__label">' + label + "</div></div>";
}

// ---------- Section 1: TDH ----------
const liftP = document.getElementById("lift-p"), liftPNumber = document.getElementById("lift-p-number");
const liftL = document.getElementById("lift-l"), liftLNumber = document.getElementById("lift-l-number");
const boosterPout = document.getElementById("booster-pout"), boosterPoutNumber = document.getElementById("booster-pout-number");
const boosterPin = document.getElementById("booster-pin"), boosterPinNumber = document.getElementById("booster-pin-number");
const fieldLiftP = document.getElementById("field-lift-p");
const fieldLiftL = document.getElementById("field-lift-l");
const fieldBooster = document.getElementById("field-booster");
const tdhFormula = document.getElementById("tdh-formula");
const tdhStats = document.getElementById("tdh-stats");

let currentTdh = NaN;

function tdhMode() {
  return document.querySelector('input[name="tdh-mode"]:checked').value;
}
function updateTdhModeVisibility() {
  const booster = tdhMode() === "booster";
  fieldLiftP.classList.toggle("field--hidden", booster);
  fieldLiftL.classList.toggle("field--hidden", booster);
  fieldBooster.classList.toggle("field--hidden", !booster);
  tdhFormula.setAttribute("data-latex", booster ? "TDH = 2.31 \\times (P_{out} - P_{in})" : "TDH = 2.31 \\times P + L");
  renderMathFormulas();
}

function calcTdh() {
  const booster = tdhMode() === "booster";
  if (booster) {
    currentTdh = tdhBooster(parseFloat(boosterPout.value), parseFloat(boosterPin.value));
  } else {
    currentTdh = tdhFromLift(parseFloat(liftP.value), parseFloat(liftL.value));
  }
  tdhStats.innerHTML = tile(formatNumber(currentTdh) + " ft", "Total dynamic head (TDH)", true);
  calcPower();
}

// ---------- Section 2: Power ----------
const powerQ = document.getElementById("power-q"), powerQNumber = document.getElementById("power-q-number");
const powerEp = document.getElementById("power-ep"), powerEpNumber = document.getElementById("power-ep-number");
const powerStats = document.getElementById("power-stats");

let currentWhp = NaN;
let currentBhp = NaN;
let currentQ = NaN;

function calcPower() {
  const Q = parseFloat(powerQ.value);
  const Ep = parseFloat(powerEp.value) / 100;
  currentQ = Q;
  if (isNaN(currentTdh) || isNaN(Q) || isNaN(Ep)) {
    powerStats.innerHTML = tile("—", "Enter values above");
    return;
  }
  currentWhp = waterHp(Q, currentTdh);
  currentBhp = brakeHp(currentWhp, Ep);
  powerStats.innerHTML =
    tile(formatNumber(currentWhp) + " hp", "Water horsepower (whp)") +
    tile(formatNumber(currentBhp) + " hp", "Brake horsepower (bhp)", true);
  calcRating();
}

// ---------- Section 3: Performance rating ----------
const energySource = document.getElementById("energy-source");
const measuredRate = document.getElementById("measured-rate");
const measuredRateUnit = document.getElementById("measured-rate-unit");
const ratingStats = document.getElementById("rating-stats");

populateEnergySourceSelect(energySource);
energySource.value = "diesel";

let currentPr = NaN;
let currentRate = NaN;
let currentHypoRate = NaN;

function updateUnitLabels() {
  const src = energySourceByKey(energySource.value);
  measuredRateUnit.textContent = src.unit + "/hr";
  document.getElementById("price-unit-label").textContent = "$/" + src.unit;
}

function calcRating() {
  const src = energySourceByKey(energySource.value);
  const rate = parseFloat(measuredRate.value);
  currentRate = rate;
  if (isNaN(currentWhp) || isNaN(rate) || rate === 0) {
    ratingStats.innerHTML = tile("—", "Enter values above");
    currentPr = NaN;
    calcCost();
    return;
  }
  const actualPerf = currentWhp / rate; // whp-hr per unit
  currentPr = performanceRating(actualPerf, src.pc);
  currentHypoRate = energyPerHour(currentWhp, src.pc, 1); // consumption/hr if PR=1

  ratingStats.innerHTML =
    tile(formatNumber(actualPerf) + " whp-hr/" + src.unit, "Actual performance") +
    tile(formatNumber(currentPr), "Performance rating (PR)", true) +
    tile(formatNumber(currentHypoRate) + " " + src.unit + "/hr", "Consumption if operating at PR=1");
  calcCost();
}

// ---------- Section 4: Energy cost ----------
const priceInput = document.getElementById("price-per-unit");
const costStats = document.getElementById("cost-stats");

function calcCost() {
  const src = energySourceByKey(energySource.value);
  if (isNaN(currentTdh) || isNaN(currentPr)) {
    costStats.innerHTML = tile("—", "Enter values above");
    buildOutcomes();
    return;
  }
  const eActual = energyPerAcIn(currentTdh, src.pc, currentPr);
  const eIdeal = energyPerAcIn(currentTdh, src.pc, 1);
  let html =
    tile(formatNumber(eActual) + " " + src.unit + "/ac-in", "Energy per ac-in at measured PR", true) +
    tile(formatNumber(eIdeal) + " " + src.unit + "/ac-in", "Energy per ac-in if PR=1");

  const price = parseFloat(priceInput.value);
  if (!isNaN(price) && price > 0) {
    html += tile("$" + formatNumber(eActual * price) + "/ac-in", "Cost per ac-in at measured PR", true);
  }
  costStats.innerHTML = html;
  buildOutcomes();
}

// ---------- Section 5: Plain-language outcomes ----------
const outcomesSummary = document.getElementById("outcomes-summary");

function buildOutcomes() {
  if (isNaN(currentTdh) || isNaN(currentQ) || isNaN(currentBhp)) {
    outcomesSummary.className = "outcome-box";
    outcomesSummary.innerHTML = "<p>Enter your system's flow rate, head, and efficiency above to see what these numbers mean in practice.</p>";
    return;
  }

  const src = energySourceByKey(energySource.value);
  const paras = [];

  paras.push(
    "<p><strong>What size motor do I need?</strong> To deliver " + formatNumber(currentQ) +
    " gpm against " + formatNumber(currentTdh) + " ft of total dynamic head, this pump has to " +
    "supply about " + formatNumber(currentWhp) + " water horsepower. At " + powerEp.value +
    "% pump efficiency, that takes a motor rated at least <strong>" + formatNumber(currentBhp) +
    " hp</strong>.</p>"
  );

  let boxClass = "outcome-box";

  if (!isNaN(currentPr) && !isNaN(currentRate) && !isNaN(currentHypoRate)) {
    const extraPct = (1 / currentPr - 1) * 100;
    const extraRate = currentRate - currentHypoRate;

    if (currentPr >= 0.95) {
      boxClass += " outcome-box--good";
      paras.push(
        "<p><strong>Is this plant performing well?</strong> Yes &mdash; at a performance rating of " +
        formatNumber(currentPr) + ", it's running at or near the Nebraska benchmark for a " +
        src.label.toLowerCase() + "-powered plant. There's little to gain from chasing efficiency " +
        "further here.</p>"
      );
    } else if (currentPr >= 0.80) {
      boxClass += " outcome-box--caution";
      paras.push(
        "<p><strong>Is this plant performing well?</strong> Not quite &mdash; a performance rating of " +
        formatNumber(currentPr) + " means it's burning about " + formatNumber(extraPct) +
        "% more " + src.unit + " per hour than a plant running at the Nebraska benchmark would, " +
        "for the same water delivered. Worth a maintenance check (worn impeller, misaligned engine, " +
        "clogged intake), but not an emergency.</p>"
      );
    } else {
      boxClass += " outcome-box--warning";
      paras.push(
        "<p><strong>Is this plant performing well?</strong> No &mdash; a performance rating of " +
        formatNumber(currentPr) + " is a real red flag. It's using about " + formatNumber(extraPct) +
        "% more " + src.unit + " per hour (" + formatNumber(currentRate) + " vs. a benchmark " +
        formatNumber(currentHypoRate) + " " + src.unit + "/hr) than it should for the same output " +
        "&mdash; worth an inspection before another season of paying for it.</p>"
      );
    }

    if (extraRate > 0.0001) {
      let savingsSentence =
        "<p><strong>What would fixing it save me?</strong> Bringing this plant up to the benchmark " +
        "(PR = 1) would cut consumption by about " + formatNumber(extraRate) + " " + src.unit + "/hr";
      const price = parseFloat(priceInput.value);
      if (!isNaN(price) && price > 0) {
        savingsSentence += " &mdash; roughly $" + formatNumber(extraRate * price) + "/hr, or $" +
          formatNumber((energyPerAcIn(currentTdh, src.pc, currentPr) - energyPerAcIn(currentTdh, src.pc, 1)) * price) +
          " saved on every acre-inch pumped";
      }
      savingsSentence += ".</p>";
      paras.push(savingsSentence);
    }
  } else {
    paras.push(
      "<p><strong>Is this plant performing well?</strong> Enter a measured fuel or electricity " +
      "consumption rate above to find out.</p>"
    );
  }

  outcomesSummary.className = boxClass;
  outcomesSummary.innerHTML = paras.join("");
}

// ---------- Wire up ----------
document.querySelectorAll('input[name="tdh-mode"]').forEach((r) =>
  r.addEventListener("change", () => { updateTdhModeVisibility(); calcTdh(); })
);
energySource.addEventListener("change", () => { updateUnitLabels(); calcRating(); });
[measuredRate, priceInput].forEach((el) => el.addEventListener("input", () => { calcRating(); }));
priceInput.addEventListener("input", calcCost);

bindSliderNumber(liftP, liftPNumber, calcTdh);
bindSliderNumber(liftL, liftLNumber, calcTdh);
bindSliderNumber(boosterPout, boosterPoutNumber, calcTdh);
bindSliderNumber(boosterPin, boosterPinNumber, calcTdh);
bindSliderNumber(powerQ, powerQNumber, calcPower);
bindSliderNumber(powerEp, powerEpNumber, calcPower);

updateTdhModeVisibility();
updateUnitLabels();
calcTdh();
