import groups from '../molecular-isomers.json' with { type: 'json' };
import { structureFormula } from './structure-generator.mjs';

// Formula-only teaching entries may show named examples. Never replace the
// identity of a named compound (or attach one isomer's crystal to another).
export function isomerGroupFor(record) {
  if (!record || record.material) return null;
  let formula;
  try { formula = structureFormula(record.formula); } catch { return null; }
  const group = groups[formula];
  if (!group) return null;
  if (record.isomerGroup === formula) return group;
  if (record.cid || record.structure) return null;
  const name = String(record.name_vi ?? record.name_en ?? record.formula);
  return structureFormula(name) === formula ? group : null;
}

export function resolveMolecularExample(record, requestedId) {
  const group = isomerGroupFor(record);
  if (!group) return record;
  const example = group.examples.find(e => e.id === (requestedId ?? record.isomerExampleId)) ?? group.examples[0];
  return {...record, kind: 'molecule', name_vi: example.name, name_en: example.iupacName,
    cid: example.cid, structure: example.structure, isomerGroup: group.formula, isomerExampleId: example.id};
}
