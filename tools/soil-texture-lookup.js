// Soil Texture Water Characteristics lookup (Table 2.3)

const textureSelect = document.getElementById("texture-select");
const fcValue = document.getElementById("fc-value");
const wpValue = document.getElementById("wp-value");
const awcValue = document.getElementById("awc-value");
const tableBody = document.getElementById("texture-table-body");
const useInScheduling = document.getElementById("use-in-scheduling");

populateSoilTextureSelect(textureSelect, false);

SOIL_TEXTURES.forEach((t) => {
  const tr = document.createElement("tr");
  tr.innerHTML =
    "<td>" + t.label + "</td>" +
    "<td>" + t.fc.toFixed(2) + "</td>" +
    "<td>" + t.wp.toFixed(2) + "</td>" +
    "<td>" + (t.fc - t.wp).toFixed(2) + "</td>";
  tableBody.appendChild(tr);
});

function update() {
  const t = soilTextureByKey(textureSelect.value);
  if (!t) return;
  fcValue.textContent = t.fc.toFixed(2);
  wpValue.textContent = t.wp.toFixed(2);
  awcValue.textContent = (t.fc - t.wp).toFixed(2);
  useInScheduling.href = "soil-water-depletion-scheduling.html?fc=" + t.fc + "&wp=" + t.wp;
}

textureSelect.addEventListener("change", update);
textureSelect.value = "silt-loam";
update();
