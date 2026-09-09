// Shared soil reference data for ASM 3150/5150 tools.
// Source: Table 2.3, "Example values of soil water characteristics for
// various soil textures," Eisenhauer, Martin, Heeren, & Hoffman (2021),
// Irrigation Systems Management, ASABE. Values are dimensionless volumetric
// water content (cm3/cm3, in/in, or m/m). AWC = fc - wp (verified to match
// the printed AWC column for every row).
//
// The textbook's own footnote: "Example values are given. You can expect
// considerable variation from these values within each soil texture." These
// are planning-level defaults, not a substitute for site-specific fc/wp
// measurements.

const SOIL_TEXTURES = [
  { key: "coarse-sand",     label: "Coarse sand",                 fc: 0.10, wp: 0.05 },
  { key: "sand",            label: "Sand",                        fc: 0.15, wp: 0.07 },
  { key: "loamy-sand",      label: "Loamy sand",                  fc: 0.18, wp: 0.07 },
  { key: "sandy-loam",      label: "Sandy loam",                  fc: 0.20, wp: 0.08 },
  { key: "loam",            label: "Loam",                        fc: 0.25, wp: 0.10 },
  { key: "silt-loam",       label: "Silt loam",                   fc: 0.30, wp: 0.12 },
  { key: "silty-clay-loam", label: "Silty clay loam",             fc: 0.38, wp: 0.22 },
  { key: "clay-loam",       label: "Clay loam",                   fc: 0.40, wp: 0.25 },
  { key: "silty-clay",      label: "Silty clay",                  fc: 0.40, wp: 0.27 },
  { key: "clay",            label: "Clay",                        fc: 0.40, wp: 0.28 },
];

function soilTextureByKey(key) {
  return SOIL_TEXTURES.find((t) => t.key === key) || null;
}

// Fill a <select> with soil textures (value = key). Returns the select.
function populateSoilTextureSelect(selectEl, includeBlankOption) {
  selectEl.innerHTML = "";
  if (includeBlankOption) {
    const blank = document.createElement("option");
    blank.value = "";
    blank.textContent = "— select a soil texture —";
    selectEl.appendChild(blank);
  }
  SOIL_TEXTURES.forEach((t) => {
    const opt = document.createElement("option");
    opt.value = t.key;
    opt.textContent = t.label;
    selectEl.appendChild(opt);
  });
  return selectEl;
}
