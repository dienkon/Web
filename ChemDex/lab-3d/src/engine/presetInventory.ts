import type { VesselState } from '../types/chemistry';
import { findChemical } from '../data/chemicals';
import { computeMolarMass } from './ledger';
import { identifySpecies, sameMolecularFormula } from '../science/speciesIdentity';
import { readComposition } from '../science/balance';

const INSOLUBLE_STARTING_MATERIALS = new Set(['Cu(OH)2', 'CaCO3', 'MnO2', 'Fe', 'Cu', 'Zn', 'Mg', 'Al', 'Na', 'K', 'AgCl', 'PbI2', 'BaSO4']);

/** For authored aqueous presets only: declared sample mass already includes
 * solvent. Preserve weighed mass and repair rounded legacy mole amounts.
 * Do not use to infer arbitrary user samples or missing reagents.
 */
export function materializePresetInventory(vessel: VesselState): VesselState {
  const contents = vessel.contents.map(item => {
    const label = vessel.substances.find(formula => sameMolecularFormula(formula, item.formula)
      && identifySpecies(formula).concentration !== null);
    const formula = label ?? item.formula;
    const identity = identifySpecies(formula);
    let molarMass: number;
    try { readComposition(formula); molarMass = computeMolarMass(formula); }
    catch { molarMass = findChemical(formula).molarMass; }
    const phase = item.phase ?? identity.phase ?? (sameMolecularFormula(formula, 'H2O') ? 'l'
      : vessel.volume_ml <= 0 || INSOLUBLE_STARTING_MATERIALS.has(identity.formula) ? 's' : 'aq');
    return { ...item, formula, phase, moles: item.mass_g / molarMass,
      ...(phase === 'aq' && vessel.volume_ml > 0 ? { concentration_M: item.mass_g / molarMass / (vessel.volume_ml / 1000) } : {}) };
  });
  const tracked = contents.reduce((sum, item) => sum + item.mass_g, 0);
  const missingSolvent = vessel.mass_g - tracked;
  if (vessel.volume_ml > 0 && !(vessel.immiscibleOrganicVolume_ml ?? 0)
    && !contents.some(item => sameMolecularFormula(item.formula, 'H2O')) && missingSolvent > 1e-9) {
    contents.push({ formula: 'H2O', phase: 'l', mass_g: missingSolvent, moles: missingSolvent / computeMolarMass('H2O') });
  }
  return { ...vessel, contents, substances: [...new Set(contents.filter(item => item.moles > 0).map(item => item.formula))] };
}

export const LAB_PRESET_IDS = [
  "acid_base_titration",
  "golden_rain_synthesis",
  "co2_gas_evolution",
  "co2_gas_production",
  "iron_copper_redox",
  "single_displacement_copper",
  "mass_conservation_bacl2_na2so4",
  "catalytic_oxygen_prep",
  "thermal_decomp_cuoh2",
  "redox_gas_cu_hno3",
  "alkali_metal_water_na",
  "acid_safety_dilution",
  "agcl_curdy_precipitation",
  "exothermic_neutralization",
  "zn_hcl_hydrogen_production",
  "landolt_iodine_clock",
  "fe_kscn_chemical_equilibrium",
  "copper_ammonia_deep_blue",
  "al_amphoteric_hydroxide",
  "thiosulfate_acid_clock",
  "permanganate_oxalate_redox"
] as const;
