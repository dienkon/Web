import type { SubstanceContent, VesselState } from '../types/chemistry';
import { computeMolarMass } from './ledger';
import { identifySpecies } from '../science/speciesIdentity';
import { reagentPhase } from '../science/reagentAvailability';
import { AMMINE_FORMATION_DH_J, HYDROXO_AMMINES, copperAmmineFormula, copperAmmoniaEquilibrium,
  type CopperAmmoniaInventory, type CopperAmmoniaState } from '../science/copperAmmoniaEquilibrium';
import { waterDissociationEnthalpy_J_mol } from '../science/aqueousTemperature';
import { bulkPrecipitateMass } from '../science/precipitateInventory';

export const COPPER_AMMONIA_EQUATION = 'Cu(2+)(aq) + nNH3(aq) ⇌ [Cu(NH3)n](2+)(aq), n=1–4; Cu(OH)2(s) ⇌ Cu(2+)(aq) + 2OH(-)(aq)';

/** Reconstruct neutral analytical pools from the selected ion equilibria.
 * Counterion allocation is bookkeeping: sulfate pools are dissociated salts,
 * not a claim that every Cu ammine has a bound sulfate ligand. */
function equilibriumPools(t: CopperAmmoniaInventory, state: CopperAmmoniaState): SubstanceContent[] | null {
  const rows: SubstanceContent[] = [];
  const add = (formula: string, moles: number, phase = 'aq') => {
    if (!(moles > 1e-16)) return;
    rows.push({ formula, phase, moles, mass_g: moles * computeMolarMass(formula),
      ...(phase === 's' ? { solidOrigin: 'precipitate' as const, precipitateFormation: 'GEL' } : {}) });
  };
  const solid = Math.max(0, Math.min(t.copper_mol, state.solid_mol));
  // These neutral component pools group Cu by bound ammonia count. Hydroxo
  // substitution is resolved in the ionic state, not miscounted as free Cu.
  const complexes = state.ammines_M.map(c => c * t.liters);
  state.hydroxoAmmines_M.forEach((c, i) => { complexes[HYDROXO_AMMINES[i].ammonia - 1] += c * t.liters; });
  const dissolved = t.copper_mol - solid;
  const sodiumSulfate = Math.min(t.sulfate_mol, t.sodium_mol / 2);
  const sodiumHydroxide = Math.max(0, t.sodium_mol - 2 * sodiumSulfate);
  add('Na2SO4', sodiumSulfate); add('NaOH', sodiumHydroxide);
  const sulfateForCopper = t.sulfate_mol - sodiumSulfate;
  const sulfateFraction = dissolved > 0 ? Math.min(1, sulfateForCopper / dissolved) : 0;
  const uncomplexed = Math.max(0, dissolved - complexes.reduce((s, c) => s + c, 0));
  add('CuSO4', uncomplexed * sulfateFraction);
  add('Cu(OH)2', uncomplexed * (1 - sulfateFraction));
  let boundNitrogen = 0;
  complexes.forEach((amount, i) => {
    add(copperAmmineFormula(i + 1), amount * sulfateFraction);
    add(copperAmmineFormula(i + 1, 'hydroxide'), amount * (1 - sulfateFraction));
    boundNitrogen += (i + 1) * amount;
  });
  const freeSulfatePool = Math.max(0, sulfateForCopper - dissolved * sulfateFraction);
  const nitrogenPool = Math.max(0, t.nitrogen_mol - boundNitrogen);
  const ammoniumSulfate = Math.min(freeSulfatePool, nitrogenPool / 2);
  add('(NH4)2SO4', ammoniumSulfate);
  add('H2SO4', freeSulfatePool - ammoniumSulfate);
  add('NH3', nitrogenPool - 2 * ammoniumSulfate);
  add('Cu(OH)2', solid, 's');
  // The non-sulfate oxygen in both solid/dissolved hydroxide counterion
  // pools must come from the explicitly finite initial water inventory.
  const nonSulfateOxygen = 2 * (t.copper_mol - dissolved * sulfateFraction) + sodiumHydroxide;
  const water = t.oxygenOutsideSulfate_mol - nonSulfateOxygen;
  if (water < -1e-12) return null;
  add('H2O', Math.max(0, water), 'l');
  return rows;
}

/** Basis reaction enthalpies yield a state function, so reverse reaction,
 * repeated replay and closed composition cycles cannot create fresh heat.
 * This component-basis approximation does not resolve all ion-pair/protonation
 * or hydroxo substitution heat; calorimetry is not experimentally calibrated. */
function poolEnthalpy(contents: readonly SubstanceContent[], temperature_c: number): number {
  const t = temperature_c + 273.15;
  const ammoniumHeat = 8.314462618 * Math.LN10 * (-0.001225 * t * t + 2835.76);
  const waterHeat = waterDissociationEnthalpy_J_mol(temperature_c) ?? 0;
  let heat = 0;
  for (const c of contents) {
    if (c.location && c.location !== 'bulk') continue;
    const formula = identifySpecies(c.formula).formula, phase = reagentPhase(c);
    if (formula === 'Cu(OH)2') heat += c.moles * (phase === 's' ? 15.25 * 4184 : 2 * waterHeat);
    if (formula === '(NH4)2SO4') heat -= 2 * c.moles * ammoniumHeat;
    if (formula === 'NaOH') heat += c.moles * waterHeat;
    for (let n = 1; n <= 4; n++) {
      if (formula === copperAmmineFormula(n)) heat += c.moles * AMMINE_FORMATION_DH_J[n - 1];
      if (formula === copperAmmineFormula(n, 'hydroxide')) heat += c.moles * (AMMINE_FORMATION_DH_J[n - 1] + 2 * waterHeat);
    }
  }
  return heat;
}

/** Qualitative concentration-dependent palette, not measured molar spectra.
 * It reads actual recorded ammine pools; time alone cannot turn a sample blue. */
export function copperAmmoniaColor(contents: readonly SubstanceContent[], volume_ml: number): string {
  let unbound = 0, complex = 0;
  for (const c of contents) {
    if ((c.location && c.location !== 'bulk') || reagentPhase(c) !== 'aq') continue;
    const f = identifySpecies(c.formula).formula;
    if (f === 'CuSO4' || f === 'Cu(OH)2') unbound += c.moles;
    for (let n = 1; n <= 4; n++) if (f === copperAmmineFormula(n) || f === copperAmmineFormula(n, 'hydroxide'))
      complex += c.moles * [0.15, 0.4, 0.8, 1][n - 1];
  }
  const liters = Math.max(1e-12, volume_ml / 1000);
  const a = Math.min(1, unbound / liters / 0.05), b = Math.min(1, complex / liters / 0.02);
  const clear = [248, 250, 252], blue = [56, 189, 248], deep = [30, 58, 138];
  return '#' + clear.map((c, i) => Math.round((c + (blue[i] - c) * a) * (1 - b) + deep[i] * b)
    .toString(16).padStart(2, '0')).join('');
}

export function applyCopperAmmoniaLedger(vessel: VesselState, progress: number, temperature_c = vessel.temperature_c): Partial<VesselState> | null {
  if (!Number.isFinite(progress)) return null;
  const solved = copperAmmoniaEquilibrium(vessel.contents, vessel.volume_ml, temperature_c);
  if (!solved) return null;
  const endpoint = equilibriumPools(solved.inventory, solved.state);
  if (!endpoint) return null;
  const p = Math.max(0, Math.min(1, progress));
  const contents = vessel.contents.filter(c => c.location && c.location !== 'bulk').map(c => ({ ...c }));
  const add = (c: SubstanceContent, fraction: number) => {
    const amount = c.moles * fraction;
    if (!(amount > 1e-16)) return;
    const formula = identifySpecies(c.formula).formula, phase = reagentPhase(c) ?? undefined;
    const existing = contents.find(r => (!r.location || r.location === 'bulk') && r.formula === formula && r.phase === phase
      && r.solidOrigin === c.solidOrigin);
    if (existing) { existing.moles += amount; existing.mass_g += c.mass_g * fraction; }
    else contents.push({ ...c, formula, phase, moles: amount, mass_g: c.mass_g * fraction });
  };
  for (const c of vessel.contents) if (!c.location || c.location === 'bulk') add(c, 1 - p);
  for (const c of endpoint) add(c, p);
  const precipitateAmount_g = bulkPrecipitateMass(contents, 'Cu(OH)2');
  const aqueous = copperAmmoniaEquilibrium(contents, vessel.volume_ml, temperature_c, true);
  if (!aqueous) return null;
  const heat = p * (poolEnthalpy(vessel.contents, vessel.temperature_c) - poolEnthalpy(endpoint, vessel.temperature_c));
  return { contents, substances: [...new Set(contents.filter(c => c.moles > 1e-12).map(c => c.formula))],
    mass_g: contents.reduce((s, c) => s + c.mass_g, 0), hasGas: false,
    hasPrecipitate: precipitateAmount_g > 1e-10, precipitateAmount_g,
    precipitateSubstance: 'Cu(OH)2', precipitateColor: '#7dd3fc', precipitateMorphology: 'GEL',
    liquidColor: copperAmmoniaColor(contents, vessel.volume_ml), ph: aqueous.state.ph,
    phModel: temperature_c === 25 ? 'ideal_aqueous_25c' : 'ideal_aqueous_temperature',
    phReferenceTemperature_c: temperature_c,
    programHeatApplied_J: (vessel.programHeatApplied_J ?? 0) + heat,
    temperature_c: vessel.temperature_c };
}
