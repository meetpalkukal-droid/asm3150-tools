// Shared salinity reference data for ASM 3150/5150 tools.
// Source: Chapter 7 "Salinity Management," Eisenhauer, Martin, Heeren, &
// Hoffman (2021), Irrigation Systems Management, ASABE.

// Table 7.2. Salt tolerance of major crops (adapted from Maas & Hoffman,
// 1977). T = salt tolerance threshold (ECe, dS/m), S = percent yield
// decline per dS/m above threshold. rating: s=sensitive, ms=moderately
// sensitive, mt=moderately tolerant, t=tolerant.
const CROP_SALT_TOLERANCE = [
  // Grain crops
  { key: "barley", label: "Barley", category: "Grain Crops", T: 8.0, S: 5.0, rating: "t" },
  { key: "corn", label: "Corn", category: "Grain Crops", T: 1.7, S: 12, rating: "ms" },
  { key: "cowpea", label: "Cowpea", category: "Grain Crops", T: 4.9, S: 12, rating: "mt" },
  { key: "rice", label: "Rice", category: "Grain Crops", T: 3.0, S: 12, rating: "s" },
  { key: "sorghum", label: "Sorghum", category: "Grain Crops", T: 6.8, S: 16, rating: "mt" },
  { key: "soybean", label: "Soybean", category: "Grain Crops", T: 5.0, S: 20, rating: "mt" },
  { key: "wheat", label: "Wheat", category: "Grain Crops", T: 6.0, S: 7.1, rating: "mt" },
  // Fiber, sugar and oil crops
  { key: "cotton", label: "Cotton", category: "Fiber, Sugar & Oil Crops", T: 7.7, S: 5.2, rating: "t" },
  { key: "flax", label: "Flax", category: "Fiber, Sugar & Oil Crops", T: 1.7, S: 12, rating: "ms" },
  { key: "peanut", label: "Peanut", category: "Fiber, Sugar & Oil Crops", T: 3.2, S: 29, rating: "ms" },
  { key: "sugar-beet", label: "Sugar beet", category: "Fiber, Sugar & Oil Crops", T: 7.0, S: 5.9, rating: "t" },
  { key: "sugar-cane", label: "Sugar cane", category: "Fiber, Sugar & Oil Crops", T: 1.7, S: 5.9, rating: "ms" },
  // Grasses and forage crops
  { key: "alfalfa", label: "Alfalfa", category: "Grasses & Forage Crops", T: 2.0, S: 7.3, rating: "ms" },
  { key: "bermuda-grass", label: "Bermuda grass", category: "Grasses & Forage Crops", T: 6.9, S: 6.4, rating: "t" },
  { key: "clover", label: "Clover", category: "Grasses & Forage Crops", T: 1.5, S: 12, rating: "ms" },
  { key: "fescue", label: "Fescue", category: "Grasses & Forage Crops", T: 3.9, S: 5.3, rating: "mt" },
  { key: "orchard-grass", label: "Orchard grass", category: "Grasses & Forage Crops", T: 1.5, S: 6.2, rating: "ms" },
  { key: "ryegrass", label: "Ryegrass", category: "Grasses & Forage Crops", T: 5.6, S: 7.6, rating: "mt" },
  { key: "trefoil-birdsfoot", label: "Trefoil, birdsfoot", category: "Grasses & Forage Crops", T: 5.0, S: 10, rating: "mt" },
  // Vegetables and fruit crops
  { key: "asparagus", label: "Asparagus", category: "Vegetables & Fruit Crops", T: 4.1, S: 2.0, rating: "t" },
  { key: "bean", label: "Bean", category: "Vegetables & Fruit Crops", T: 1.0, S: 19, rating: "s" },
  { key: "cabbage", label: "Cabbage", category: "Vegetables & Fruit Crops", T: 1.8, S: 9.7, rating: "ms" },
  { key: "carrot", label: "Carrot", category: "Vegetables & Fruit Crops", T: 1.0, S: 14, rating: "s" },
  { key: "celery", label: "Celery", category: "Vegetables & Fruit Crops", T: 1.8, S: 6.2, rating: "ms" },
  { key: "corn-sweet", label: "Corn, sweet", category: "Vegetables & Fruit Crops", T: 1.7, S: 12, rating: "ms" },
  { key: "lettuce", label: "Lettuce", category: "Vegetables & Fruit Crops", T: 1.3, S: 13, rating: "ms" },
  { key: "potato", label: "Potato", category: "Vegetables & Fruit Crops", T: 1.7, S: 12, rating: "ms" },
  { key: "strawberry", label: "Strawberry", category: "Vegetables & Fruit Crops", T: 1.0, S: 33, rating: "s" },
  { key: "sweet-potato", label: "Sweet potato", category: "Vegetables & Fruit Crops", T: 1.5, S: 11, rating: "ms" },
  { key: "tomato", label: "Tomato", category: "Vegetables & Fruit Crops", T: 2.5, S: 9.9, rating: "ms" },
  // Woody crops
  { key: "almond", label: "Almond", category: "Woody Crops", T: 1.5, S: 19, rating: "s" },
  { key: "apricot", label: "Apricot", category: "Woody Crops", T: 1.6, S: 24, rating: "s" },
  { key: "blackberry", label: "Blackberry", category: "Woody Crops", T: 1.5, S: 22, rating: "s" },
  { key: "date-palm", label: "Date palm", category: "Woody Crops", T: 4.0, S: 3.6, rating: "t" },
  { key: "grape", label: "Grape", category: "Woody Crops", T: 1.5, S: 9.6, rating: "ms" },
  { key: "grapefruit", label: "Grapefruit", category: "Woody Crops", T: 1.8, S: 16, rating: "s" },
  { key: "guayule", label: "Guayule", category: "Woody Crops", T: 15, S: 13, rating: "t" },
  { key: "orange", label: "Orange", category: "Woody Crops", T: 1.7, S: 16, rating: "s" },
  { key: "peach", label: "Peach", category: "Woody Crops", T: 1.7, S: 21, rating: "s" },
  { key: "plum", label: "Plum", category: "Woody Crops", T: 2.6, S: 31, rating: "s" },
];

const SALT_TOLERANCE_RATING_LABEL = { s: "sensitive", ms: "moderately sensitive", mt: "moderately tolerant", t: "tolerant" };

function cropSaltToleranceByKey(key) {
  return CROP_SALT_TOLERANCE.find((c) => c.key === key) || null;
}

// Fill a <select> with crops (value = key), grouped by category like Table 7.2.
function populateCropSelect(selectEl, includeBlankOption) {
  selectEl.innerHTML = "";
  if (includeBlankOption) {
    const blank = document.createElement("option");
    blank.value = "";
    blank.textContent = "— select a crop —";
    selectEl.appendChild(blank);
  }
  const categories = [...new Set(CROP_SALT_TOLERANCE.map((c) => c.category))];
  categories.forEach((cat) => {
    const group = document.createElement("optgroup");
    group.label = cat;
    CROP_SALT_TOLERANCE.filter((c) => c.category === cat).forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.key;
      opt.textContent = c.label;
      group.appendChild(opt);
    });
    selectEl.appendChild(group);
  });
  return selectEl;
}

// Eq. 7.3: Yr = 100 - S*(ECe - T) for ECe > T, else Yr = 100.
function relativeYield(ECe, T, S) {
  if (ECe <= T) return 100;
  return Math.max(0, 100 - S * (ECe - T));
}

// Table 7.3. Classification guide for saline irrigation water.
const WATER_QUALITY_CLASSES = [
  { label: "Fresh", ecMax: 0.5, ppmMax: 300, problems: "none" },
  { label: "Slightly saline", ecMax: 1, ppmMax: 600, problems: "rare" },
  { label: "Moderately saline", ecMax: 2, ppmMax: 1200, problems: "occasional" },
  { label: "Saline", ecMax: 4, ppmMax: 2400, problems: "common" },
  { label: "Highly saline", ecMax: 7, ppmMax: 4800, problems: "severe" },
];

function classifyWaterQuality(EC) {
  for (const c of WATER_QUALITY_CLASSES) {
    if (EC < c.ecMax) return c;
  }
  return { label: "Very highly saline", ecMax: Infinity, ppmMax: Infinity, problems: "severe — beyond Table 7.3's range" };
}

// Figure 7.10. Division of waters that cause inadequate water penetration
// because of chemical conditions (adapted from Rhoades, 1982). Digitized
// directly from the published figure (400 DPI page render, sub-pixel
// least-squares line fits, residuals < 0.3 SAR units) since the chart has
// no printed equation. Two boundary lines separate three zones:
//   SAR > lineA(ECa): severe reduction in infiltration
//   lineB(ECa) < SAR <= lineA(ECa): slight to moderate reduction
//   SAR <= lineB(ECa): no reduction
function sodicityLineA(ECa) {
  // kink at (ECa=0.504, SAR=9.23)
  if (ECa <= 0.504) return Math.max(0, 22.364 * ECa - 2.043);
  return 8.846 * ECa + 4.770;
}
function sodicityLineB(ECa) {
  return Math.max(0, 6.868 * ECa - 3.615);
}
function classifySodicity(ECa, SAR) {
  const a = sodicityLineA(ECa);
  const b = sodicityLineB(ECa);
  if (SAR > a) return { zone: "severe", label: "Severe reduction in infiltration likely" };
  if (SAR > b) return { zone: "moderate", label: "Slight to moderate reduction in infiltration likely" };
  return { zone: "none", label: "No reduction in infiltration expected" };
}

// Figure 7.11. Graphical solution for the leaching requirement (Lr) as a
// function of the salinity of the applied water (ECa) and the crop salt
// tolerance threshold (T) (adapted from Hoffman & van Genuchten, 1983).
// Every Lr curve is a straight line through the origin, so Lr depends only
// on the ratio r = T/ECa. Digitized the same way as Figure 7.10 (five
// labeled curves, sub-pixel fits, residuals < 0.02 T units); verified
// against the book's own Example 7.5 (ECa=2.4, T=2.5 -> Lr=0.17): this
// model gives 0.175, and the two surrounding digitized curves (0.15 and
// 0.20) correctly bracket the example's ratio.
const LEACHING_REQUIREMENT_ANCHORS = [
  { Lr: 0.05, slope: 3.3854 },
  { Lr: 0.10, slope: 1.9338 },
  { Lr: 0.15, slope: 1.2346 },
  { Lr: 0.20, slope: 0.8555 },
  { Lr: 0.30, slope: 0.4208 },
];

function leachingRequirement(ECa, T) {
  if (!(ECa > 0)) return null;
  const r = T / ECa;
  const anchors = LEACHING_REQUIREMENT_ANCHORS;
  if (r >= anchors[0].slope) {
    return { Lr: anchors[0].Lr, extrapolated: "below", note: "Below the lowest curve on Figure 7.11 (Lr=0.05) — leaching requirement is minimal." };
  }
  if (r <= anchors[anchors.length - 1].slope) {
    return { Lr: anchors[anchors.length - 1].Lr, extrapolated: "above", note: "Beyond the highest curve on Figure 7.11 (Lr=0.30) — this water/crop combination may not be practical to manage by leaching alone." };
  }
  for (let i = 0; i < anchors.length - 1; i++) {
    const hi = anchors[i], lo = anchors[i + 1];
    if (r <= hi.slope && r >= lo.slope) {
      const frac = (hi.slope - r) / (hi.slope - lo.slope);
      const Lr = hi.Lr + frac * (lo.Lr - hi.Lr);
      return { Lr, extrapolated: null, note: null };
    }
  }
  return null;
}

// Eq. 7.9/7.10. Reclamation of saline soils by leaching: dL = K * ds * (Co/Cf).
// K depends on soil type for continuous ponding; for intermittent ponding
// or sprinkling, the text notes "the effect of soil type is minimal" and
// uses K=0.10 regardless of texture (as in Example 7.6).
const RECLAMATION_K_PONDING = [
  { key: "peat", label: "Organic (peat)", K: 0.45 },
  { key: "clay-loam", label: "Fine-textured (e.g. clay loam)", K: 0.30 },
  { key: "sandy-loam", label: "Coarse-textured (e.g. sandy loam)", K: 0.10 },
];
const RECLAMATION_K_SPRINKLING = 0.10;

function populateReclamationTextureSelect(selectEl) {
  selectEl.innerHTML = "";
  RECLAMATION_K_PONDING.forEach((t) => {
    const opt = document.createElement("option");
    opt.value = t.key;
    opt.textContent = t.label + " (K=" + t.K.toFixed(2) + ")";
    selectEl.appendChild(opt);
  });
  return selectEl;
}
function reclamationKByKey(key) {
  return (RECLAMATION_K_PONDING.find((t) => t.key === key) || RECLAMATION_K_PONDING[1]).K;
}
