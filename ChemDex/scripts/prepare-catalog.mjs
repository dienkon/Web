import fs from "node:fs";
import { build } from "esbuild";
const load = async (file) => {
  const r = await build({
    entryPoints: [file],
    bundle: true,
    write: false,
    platform: "node",
    format: "esm",
  });
  return import(
    `data:text/javascript;base64,${Buffer.from(r.outputFiles[0].text).toString("base64")}`
  );
};
const { CHEMICAL_CATALOG: chemicals } = await load(
  "lab-2d/src/data/chemicals.ts",
);
const { parseChemicalFormula, computeMolarMass } = await load(
  "lab-2d/src/chemistry/core/formula.ts",
);
const canonical = (formula) =>
  JSON.stringify(
    Object.entries(parseChemicalFormula(formula)).sort(([a], [b]) =>
      a.localeCompare(b),
    ),
  );
const compounds = JSON.parse(
  fs.readFileSync("shared/compounds.json", "utf8").replace(/^\uFEFF/, ""),
).filter((c) => c.kind !== "crystal");
const report = [];
for (const c of compounds) {
  const raw = fs
    .readFileSync(`shared/structures/${c.cid}.sdf`, "utf8")
    .replace(/^\uFEFF/, "");
  const lines = raw.split(/\r?\n/),
    count = Number(lines[3].slice(0, 3));
  if (!count || !raw.includes("M  END"))
    throw new Error(`Invalid SDF: ${c.id}`);
  const atoms = {};
  for (const line of lines.slice(4, 4 + count)) {
    const element = line.slice(31, 34).trim();
    if (!element) throw new Error(`Missing atom: ${c.id}`);
    atoms[element] = (atoms[element] ?? 0) + 1;
    for (const offset of [0, 10, 20])
      if (!Number.isFinite(Number(line.slice(offset, offset + 10))))
        throw new Error(`Invalid coordinate ${c.id}`);
  }
  const actual = JSON.stringify(
    Object.entries(atoms).sort(([a], [b]) => a.localeCompare(b)),
  );
  if (actual !== canonical(c.formula))
    throw new Error(
      `Formula mismatch ${c.id}: ${actual} expected ${canonical(c.formula)}`,
    );
  c.molarMass = computeMolarMass(c.formula);
  c.atomCount = count;
  c.aliases.push(
    c.name_en
      .replace("ethylene", "ethene")
      .replace("propylene", "propene")
      .replace("acetylene", "ethyne"),
  );
  report.push({
    id: c.id,
    formula: c.formula,
    atoms: count,
    source: c.structure.source,
    check: "formula-and-finite-coordinates",
  });
}
for (const c of JSON.parse(fs.readFileSync("shared/crystals.json", "utf8"))) {
  c.molarMass = computeMolarMass(c.formula);
  compounds.push(c);
}
const decomposition = {
  HCl: ["H₃O⁺", "Cl⁻"],
  HNO3: ["H₃O⁺", "NO₃⁻"],
  H2SO4: ["H₃O⁺", "HSO₄⁻", "SO₄²⁻"],
  NaOH: ["Na⁺", "OH⁻"],
  KOH: ["K⁺", "OH⁻"],
  NaCl: ["Na⁺", "Cl⁻"],
  KCl: ["K⁺", "Cl⁻"],
  CuSO4: ["Cu²⁺", "SO₄²⁻"],
  Na2SO4: ["Na⁺", "SO₄²⁻"],
  BaCl2: ["Ba²⁺", "Cl⁻"],
  CaCl2: ["Ca²⁺", "Cl⁻"],
  AgNO3: ["Ag⁺", "NO₃⁻"],
  Pb_NO3_2: ["Pb²⁺", "NO₃⁻"],
  NH4Cl: ["NH₄⁺", "Cl⁻"],
  Na2CO3: ["Na⁺", "CO₃²⁻"],
  NaHCO3: ["Na⁺", "HCO₃⁻"],
  CH3COONa: ["Na⁺", "CH₃COO⁻"],
  FeCl3: ["Fe³⁺", "Cl⁻"],
  FeSO4: ["Fe²⁺", "SO₄²⁻"],
  AlCl3: ["Al³⁺", "Cl⁻"],
  ZnSO4: ["Zn²⁺", "SO₄²⁻"],
  NaBr: ["Na⁺", "Br⁻"],
  KI: ["K⁺", "I⁻"],
  KSCN: ["K⁺", "SCN⁻"],
  NaF: ["Na⁺", "F⁻"],
  Na2HPO4: ["Na⁺", "HPO₄²⁻"],
};
const ionIds = {
  "OH⁻": "cid-961",
  "NH₄⁺": "cid-223",
  "NO₃⁻": "cid-943",
  "SO₄²⁻": "cid-1117",
  "CO₃²⁻": "cid-19660",
  "HCO₃⁻": "cid-769",
  "NO₂⁻": "cid-946",
};
const coverage = chemicals.map((c) => {
  let match;
  try {
    const candidates = compounds.filter(
      (p) => canonical(p.formula) === canonical(c.formula),
    );
    if (candidates.length === 1) match = candidates[0];
    else
      match = candidates.find((p) =>
        p.aliases.some((a) => a.toLowerCase() === c.name_en.toLowerCase()),
      );
  } catch {}
  const components =
    c.phase_STP === "aqueous" &&
    ["acid", "base", "salt"].includes(c.category) &&
    decomposition[c.formula];
  return {
    chemicalId: c.id,
    formula: c.formula,
    name_vi: c.name_vi,
    name_en: c.name_en,
    category: c.category,
    molarMass: c.molarMass_g_mol,
    status: components ? "components" : match ? "available" : "unavailable",
    compoundId: components ? null : (match?.id ?? null),
    components: components || [],
    componentIds: components
      ? components.map((s) => ionIds[s]).filter(Boolean)
      : [],
    note: components
      ? "Chất trong dung dịch nước: xem các ion/thành phần, không coi là một phân tử muối riêng lẻ."
      : match
        ? "Cấu trúc phân tử riêng lẻ; trạng thái trong lab có thể chứa dung môi."
        : "Chưa có mô hình kiểm chứng phù hợp. Muối rắn cần dữ liệu mạng tinh thể; không suy cấu trúc từ công thức.",
  };
});
fs.writeFileSync(
  "shared/compounds.json",
  JSON.stringify(compounds, null, 2) + "\n",
);
fs.writeFileSync(
  "shared/lab-structure-coverage.json",
  JSON.stringify(coverage, null, 2) + "\n",
);
fs.writeFileSync(
  "shared/structure-audit.json",
  JSON.stringify({ count: compounds.length, checks: report }, null, 2) + "\n",
);
console.log(
  `${compounds.length} coordinate files checked; ${coverage.length} lab chemicals classified`,
);
