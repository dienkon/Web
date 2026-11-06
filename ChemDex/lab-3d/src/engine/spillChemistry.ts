import type { SpillState, VesselState } from '../types/chemistry';
import { findHandcraftedProgram } from '../vfx/programs/resolver';
import { applyProgramToLedger, computeMolarMass } from './ledger';
import { projectAqueousSolution } from './aqueousProjection';
import { sodiumReactionDuration, sodiumWaterContact } from '../science/sodiumWater';
import { getProgramById, ALL_HANDCRAFTED_PROGRAMS } from '../vfx/programs/library';
import { aqueousBoilingPoint } from './thermalState';
import { assessProgramConditions } from '../science/conditions';
import type { ReactionProgram } from '../shared/programSchema';
import { sameMolecularFormula } from '../science/speciesIdentity';

function contactHalfTime(program: ReactionProgram): number | null {
  const chemistry = program.chemistry, rate = chemistry.kinetics;
  if (program.provenance === 'fallback' || !rate || !(rate.halfTime_s > 0) || !Number.isFinite(rate.halfTime_s)
    || !['instant', 'surface_limited', 'first_order'].includes(rate.model)
    || ['indicator', 'emission', 'dilution'].includes(chemistry.representation ?? '')) return null;
  const reactants = chemistry.species.filter(s => s.role === 'reactant');
  return reactants.length && reactants.every(s => ['aq', 'l', 's'].includes(s.phase)) ? rate.halfTime_s : null;
}
const contactPrograms = ALL_HANDCRAFTED_PROGRAMS.filter(p => contactHalfTime(p) !== null);

/** An open puddle has no glass heat capacity or sealed headspace. Resolve only
 * authored contact chemistry; never infer heating/ignition from a VFX preset. */
export function stepSpillChemistry(spill: SpillState, dt: number): SpillState {
  if (!(dt > 0) || !Number.isFinite(dt)) return spill;
  if (!(spill.volume_ml > 0) || !spill.contents?.length || spill.contents.some(c => c.liquidLayer === 'organic')
    || !spill.contents.some(c => sameMolecularFormula(c.formula, 'H2O') && c.phase === 'l' && c.moles > 1e-12))
    return spill.gasRate_mol_s ? { ...spill, gasRate_mol_s: 0 } : spill;
  const reference: VesselState = { id: spill.id, name: 'Workbench spill', type: 'beaker',
    position: spill.position, rotationY: 0, isLocked: false, capacity_ml: spill.volume_ml,
    volume_ml: spill.volume_ml, volume: 1, mass_g: spill.mass_g, contents: spill.contents,
    substances: spill.substances, temperature_c: spill.temperature_c ?? 25, ph: 7,
    liquidColor: spill.color, hasGas: false, hasPrecipitate: false, isBoiling: false,
    escapedGas_g: spill.escapedGas_g, programHeatApplied_J: 0 };
  const sodium = sodiumWaterContact(reference);
  const environment = { temperature_c: reference.temperature_c, volume_ml: spill.volume_ml, isHeated: false, isSealed: false };
  const preferred = spill.reactionProgramId ? getProgramById(spill.reactionProgramId) : undefined;
  const exact = findHandcraftedProgram(spill.substances, spill.contents, environment);
  const ready = (p: ReactionProgram) => contactHalfTime(p) !== null && assessProgramConditions(p, spill.contents!, environment).ready;
  const program = sodium ? getProgramById('na_h2o') : exact && ready(exact) ? exact
    // Products entering the inventory must not invalidate the reactant-set
    // lookup after its first frame. Continue the verified contact while ready.
    : preferred && ready(preferred) ? preferred : contactPrograms.find(ready);
  const halfTime = program ? contactHalfTime(program) : null;
  if (!program || program.provenance === 'fallback' || (!sodium && halfTime === null))
    return spill.gasRate_mol_s || spill.reactionProgramId ? { ...spill, gasRate_mol_s: 0, reactionProgramId: undefined } : spill;
  const progress = sodium ? Math.min(1, dt / sodiumReactionDuration(reference)) : -Math.expm1(-Math.LN2 * dt / halfTime!);
  const next = applyProgramToLedger(program, reference, progress, { deferThermal: true });
  const heat = next.programHeatApplied_J ?? 0;
  const temperature_c = reference.temperature_c + heat / (Math.max(1e-12, spill.mass_g) * 4.184);
  // No silent superheating or invented vapor: retain the finite sample at the
  // boundary until a puddle phase/evaporation solver is available.
  if (!Number.isFinite(temperature_c) || temperature_c >= aqueousBoilingPoint({ ...reference, ...next }))
    return { ...spill, gasRate_mol_s: 0, chemistryLimit: 'phase_boundary' };
  const gasMoles = program.chemistry.species.filter(s => s.role === 'product' && s.phase === 'g')
    .reduce((sum, s) => sum + Math.max(0, (next.escapedGas_g?.[s.formula] ?? 0) - (spill.escapedGas_g?.[s.formula] ?? 0))
      / computeMolarMass(s.formula), 0);
  const projected = { ...reference, ...next, temperature_c };
  const contents = next.contents ?? spill.contents;
  return { ...spill, reactionProgramId: program.id, contents, substances: [...new Set(contents.filter(c => c.moles > 1e-12).map(c => c.formula))],
    volume_ml: next.volume_ml ?? spill.volume_ml, mass_g: next.mass_g ?? spill.mass_g,
    temperature_c, color: projectAqueousSolution(projected)?.liquidColor ?? next.liquidColor ?? spill.color,
    escapedGas_g: next.escapedGas_g ?? spill.escapedGas_g, gasRate_mol_s: gasMoles / dt,
    chemistryLimit: undefined };
}

export function stepWorkbenchSpills(spills: Record<string, SpillState>, dt: number) {
  let result = spills;
  const escapedGas_g: Record<string, number> = {};
  for (const [id, spill] of Object.entries(spills)) {
    let next = stepSpillChemistry(spill, dt);
    // The store's atmosphere ledger outlives wiping/removing a puddle. Move the
    // receipt once; do not leave a second copy attached to the liquid sample.
    if (Object.values(next.escapedGas_g ?? {}).some(g => g > 0)) {
      for (const [formula, grams] of Object.entries(next.escapedGas_g ?? {}))
        escapedGas_g[formula] = (escapedGas_g[formula] ?? 0) + grams;
      next = { ...next, escapedGas_g: undefined };
    }
    if (next === spill) continue;
    if (result === spills) result = { ...spills };
    result[id] = next;
  }
  return { spills: result, escapedGas_g };
}
