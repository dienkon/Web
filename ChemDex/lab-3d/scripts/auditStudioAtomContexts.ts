import { mkdirSync, writeFileSync } from 'node:fs';
import { EFFECT_ATOM_CATALOG } from '../src/vfx/catalog';
import { studioAtomAction } from '../src/engine/studioAtom';
import { getProgramById } from '../src/vfx/programs/library';

const entries = EFFECT_ATOM_CATALOG.flatMap(atom => atom.gallery.map((preset, index) => {
  const action = studioAtomAction(atom, index);
  return { atom: atom.name, category: atom.category, presetIndex: index, title: preset.title,
    action, equation: action.kind === 'program' ? getProgramById(action.programId)?.chemistry.equation : undefined };
}));
const counts = Object.fromEntries(['program', 'flame', 'ripple', 'stir', 'heating', 'audio', 'ice_water', 'inspect']
  .map(kind => [kind, entries.filter(entry => entry.action.kind === kind).length]));
mkdirSync('artifacts/science-audit', { recursive: true });
writeFileSync('artifacts/science-audit/studio-atom-contexts.json', JSON.stringify({
  schema: 'chemdex.studio-atom-contexts/1', checkedAt: new Date().toISOString(),
  scope: 'Program contexts and supported controls, not validation of every independent atom renderer or gallery parameter.',
  atomCount: EFFECT_ATOM_CATALOG.length, presetCount: entries.length, counts, entries,
}, null, 2) + '\n');
console.log(JSON.stringify({ atoms: EFFECT_ATOM_CATALOG.length, presets: entries.length, counts }, null, 2));
