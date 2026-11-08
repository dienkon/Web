import type { SpillState, VesselState } from '../types/chemistry';
import { findHandcraftedProgram } from '../vfx/programs/resolver';
import { applyProgramToLedger, computeMolarMass } from './ledger';
import { projectAqueousSolution } from './aqueousProjection';
import { sodiumReactionDuration, sodiumWaterContact, sodiumMetalMass, sodiumContactRegime, SODIUM_MOLAR_MASS } from '../science/sodiumWater';
import { getProgramById, ALL_HANDCRAFTED_PROGRAMS } from '../vfx/programs/library';
import { applyThermalEnergy, sampleHeatCapacity } from './thermalState';
import { aqueousWaterBoundary } from '../science/aqueousWaterBoundary';
import { DEFAULT_LAB_ENVIRONMENT, type LabEnvironment } from '../science/labEnvironment';
import { assessProgramConditions } from '../science/conditions';
import type { ReactionProgram } from '../shared/programSchema';
import { identifySpecies, sameMolecularFormula } from '../science/speciesIdentity';
import { assignWetStock, combineWetStock, splitWetStock } from './spillStockContact';
import { stepSpillSuspension } from '../science/spillSuspension';

function contactHalfTime(program: ReactionProgram): number | null {
  const chemistry = program.chemistry, rate = chemistry.kinetics;
  if (program.provenance === 'fallback' || !rate || !(rate.halfTime_s > 0) || !Number.isFinite(rate.halfTime_s)
    || !['instant', 'surface_limited', 'first_order'].includes(rate.model)
    || ['indicator', 'emission', 'dilution'].includes(chemistry.representation ?? '')) return null;
  const reactants = chemistry.species.filter(s => s.role === 'reactant');
  return reactants.length && reactants.every(s => ['aq', 'l', 's'].includes(s.phase)) ? rate.halfTime_s : null;
}
const contactPrograms = ALL_HANDCRAFTED_PROGRAMS.filter(p => contactHalfTime(p) !== null);

function sodiumContactStep(spill: SpillState, reference: VesselState, dt: number) {
  const metal = sodiumMetalMass(reference);
  const water = reference.contents.filter(c => c.formula === 'H2O' && c.phase === 'l')
    .reduce((sum, c) => sum + c.moles * SODIUM_MOLAR_MASS, 0);
  const previous = spill.sodiumContact;
  const valid = previous && [previous.initialMetal_g, previous.reactiveMetal_g, previous.duration_s, previous.elapsed_s].every(Number.isFinite)
    && previous.initialMetal_g >= metal - 1e-10 && previous.reactiveMetal_g > 0
    && previous.initialMetal_g - metal <= previous.reactiveMetal_g + 1e-10
    && previous.reactiveMetal_g <= previous.initialMetal_g && previous.duration_s > 0 && previous.elapsed_s >= 0
    && previous.elapsed_s <= previous.duration_s && ['skitter', 'disruptive'].includes(previous.regime);
  const contact = valid ? previous : { initialMetal_g: metal, reactiveMetal_g: Math.min(metal, water),
    duration_s: sodiumReactionDuration(reference), elapsed_s: 0, regime: sodiumContactRegime(reference) };
  const elapsed_s = Math.min(contact.duration_s, contact.elapsed_s + dt);
  const consumed = Math.max(0, contact.initialMetal_g - metal);
  const target = contact.reactiveMetal_g * elapsed_s / contact.duration_s;
  return { contact: { ...contact, elapsed_s }, progress: Math.min(1, Math.max(0, target - consumed) / Math.max(1e-12, Math.min(metal, water))) };
}

/** An open puddle has no glass heat capacity or sealed headspace. Resolve only
 * authored contact chemistry; never infer heating/ignition from a VFX preset. */
export function stepSpillChemistry(spill: SpillState, dt: number, room: LabEnvironment = DEFAULT_LAB_ENVIRONMENT,
  solidContactFractions?: Map<string, number>): SpillState {
  if (!(dt > 0) || !Number.isFinite(dt)) return spill;
  if (!(spill.volume_ml > 0) || !spill.contents?.length || spill.contents.some(c => c.liquidLayer === 'organic')
    || !spill.contents.some(c => sameMolecularFormula(c.formula, 'H2O') && c.phase === 'l' && c.moles > 1e-12))
    return stoppedSources(spill);
  const reference: VesselState = { id: spill.id, name: 'Workbench spill', type: 'beaker',
    position: spill.position, rotationY: 0, isLocked: false, capacity_ml: spill.volume_ml,
    volume_ml: spill.volume_ml, volume: 1, mass_g: spill.mass_g, contents: spill.contents,
    substances: spill.substances, temperature_c: spill.temperature_c ?? 25, ph: 7,
    liquidColor: spill.color, hasGas: false, hasPrecipitate: false, isBoiling: false,
    escapedGas_g: spill.escapedGas_g, programHeatApplied_J: 0, environment: room,
    thermalVaporEnthalpy_J: spill.thermalVaporEnthalpy_J,
    thermalVaporSensibleEnthalpy_J: spill.thermalVaporSensibleEnthalpy_J,
    thermalEnergyOutsideModel_J: spill.thermalEnergyOutsideModel_J };
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
    return spill.gasRate_mol_s || spill.vaporRate_g_s || spill.reactionProgramId
      ? { ...spill, gasRate_mol_s: 0, vaporRate_g_s: 0, reactionProgramId: undefined } : spill;
  const sodiumStep = sodium ? sodiumContactStep(spill, reference, dt) : null;
  const wetFraction = Math.min(1, ...program.chemistry.species.filter(s => s.role === 'reactant' && s.phase === 's')
    .map(s => solidContactFractions?.get(identifySpecies(s.formula).formula.toLowerCase()) ?? 1));
  const progress = sodiumStep ? sodiumStep.progress : -Math.expm1(-Math.LN2 * dt * wetFraction / halfTime!);
  const next = applyProgramToLedger(program, reference, progress, { deferThermal: true });
  const heat = next.programHeatApplied_J ?? 0;
  const reacted = { ...reference, ...next }, boundary = aqueousWaterBoundary(reacted);
  const sensibleTemperature = reference.temperature_c + heat / sampleHeatCapacity(reacted, 0);
  // Unknown/volatile/concentrated solution VLE must not pass a NaN comparison
  // and silently superheat. Salt/acid freezing needs its own phase closure.
  if (!Number.isFinite(sensibleTemperature) || sensibleTemperature < 0
    || !Number.isFinite(boundary.pureBoiling_c)
    || boundary.reason && sensibleTemperature >= boundary.pureBoiling_c)
    return { ...spill, gasRate_mol_s: 0, vaporRate_g_s: 0, chemistryLimit: 'phase_boundary' };
  const thermal = applyThermalEnergy(reacted, heat, dt, 0, { containerHeatCapacity_J_K: 0 });
  const temperature_c = thermal.temperature_c;
  const gasMoles = program.chemistry.species.filter(s => s.role === 'product' && s.phase === 'g')
    .reduce((sum, s) => sum + Math.max(0, (next.escapedGas_g?.[s.formula] ?? 0) - (spill.escapedGas_g?.[s.formula] ?? 0))
      / computeMolarMass(s.formula), 0);
  const projected = { ...reacted, ...thermal };
  const contents = projected.contents;
  const escapedGas_g = { ...next.escapedGas_g };
  if (thermal.evaporatedStep_g > 0) escapedGas_g.H2O = (escapedGas_g.H2O ?? 0) + thermal.evaporatedStep_g;
  return { ...spill, reactionProgramId: program.id, contents, substances: [...new Set(contents.filter(c => c.moles > 1e-12).map(c => c.formula))],
    sodiumContact: sodiumStep?.contact ?? spill.sodiumContact,
    volume_ml: projected.volume_ml, mass_g: projected.mass_g,
    temperature_c, color: projectAqueousSolution(projected)?.liquidColor ?? next.liquidColor ?? spill.color,
    escapedGas_g, gasRate_mol_s: gasMoles / dt, vaporRate_g_s: thermal.evaporatedStep_g / dt,
    reactionHeat_J: (spill.reactionHeat_J ?? 0) + heat,
    thermalVaporEnthalpy_J: thermal.thermalVaporEnthalpy_J,
    thermalVaporSensibleEnthalpy_J: thermal.thermalVaporSensibleEnthalpy_J,
    thermalEnergyOutsideModel_J: thermal.thermalEnergyOutsideModel_J,
    thermalModelLimit: thermal.thermalModelLimit,
    chemistryLimit: (thermal.thermalEnergyOutsideModel_J ?? 0) !== (spill.thermalEnergyOutsideModel_J ?? 0) ? 'phase_boundary' : undefined };
}

function stoppedSources(spill: SpillState): SpillState {
  return spill.gasRate_mol_s || spill.vaporRate_g_s ? { ...spill, gasRate_mol_s: 0, vaporRate_g_s: 0 } : spill;
}

export function stepWorkbenchSpills(spills: Record<string, SpillState>, dt: number, room: LabEnvironment = DEFAULT_LAB_ENVIRONMENT) {
  if (!(dt > 0) || !Number.isFinite(dt)) return { spills, escapedGas_g: {} as Record<string, number> };
  let result = spills;
  const escapedGas_g: Record<string, number> = {};
  const contacts = assignWetStock(spills), assigned = new Set([...contacts.values()].flat().map(w => w.grain.id));
  for (const [id, spill] of Object.entries(spills)) {
    if (assigned.has(id)) continue;
    const wet = contacts.get(id);
    let next: SpillState;
    if (wet?.length) {
      const { sample, fractions } = combineWetStock(spill, wet);
      const split = splitWetStock(spill, wet, sample, stepSpillChemistry(sample, dt, room, fractions));
      next = split.pool;
      for (const grain of split.grains) {
        if (grain === spills[grain.id]) continue;
        if (result === spills) result = { ...spills };
        if (grain.mass_g > 0) result[grain.id] = grain; else delete result[grain.id];
      }
    } else {
      next = stepSpillChemistry(spill, dt, room);
      if (next.solidContactSites) next = { ...next, solidContactSites: undefined };
    }
    next = stepSpillSuspension(spill, next, dt);
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
