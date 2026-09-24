// Peak Daily ET & Net System Capacity calculator (Textbook Table 5.3, Eq. 5.20)
// Step 1: AD = AWC(in/ft) * root depth(ft) * allowable fraction depleted
// Step 2: bilinear interpolation of Table 5.3 (rows = AD, columns = max monthly ET)
// Step 3: Cg = Cn / [(ELQ/100)*(1-Dt/100)]  (Eq. 5.20), then convert to gpm/ac

// Table 5.3: Peak daily crop ET (in/d) by allowable depletion (in, rows) and
// maximum monthly crop ET (in/mo, columns). Columns are NOT evenly spaced (5 to 6 is
// a full inch, the rest are 0.5-in steps) - interpolation must use actual values.
const T53_COLUMNS = [5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12];
const T53_ROWS = [1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0];
const T53_DATA = [
  [.20, .24, .26, .28, .31, .33, .35, .37, .40, .42, .44, .46, .49, .51],
  [.19, .23, .25, .27, .29, .32, .34, .36, .38, .41, .43, .45, .47, .50],
  [.18, .23, .25, .27, .29, .31, .33, .35, .37, .39, .41, .44, .46, .48],
  [.18, .22, .24, .26, .28, .30, .32, .34, .36, .39, .41, .43, .45, .47],
  [.18, .22, .24, .26, .28, .30, .32, .34, .36, .38, .40, .42, .44, .46],
  [.18, .21, .23, .25, .27, .29, .31, .33, .35, .37, .39, .41, .44, .46],
  [.17, .21, .23, .25, .27, .29, .31, .33, .35, .37, .39, .41, .43, .45],
  [.17, .21, .23, .25, .27, .29, .31, .33, .35, .37, .39, .41, .43, .45],
  [.17, .21, .23, .25, .26, .28, .30, .32, .34, .36, .38, .40, .42, .44],
  [.17, .21, .22, .24, .26, .28, .30, .32, .34, .36, .38, .40, .42, .44],
  [.17, .20, .22, .24, .26, .28, .30, .32, .34, .36, .38, .40, .41, .43],
];

// 1D piecewise-linear interpolation over irregularly spaced x-values.
// Returns {value, outOfRange}; out-of-range values are clamped to the nearest endpoint.
function interp1D(x, xs, ys) {
  if (x <= xs[0]) return { value: ys[0], outOfRange: x < xs[0] };
  const last = xs.length - 1;
  if (x >= xs[last]) return { value: ys[last], outOfRange: x > xs[last] };
  for (let i = 0; i < last; i++) {
    if (x >= xs[i] && x <= xs[i + 1]) {
      const frac = (x - xs[i]) / (xs[i + 1] - xs[i]);
      return { value: ys[i] + frac * (ys[i + 1] - ys[i]), outOfRange: false };
    }
  }
  return { value: NaN, outOfRange: true };
}

function lookupETd(ad, maxET) {
  const adClamped = Math.min(Math.max(ad, T53_ROWS[0]), T53_ROWS[T53_ROWS.length - 1]);
  const adOutOfRange = ad < T53_ROWS[0] || ad > T53_ROWS[T53_ROWS.length - 1];

  // Find bracketing rows for AD, interpolate each along columns (maxET), then
  // interpolate between the two row-results along AD.
  let rowLo = 0;
  for (let i = 0; i < T53_ROWS.length - 1; i++) {
    if (adClamped >= T53_ROWS[i] && adClamped <= T53_ROWS[i + 1]) { rowLo = i; break; }
    if (adClamped >= T53_ROWS[T53_ROWS.length - 1]) rowLo = T53_ROWS.length - 2;
  }
  const rowHi = Math.min(rowLo + 1, T53_ROWS.length - 1);

  const resLo = interp1D(maxET, T53_COLUMNS, T53_DATA[rowLo]);
  const resHi = interp1D(maxET, T53_COLUMNS, T53_DATA[rowHi]);
  const etOutOfRange = resLo.outOfRange || resHi.outOfRange;

  const adFrac = T53_ROWS[rowHi] === T53_ROWS[rowLo] ? 0 : (adClamped - T53_ROWS[rowLo]) / (T53_ROWS[rowHi] - T53_ROWS[rowLo]);
  const value = resLo.value + adFrac * (resHi.value - resLo.value);

  return { value, outOfRange: adOutOfRange || etOutOfRange };
}

const awcValue = document.getElementById("awc-value");
const rootDepth = document.getElementById("root-depth");
const fractionDepleted = document.getElementById("fraction-depleted");
const adResult = document.getElementById("ad-result");
const adInput = document.getElementById("ad-input");

const maxMonthlyET = document.getElementById("max-monthly-et");
const table53Warning = document.getElementById("table53-warning");
const etdResult = document.getElementById("etd-result");
const cnInput = document.getElementById("cn-input");

const elqInput = document.getElementById("elq-input");
const dtInput = document.getElementById("dt-input");
const statsGrid = document.getElementById("stats-grid");

function tile(value, label, primary) {
  return '<div class="stat-tile' + (primary ? " stat-tile--primary" : "") + '"><div class="stat-tile__value">' +
    value + '</div><div class="stat-tile__label">' + label + '</div></div>';
}

function calculateAD() {
  const awc = parseFloat(awcValue.value);
  const rd = parseFloat(rootDepth.value);
  const frac = parseFloat(fractionDepleted.value) / 100;
  if (isNaN(awc) || isNaN(rd) || isNaN(frac)) {
    adResult.textContent = "—";
    return;
  }
  const AD = awc * rd * frac;
  adResult.textContent = formatNumber(AD) + " in";
  adInput.value = formatNumber(AD);
  calculateETd();
}

function calculateETd() {
  table53Warning.innerHTML = "";
  const AD = parseFloat(adInput.value);
  const maxET = parseFloat(maxMonthlyET.value);
  if (isNaN(AD) || isNaN(maxET)) {
    etdResult.textContent = "—";
    return;
  }
  const { value, outOfRange } = lookupETd(AD, maxET);
  etdResult.textContent = formatNumber(value) + " in/d";
  cnInput.value = formatNumber(value);
  if (outOfRange) {
    table53Warning.innerHTML = '<div class="warning-box">One or both inputs fall outside Table 5.3\'s ' +
      'documented range (AD: 1.0-6.0 in; max monthly ET: 5-12 in/mo). The value shown is clamped to the ' +
      'nearest edge of the table and may not be reliable.</div>';
  }
  calculateCg();
}

function calculateCg() {
  const Cn = parseFloat(cnInput.value);
  const ELQ = parseFloat(elqInput.value) / 100;
  const Dt = parseFloat(dtInput.value) / 100;

  if (isNaN(Cn) || isNaN(ELQ) || isNaN(Dt) || ELQ <= 0 || Dt >= 1) {
    statsGrid.innerHTML = tile("—", "Enter values above");
    return;
  }

  const Cg_in_per_day = Cn / (ELQ * (1 - Dt));

  // 1 in/d over 1 ac = 1 ac-in/d, converted to gpm via the shared precise factor.
  const gpm_per_acin_per_day = convertValue("flow", "ac-in/hr", "gpm", 1) / 24;
  const Cg_gpm_per_ac = Cg_in_per_day * gpm_per_acin_per_day;
  const Cn_gpm_per_ac = Cn * gpm_per_acin_per_day;

  statsGrid.innerHTML =
    tile(formatNumber(Cg_in_per_day) + " in/d", "Gross system capacity (C<sub>g</sub>)", true) +
    tile(formatNumber(Cg_gpm_per_ac) + " gpm/ac", "C<sub>g</sub> as a flow rate", true) +
    tile(formatNumber(Cn_gpm_per_ac) + " gpm/ac", "C<sub>n</sub> as a flow rate (for reference)");
}

[awcValue, rootDepth, fractionDepleted].forEach((el) => el.addEventListener("input", calculateAD));
[adInput, maxMonthlyET].forEach((el) => el.addEventListener("input", calculateETd));
[elqInput, dtInput].forEach((el) => el.addEventListener("input", calculateCg));
cnInput.addEventListener("input", calculateCg);

calculateAD();
