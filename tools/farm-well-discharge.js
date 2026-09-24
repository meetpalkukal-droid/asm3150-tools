// Gross Capacity & Farm Well Discharge calculator (Textbook Eq. 5.20, 5.21, Example 5.8)
// Cg = Cn / [(ELQ/100)*(1-Dt/100)]
// Qf_field = Cg * Area / (Ec_field/100)
// Qwell = sum(Qf_field) / (Ec_main/100)

const cnValue = document.getElementById("cn-value");
const elqValue = document.getElementById("elq-value");
const dtValue = document.getElementById("dt-value");
const cgResult = document.getElementById("cg-result");

const fieldsContainer = document.getElementById("fields-container");
const mainEc = document.getElementById("main-ec");
const statsGrid = document.getElementById("stats-grid");

let fields = [
  { area: 80, ec: 80 },
  { area: 80, ec: 90 },
];

function renderFields() {
  fieldsContainer.innerHTML = "";
  fields.forEach((f, i) => {
    const row = document.createElement("div");
    row.className = "field-row";
    row.innerHTML =
      '<div class="field-row__label">F' + (i + 1) + '</div>' +
      '<div><input type="number" step="any" class="field-area" value="' + f.area + '"></div>' +
      '<div><input type="number" step="any" class="field-ec" value="' + f.ec + '"></div>' +
      '<div class="field-discharge" style="font-weight:700;">&mdash;</div>' +
      '<div class="row-remove"><button type="button" title="Remove field">&times;</button></div>';
    row.querySelector(".field-area").addEventListener("input", (e) => {
      fields[i].area = parseFloat(e.target.value);
      calculate();
    });
    row.querySelector(".field-ec").addEventListener("input", (e) => {
      fields[i].ec = parseFloat(e.target.value);
      calculate();
    });
    row.querySelector(".row-remove button").addEventListener("click", () => {
      if (fields.length <= 1) return;
      fields.splice(i, 1);
      renderFields();
      calculate();
    });
    fieldsContainer.appendChild(row);
  });
}

document.getElementById("add-field").addEventListener("click", () => {
  fields.push({ area: 80, ec: 90 });
  renderFields();
  calculate();
});

function tile(value, label, primary) {
  return '<div class="stat-tile' + (primary ? " stat-tile--primary" : "") + '"><div class="stat-tile__value">' +
    value + '</div><div class="stat-tile__label">' + label + '</div></div>';
}

function calculate() {
  const Cn = parseFloat(cnValue.value);
  const ELQ = parseFloat(elqValue.value) / 100;
  const Dt = parseFloat(dtValue.value) / 100;

  if (isNaN(Cn) || isNaN(ELQ) || isNaN(Dt) || ELQ <= 0 || Dt >= 1) {
    cgResult.textContent = "—";
    statsGrid.innerHTML = tile("—", "Enter values above");
    return;
  }

  const gpm_per_acin_per_day = convertValue("flow", "ac-in/hr", "gpm", 1) / 24;
  const Cg_gpm_per_ac = (Cn / (ELQ * (1 - Dt))) * gpm_per_acin_per_day;
  cgResult.textContent = formatNumber(Cg_gpm_per_ac) + " gpm/ac";

  const discharges = fieldsContainer.querySelectorAll(".field-discharge");
  let sumQf = 0;
  let anyInvalid = false;

  fields.forEach((f, i) => {
    const Ec = f.ec / 100;
    if (isNaN(f.area) || isNaN(Ec) || Ec <= 0) {
      discharges[i].textContent = "—";
      anyInvalid = true;
      return;
    }
    const Qg = Cg_gpm_per_ac * f.area;
    const Qf = Qg / Ec;
    sumQf += Qf;
    discharges[i].textContent = formatNumber(Qf) + " gpm";
  });

  if (anyInvalid) {
    statsGrid.innerHTML = tile("—", "Check field entries above");
    return;
  }

  const EcMain = parseFloat(mainEc.value) / 100;
  if (isNaN(EcMain) || EcMain <= 0) {
    statsGrid.innerHTML = tile("—", "Enter the main supply efficiency above");
    return;
  }
  const Qwell = sumQf / EcMain;

  statsGrid.innerHTML =
    tile(formatNumber(Qwell) + " gpm", "Well / main supply discharge needed", true) +
    tile(formatNumber(sumQf) + " gpm", "Sum of field discharges (before main-line loss)") +
    tile(fields.length, "Fields served");
}

[cnValue, elqValue, dtValue, mainEc].forEach((el) => el.addEventListener("input", calculate));

document.getElementById("load-example").addEventListener("click", () => {
  cnValue.value = 0.3;
  elqValue.value = 65;
  dtValue.value = 10;
  fields = [
    { area: 80, ec: 80 },
    { area: 80, ec: 90 },
  ];
  mainEc.value = 90;
  renderFields();
  calculate();
});

renderFields();
calculate();
