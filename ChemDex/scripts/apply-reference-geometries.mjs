import fs from "node:fs";
import { applyReference } from './lib/reference-geometry.mjs';
const compounds = JSON.parse(fs.readFileSync("shared/compounds.json", "utf8"));
const geometries = JSON.parse(
  fs.readFileSync("shared/nist-geometries.json", "utf8").replace(/^\uFEFF/, ""),
);
const pending = geometries.map(geometry => {
  const record = compounds.find((c) => c.cid === geometry.cid);
  if (!record || record.formula !== geometry.formula) throw new Error(`Compound identity mismatch ${geometry.cid}`);
  const file = `shared/structures/${geometry.cid}.sdf`;
  const result = applyReference(fs.readFileSync(file, 'utf8'), geometry);
  record.structure.provenance = geometry.provenance;
  record.structure.source = geometry.source;
  record.structure.retrievedAt = geometry.retrievedAt;
  record.structure.coordinateType = "experimental";
  record.structure.geometryNote = geometry.geometryNote;
  record.structure.referenceGeometry = {
    phase: geometry.phase, pointGroup: geometry.pointGroup, atoms: result.mapping,
    topologySha256: geometry.topologySha256,
    parameterNotes: [...new Set(geometry.internalCoordinates.filter(row => row[7]).map(row => `${row[0]}: ${row[7]}`))],
    references: geometry.references,
  };
  return { file, raw: result.raw };
});
// Validate every identity before mutating any structure file.
for (const { file, raw } of pending) fs.writeFileSync(file, raw);
fs.writeFileSync(
  "shared/compounds.json",
  JSON.stringify(compounds, null, 2) + "\n",
);
console.log(`Applied ${geometries.length} experimental reference geometries`);
