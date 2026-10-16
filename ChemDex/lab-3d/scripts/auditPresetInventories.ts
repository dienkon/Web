import { mkdirSync, writeFileSync } from 'node:fs';
import { LAB_PRESET_IDS } from '../src/engine/presetInventory';
import { useAppStore } from '../src/store/useAppStore';
import { readComposition } from '../src/science/balance';

const presets = LAB_PRESET_IDS.map(id => {
  useAppStore.getState().setupExperimentPreset(id);
  const vessels = Object.values(useAppStore.getState().vessels).map(vessel => ({
    id: vessel.id, name: vessel.name, volume_ml: vessel.volume_ml, mass_g: vessel.mass_g,
    trackedMass_g: vessel.contents.reduce((sum, item) => sum + item.mass_g, 0),
    waterMass_g: vessel.contents.filter(item => item.formula === 'H2O').reduce((sum, item) => sum + item.mass_g, 0),
    contents: vessel.contents.map(item => {
      let atomFormula = true;
      try { readComposition(item.formula); } catch { atomFormula = false; }
      return { ...item, amountBasis: atomFormula ? 'formula_unit' : 'authored_optical_tracer' };
    }),
  }));
  return { id, vessels };
});
const failures = presets.flatMap(preset => preset.vessels.filter(vessel => Math.abs(vessel.trackedMass_g - vessel.mass_g) > 1e-8)
  .map(vessel => `${preset.id}/${vessel.id}`));
const report = { checkedAt: new Date().toISOString(), scope: 'Every authored preset identifier, including aliases; not a real-lab dosing protocol.',
  solventBasis: 'Residual already-declared sample mass is materialized as water only for the authored aqueous presets.',
  counts: { presetIds: presets.length, vesselDefinitions: presets.reduce((sum, preset) => sum + preset.vessels.length, 0), massFailures: failures.length },
  failures, presets };
mkdirSync('artifacts/science-audit', { recursive: true });
writeFileSync('artifacts/science-audit/preset-inventories.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report.counts, null, 2));
if (failures.length) process.exitCode = 1;
