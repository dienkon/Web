import fs from "node:fs";
const compounds = JSON.parse(fs.readFileSync("shared/compounds.json", "utf8"));
const geometries = JSON.parse(
  fs.readFileSync("shared/nist-geometries.json", "utf8").replace(/^\uFEFF/, ""),
);
for (const geometry of geometries) {
  const record = compounds.find((c) => c.cid === geometry.cid);
  const file = `shared/structures/${geometry.cid}.sdf`,
    lines = fs
      .readFileSync(file, "utf8")
      .replace(/^\uFEFF/, "")
      .split(/\r?\n/),
    count = Number(lines[3].slice(0, 3));
  if (count !== geometry.atoms.length)
    throw new Error(`Reference atom count mismatch ${geometry.cid}`);
  const available = geometry.atoms.map((atom) => ({ ...atom, used: false }));
  // These four molecules contain one central atom and equivalent terminal
  // atoms. Matching by element preserves their existing SDF bond connectivity.
  for (let i = 0; i < count; i++) {
    const line = lines[i + 4],
      element = line.slice(31, 34).trim(),
      atom = available.find((a) => a.element === element && !a.used);
    if (!atom)
      throw new Error(`Reference composition mismatch ${geometry.cid}`);
    atom.used = true;
    lines[i + 4] =
      [atom.x, atom.y, atom.z].map((v) => v.toFixed(4).padStart(10)).join("") +
      line.slice(30);
  }
  lines[1] = "ChemDex / NIST SRD 101 reference 3D";
  fs.writeFileSync(file, lines.join("\n"));
  record.structure.provenance = geometry.provenance;
  record.structure.source = geometry.source;
  record.structure.retrievedAt = geometry.retrievedAt;
  record.structure.coordinateType = "experimental";
}
fs.writeFileSync(
  "shared/compounds.json",
  JSON.stringify(compounds, null, 2) + "\n",
);
console.log(`Applied ${geometries.length} experimental reference geometries`);
