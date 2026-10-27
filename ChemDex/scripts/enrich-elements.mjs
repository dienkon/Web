import fs from "node:fs";
const file = "shared/elements.json",
  elements = JSON.parse(fs.readFileSync(file, "utf8"));
const properties = JSON.parse(
  fs
    .readFileSync("shared/element-properties.json", "utf8")
    .replace(/^\uFEFF/, ""),
);
for (const e of elements) {
  const p = properties.elements.find((p) => p.z === e.z);
  if (!p) continue;
  if ((e.mass === null || e.mass <= 0) && Number.isFinite(p.mass))
    e.mass = p.mass;
  e.atomicRadius = Number.isFinite(p.atomicRadius) ? p.atomicRadius : null;
  e.ionizationEnergy = Number.isFinite(p.ionizationEnergy)
    ? p.ionizationEnergy
    : null;
  if (e.meltingPoint === null && Number.isFinite(p.meltingPoint_K))
    e.meltingPoint = Number((p.meltingPoint_K - 273.15).toFixed(3));
  if (e.electronegativity === null && Number.isFinite(p.electronegativity))
    e.electronegativity = p.electronegativity;
  e.propertySource = {
    dataset: properties.source,
    license: properties.licenseUrl,
    original: p.source,
    radiusKind: "empirical",
    ionizationEnergyKind: "first",
  };
}
fs.writeFileSync(file, JSON.stringify(elements, null, 2) + "\n");
console.log(
  `Property maps: radius ${elements.filter((e) => e.atomicRadius !== null).length}, ionization ${elements.filter((e) => e.ionizationEnergy !== null).length}`,
);
