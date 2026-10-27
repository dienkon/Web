import fs from "node:fs";
import { build } from "esbuild";
const { outputFiles } = await build({
  entryPoints: ["lab-2d/src/data/periodicTable.ts"],
  bundle: true,
  write: false,
  platform: "node",
  format: "esm",
});
const { PERIODIC_ELEMENTS: previous } = await import(
  `data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString("base64")}`
);
const manifest = JSON.parse(fs.readFileSync("data/manifest.json", "utf8"));
const categoryMap = {
  kiem: "alkali",
  "kiem-tho": "alkaline_earth",
  "kim-loai-chuyen-tiep": "transition_metal",
  "kim-loai-sau-chuyen-tiep": "post_transition",
  "a-kim": "metalloid",
  "phi-kim": "reactive_nonmetal",
  halogen: "halogen",
  "khi-hiem": "noble_gas",
  lanthanide: "lanthanide",
  actinide: "actinide",
};
const numeric = (value) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;
const parseValue = (value) => {
  if (typeof value === "number") return value;
  const s = String(value ?? "").replaceAll("−", "-");
  if (!/^\s*[+-]?\d/.test(s) || /dự đoán|ước tính|khoảng/i.test(s)) return null;
  return Number.parseFloat(s);
};
const elements = manifest.map((meta) => {
  const file = `data/${meta.file}`,
    raw = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {},
    g = raw.general ?? {},
    old = previous.find((e) => e.z === meta.number),
    z = meta.number;
  const f = (z >= 57 && z <= 71) || (z >= 89 && z <= 103);
  const category =
    z >= 57 && z <= 71
      ? "lanthanide"
      : z >= 89 && z <= 103
        ? "actinide"
        : (old?.category ??
          categoryMap[raw.category ?? meta.category] ??
          "post_transition");
  const group = Number(g.group) || old?.group || (f ? 3 : null),
    period =
      Number(g.period) ||
      old?.period ||
      (z <= 2
        ? 1
        : z <= 10
          ? 2
          : z <= 18
            ? 3
            : z <= 36
              ? 4
              : z <= 54
                ? 5
                : z <= 86
                  ? 6
                  : 7);
  const gas = [1, 2, 7, 8, 9, 10, 17, 18, 36, 54, 86].includes(z),
    state = g.state || null;
  return {
    z,
    symbol: meta.symbol,
    name_vi: old?.name_vi ?? raw.nameVi ?? meta.nameVi ?? meta.nameEn,
    name_en: raw.nameEn ?? g.englishName ?? meta.nameEn,
    mass: numeric(raw.mass) ?? old?.mass ?? null,
    period,
    group,
    category,
    block: f ? "f" : group <= 2 || z === 2 ? "s" : group >= 13 ? "p" : "d",
    electronConfig: g.electronConfig || old?.electronConfig || null,
    electronegativity:
      parseValue(g.electronegativity) ?? old?.electronegativity ?? null,
    oxidationStates: old?.oxidationStates ?? [],
    oxidationText: g.oxidation ?? null,
    phase_STP:
      old?.phase_STP ??
      (z >= 104
        ? "unknown"
        : gas
          ? "gas"
          : [35, 80].includes(z)
            ? "liquid"
            : "solid"),
    stateNote: state,
    meltingPoint: parseValue(g.meltingPoint),
    atomicRadius: parseValue(g.atomicRadius ?? raw.atomicRadius),
    ionizationEnergy: parseValue(g.ionizationEnergy ?? raw.ionizationEnergy),
    xpos: f ? z - (z <= 71 ? 57 : 89) + 4 : group,
    ypos: f ? (z <= 71 ? 9 : 10) : period,
    sourceFile: `/${file}`,
    sources: raw.sources ?? [
      {
        title: "Dữ liệu nguyên tố ChemDex",
        url: `/nguyen-to.html?element=${meta.symbol}`,
      },
    ],
    applications:
      typeof raw.applications === "string" ? raw.applications : null,
  };
});
if (elements.length !== 118 || new Set(elements.map((e) => e.z)).size !== 118)
  throw new Error("Expected 118 unique elements");
fs.mkdirSync("shared", { recursive: true });
fs.writeFileSync(
  "shared/elements.json",
  JSON.stringify(elements, null, 2) + "\n",
);
console.log(`Generated ${elements.length} shared elements`);
