// Shared unit-conversion data for all ASM 3150/5150 tools.
// Each category has a base unit; every unit stores its factor to convert
// TO that base unit (value_in_base = value * toBase). Converting between
// any two units in a category goes unit -> base -> unit.
// Factors are precise (not the rounded classroom values in the textbook's
// conversion table) so that chained/rearranged calculations stay accurate.

const UNIT_CATEGORIES = {
  volume: {
    label: "Volume",
    baseLabel: "liters (L)",
    units: {
      "gal":   { label: "Gallons (gal)",             toBase: 3.785411784 },
      "ft3":   { label: "Cubic feet (ft³)",          toBase: 28.316846592 },
      "ac-in": { label: "Acre-inches (ac-in)",       toBase: 102790.153 },
      "ac-ft": { label: "Acre-feet (ac-ft)",         toBase: 1233481.84 },
      "L":     { label: "Liters (L)",                toBase: 1 },
      "cm3":   { label: "Cubic centimeters (cm³)",   toBase: 0.001 },
      "m3":    { label: "Cubic meters (m³)",         toBase: 1000 },
      "ha-cm": { label: "Hectare-centimeters (ha-cm)", toBase: 100000 },
    },
  },
  flow: {
    label: "Flow",
    baseLabel: "liters per second (L/s)",
    units: {
      "cfs":      { label: "Cubic feet per second (cfs)",     toBase: 28.316846592 },
      "gpm":      { label: "Gallons per minute (gpm)",        toBase: 0.0630901964 },
      "ac-in/hr": { label: "Acre-inches per hour (ac-in/hr)", toBase: 28.55282028 },
      "cms":      { label: "Cubic meters per second (cms)",   toBase: 1000 },
      "L/s":      { label: "Liters per second (L/s)",         toBase: 1 },
      "gal/h":    { label: "Gallons per hour (gal/h)",        toBase: 0.0010514477 },
    },
  },
  length: {
    label: "Length",
    baseLabel: "meters (m)",
    units: {
      "in":   { label: "Inches (in)",       toBase: 0.0254 },
      "ft":   { label: "Feet (ft)",         toBase: 0.3048 },
      "mile": { label: "Miles (mile)",      toBase: 1609.344 },
      "rod":  { label: "Rods (rod)",        toBase: 5.0292 },
      "mm":   { label: "Millimeters (mm)",  toBase: 0.001 },
      "cm":   { label: "Centimeters (cm)",  toBase: 0.01 },
      "m":    { label: "Meters (m)",        toBase: 1 },
      "km":   { label: "Kilometers (km)",   toBase: 1000 },
    },
  },
  area: {
    label: "Area",
    baseLabel: "square meters (m²)",
    units: {
      "ac":  { label: "Acres (ac)",             toBase: 4046.8564224 },
      "ft2": { label: "Square feet (ft²)",      toBase: 0.09290304 },
      "ha":  { label: "Hectares (ha)",          toBase: 10000 },
      "m2":  { label: "Square meters (m²)",     toBase: 1 },
    },
  },
  time: {
    label: "Time",
    baseLabel: "seconds (s)",
    units: {
      "s":   { label: "Seconds (s)", toBase: 1 },
      "min": { label: "Minutes (min)", toBase: 60 },
      "hr":  { label: "Hours (hr)", toBase: 3600 },
      "day": { label: "Days (day)", toBase: 86400 },
    },
  },
  velocity: {
    label: "Velocity",
    baseLabel: "meters per second (m/s)",
    units: {
      "ft/s": { label: "Feet per second (ft/s)",  toBase: 0.3048 },
      "m/s":  { label: "Meters per second (m/s)", toBase: 1 },
    },
  },
  mass: {
    label: "Mass",
    baseLabel: "grams (g)",
    units: {
      "g":  { label: "Grams (g)",     toBase: 1 },
      "kg": { label: "Kilograms (kg)", toBase: 1000 },
      "lb": { label: "Pounds (lb)",   toBase: 453.59237 },
    },
  },
};

// Convert a value from one unit to another within the same category.
function convertValue(categoryKey, fromUnit, toUnit, value) {
  const cat = UNIT_CATEGORIES[categoryKey];
  const from = cat.units[fromUnit];
  const to = cat.units[toUnit];
  return (value * from.toBase) / to.toBase;
}

// Convert a value in a given unit to the category's base unit.
function toBaseValue(categoryKey, unit, value) {
  return value * UNIT_CATEGORIES[categoryKey].units[unit].toBase;
}

// Convert a value in the category's base unit to a given unit.
function fromBaseValue(categoryKey, unit, valueInBase) {
  return valueInBase / UNIT_CATEGORIES[categoryKey].units[unit].toBase;
}

// Format a number for display: fewer decimals for large values, more for
// small ones, with thousands separators.
function formatNumber(n) {
  if (n === null || n === undefined || !isFinite(n)) return "—";
  if (n === 0) return "0";
  const abs = Math.abs(n);
  let decimals;
  if (abs >= 1000) decimals = 2;
  else if (abs >= 1) decimals = 4;
  else decimals = 6;
  let s = n.toFixed(decimals);
  s = s.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
  const parts = s.split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}

// Fill a <select> with the units of a category. Returns the select.
function populateUnitSelect(selectEl, categoryKey, defaultUnit) {
  const cat = UNIT_CATEGORIES[categoryKey];
  selectEl.innerHTML = "";
  Object.keys(cat.units).forEach((key) => {
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = cat.units[key].label;
    selectEl.appendChild(opt);
  });
  if (defaultUnit && cat.units[defaultUnit]) selectEl.value = defaultUnit;
  return selectEl;
}
