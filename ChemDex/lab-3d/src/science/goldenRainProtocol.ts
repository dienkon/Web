import type { VesselState, SubstanceContent } from '../types/chemistry';
import { computeMolarMass } from '../engine/ledger';
import { sameMolecularFormula } from './speciesIdentity';
import { getSolubilityLimit_g_100ml } from '../simulation/chemistry/SolubilityEngine';

/** Virtual 1/16 scale of the St John Fisher faculty demonstration (0.005 mol
 * Pb(NO3)2 + 0.010 mol KI in 800 mL water). This is a software specimen,
 * not an experimental protocol. Heating/cooling use the actual thermal state.
 * https://citadel.sjfc.edu/faculty/aignatchenko/Golden-rain.html */
export const GOLDEN_RAIN_PROTOCOL = {
  water_g: 50, leadNitrate_mol: 0.0003125, potassiumIodide_mol: 0.000625,
  // Illustrative coupled electrical power for the virtual heating plate.
  heaterPower_W: 350, heatTarget_c: 90, clearSolidFraction: 0.001, finalTemperatureAboveAmbient_c: 3,
  source: 'https://citadel.sjfc.edu/faculty/aignatchenko/Golden-rain.html',
} as const;

export function createGoldenRainSample(shell: VesselState): VesselState {
  const recipe = GOLDEN_RAIN_PROTOCOL;
  const rows: SubstanceContent[] = [['Pb(NO3)2', recipe.leadNitrate_mol], ['KI', recipe.potassiumIodide_mol]]
    .map(([formula, moles]) => ({ formula: formula as string, phase: 'aq', moles: moles as number,
      mass_g: (moles as number) * computeMolarMass(formula as string), initialMoles: moles as number }));
  rows.push({ formula: 'H2O', phase: 'l', mass_g: recipe.water_g, moles: recipe.water_g / computeMolarMass('H2O') });
  const mass_g = rows.reduce((sum, row) => sum + row.mass_g, 0), volume_ml = mass_g;
  if (volume_ml > shell.capacity_ml) throw new Error('Dụng cụ không đủ sức chứa mẫu mưa vàng.');
  for (const row of rows) if (row.phase === 'aq') row.concentration_M = row.moles / (volume_ml / 1000);
  return { ...shell, contents: rows, substances: rows.map(row => row.formula), volume_ml, volume: volume_ml / shell.capacity_ml,
    mass_g, density_g_ml: 1, temperature_c: 25, ph: 7, liquidColor: '#f8fafc', hasGas: false, isBoiling: false,
    hasPrecipitate: false, precipitateAmount_g: 0, precipitateSubstance: undefined, precipitateMorphology: undefined,
    leadIodidePhaseHistory: undefined, isSealed: false, escapedGas_g: {}, evaporated_ml: 0, programHeatApplied_J: 0,
    studioProgramId: 'pbno32_ki' };
}

export function goldenRainInventory(vessel: VesselState) {
  const bulk = vessel.contents.filter(row => !row.location || row.location === 'bulk');
  const water_g = bulk.filter(row => row.phase === 'l' && sameMolecularFormula(row.formula, 'H2O')).reduce((s, row) => s + row.mass_g, 0);
  const lead = bulk.filter(row => sameMolecularFormula(row.formula, 'PbI2'));
  const total_g = lead.reduce((s, row) => s + row.mass_g, 0);
  const solid_g = lead.filter(row => row.phase === 's').reduce((s, row) => s + row.mass_g, 0);
  const plates_g = lead.filter(row => row.phase === 's' && row.precipitateFormation === 'CRYSTAL_PLATE').reduce((s, row) => s + row.mass_g, 0);
  // Existing water solubility proxy: water mass approximates mL of solvent;
  // bulk solution volume must not invent solvent after salt addition.
  const dissolvedCapacity_g = water_g / 100 * getSolubilityLimit_g_100ml('PbI2', vessel.temperature_c);
  return { water_g, total_g, solid_g, dissolved_g: total_g - solid_g, plates_g, dissolvedCapacity_g,
    clear: total_g > 0 && solid_g <= total_g * GOLDEN_RAIN_PROTOCOL.clearSolidFraction,
    expectedColdSolid_g: Math.max(0, total_g - water_g / 100 * getSolubilityLimit_g_100ml('PbI2', 25)) };
}
