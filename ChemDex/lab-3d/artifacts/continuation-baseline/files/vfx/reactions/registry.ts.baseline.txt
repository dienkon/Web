/**
 * registry.ts — Reaction Controller Master Registry
 * 
 * Maps every one of the 30 chemical reaction IDs to its dedicated,
 * physically grounded ReactionVisualController.
 * Zero generic fallbacks for known reactions.
 */

import { ReactionVisualController, ReactionVisualProfile } from './types';
import { SodiumWaterController } from './controllers/SodiumWaterController';
import {
  HclNaohNeutralizationController,
  H2so4NaohNeutralizationController
} from './controllers/NeutralizationControllers';
import {
  BaSO4PrecipitationController,
  AgClCurdyPrecipitationController,
  PbI2GoldenRainController,
  CuOH2GelPrecipitationController,
  ColloidalSulfurController,
  CuSo4Nh3MultiStageController,
  Al2So43NaOhAmphotericController
} from './controllers/PrecipitationControllers';
import {
  CaCo3PrecipitationController,
  AgIPrecipitationController,
  FeOH3FlocPrecipitationController,
  ZnCuSo4DisplacementController,
  PotassiumWaterController,
  NaHCo3HclGasController
} from './controllers/DisambiguatedControllers';
import {
  CaCo3HclGasController,
  ZnHclGasController,
  MgHclGasController,
  H2o2Mno2CatalyticController,
  Nh3HclFumesController,
  Na2Co3HclGasController,
  CuHno3ConcController,
  CuConcH2so4HeatedController
} from './controllers/GasEvolutionControllers';
import {
  FeCuSo4DisplacementController,
  CuOh2ThermalDecompositionController,
  IodineSublimationController,
  WaterIntoConcH2so4ExplosionController,
  FeCl3KscnComplexController,
  Kmno4OxalicRedoxController,
  K2Cr2O7NaOhEquilibriumController,
  IodineClockController
} from './controllers/RedoxComplexControllers';
import {
  BurnMagnesiumController,
  FlameTestCopperController,
  FlameTestSodiumController,
  FlameTestPotassiumController
} from './controllers/CombustionFlameControllers';

const CONTROLLERS: Record<string, ReactionVisualController> = {};

// Register all controllers
function register(ctrl: ReactionVisualController, aliases: string[] = []) {
  CONTROLLERS[ctrl.id] = ctrl;
  for (const alias of aliases) {
    CONTROLLERS[alias] = ctrl;
  }
}

// 01 & 02: Neutralization
register(new HclNaohNeutralizationController(), [
  'hcl_naoh', 'neutralization_hcl_naoh', 'HCl+NaOH', 'hcl_naoh_neutralization', 'acid_base_titration'
]);
register(new H2so4NaohNeutralizationController(), [
  'h2so4_naoh', 'exothermic_neutralization', 'H2SO4+NaOH', 'h2so4_naoh_neutralization'
]);

// 03 - 06: Core Precipitates
register(new BaSO4PrecipitationController(), [
  'baso4_precipitate', 'bacl2_na2so4', 'BaCl2+Na2SO4', 'mass_conservation_bacl2_na2so4', 'bacl2_na2so4_conservation', 'bacl2_h2so4_precipitate'
]);
register(new AgClCurdyPrecipitationController(), [
  'agcl_precipitate', 'agcl_curdy_precipitation', 'AgNO3+NaCl', 'agno3_nacl_precipitate'
]);
register(new PbI2GoldenRainController(), [
  'golden_rain', 'pbi2_precipitation', 'golden_rain_synthesis', 'golden_rain_pbi2', 'Pb(NO3)2+KI'
]);
register(new CuOH2GelPrecipitationController(), [
  'cuoh2_precipitate', 'cuso4_naoh', 'CuSO4+NaOH', 'cuso4_naoh_precipitate'
]);

// Dedicated controllers resolving F4 collisions
register(new CaCo3PrecipitationController(), [
  'cacl2_na2co3_precipitate', 'CaCl2+Na2CO3', 'cacl2_na2co3', 'caco3_precipitation'
]);
register(new AgIPrecipitationController(), [
  'agno3_ki_precipitate', 'AgNO3+KI', 'agno3_ki'
]);
register(new FeOH3FlocPrecipitationController(), [
  'fecl3_naoh_precipitate', 'FeCl3+NaOH', 'fecl3_naoh'
]);
register(new ZnCuSo4DisplacementController(), [
  'zn_cuso4_displacement', 'Zn+CuSO4', 'zn_cuso4'
]);
register(new PotassiumWaterController(), [
  'potassium_water_reaction', 'K+H2O', 'potassium_water'
]);
register(new NaHCo3HclGasController(), [
  'nahco3_hcl_gas', 'NaHCO3+HCl', 'nahco3_hcl'
]);

// 07: Redox Surface Plating
register(new FeCuSo4DisplacementController(), [
  'single_displacement_copper', 'fe_cuso4', 'Fe+CuSO4', 'fe_cuso4_displacement'
]);

// 08 - 11: Gas Evolution
register(new CaCo3HclGasController(), [
  'co2_gas_production', 'caco3_hcl', 'CaCO3+HCl', 'caco3_hcl_gas'
]);
register(new ZnHclGasController(), [
  'zn_hcl', 'zinc_acid_gas', 'Zn+HCl', 'zn_hcl_gas', 'zn_hcl_hydrogen_production'
]);
register(new MgHclGasController(), [
  'mg_hcl', 'magnesium_acid_gas', 'Mg+HCl', 'mg_hcl_gas'
]);
register(new H2o2Mno2CatalyticController(), [
  'catalytic_oxygen_prep', 'h2o2_decomposition', 'H2O2+MnO2', 'h2o2_mno2_decomposition', 'h2o2_mno2_gas'
]);

// 12 - 13: Vapor & Effervescence
register(new Nh3HclFumesController(), [
  'nh3_hcl', 'ammonium_chloride_fumes', 'NH3+HCl_fumes', 'nh3_hcl_fumes'
]);
register(new Na2Co3HclGasController(), [
  'na2co3_hcl', 'carbonate_effervescence', 'na2co3_hcl_gas'
]);

// 14 - 16: Thermal & Safety
register(new CuOh2ThermalDecompositionController(), [
  'thermal_decomp_cuoh2', 'cuoh2_heat', 'Cu(OH)2_heating', 'cuoh2_thermal_decomposition'
]);
register(new IodineSublimationController(), [
  'iodine_sublime', 'i2_sublimation', 'I2_sublimation', 'iodine_sublimation'
]);
register(new WaterIntoConcH2so4ExplosionController(), [
  'acid_safety_dilution', 'h2so4_water_hazard', 'H2SO4_water_explosion', 'water_into_conc_h2so4_explosion'
]);

// 17: Sodium & Alkali Metal + Water Special Case
register(new SodiumWaterController(), [
  'sodium_water', 'alkali_metal_water_na', 'Na+H2O', 'sodium_water_reaction', 'alkali_metal_water'
]);

// 18 - 19: Copper Acids
register(new CuHno3ConcController(), [
  'redox_gas_cu_hno3', 'cu_hno3', 'Cu+HNO3_conc', 'cu_hno3_conc'
]);
register(new CuConcH2so4HeatedController(), [
  'cu_h2so4_heat', 'cu_h2so4', 'Cu+H2SO4_conc', 'cu_conc_h2so4_heated'
]);

// 20 - 23: Complexes & Equilibria
register(new FeCl3KscnComplexController(), [
  'fe_kscn_complex', 'thiocyanate_iron', 'FeCl3+KSCN', 'fecl3_kscn_complex', 'fe_kscn_chemical_equilibrium'
]);
register(new Kmno4OxalicRedoxController(), [
  'permanganate_oxalate', 'kmno4_redox', 'KMnO4+H2C2O4', 'kmno4_oxalic_redox', 'permanganate_oxalate_redox'
]);
register(new K2Cr2O7NaOhEquilibriumController(), [
  'chromate_dichromate', 'cr2o7_cro4', 'Cr2O7+OH_equilibrium', 'k2cr2o7_naoh_equilibrium'
]);
register(new IodineClockController(), [
  'landolt_clock', 'iodine_starch_clock', 'KIO3+NaHSO3_starch', 'iodine_clock', 'landolt_iodine_clock'
]);

// 24 - 26: Colloids & Multi-Stage
register(new ColloidalSulfurController(), [
  'thiosulfate_acid', 'sulfur_colloid', 'Na2S2O3+HCl', 'na2s2o3_hcl_turbidity', 'thiosulfate_acid_clock'
]);
register(new CuSo4Nh3MultiStageController(), [
  'copper_ammonia_complex', 'cuso4_nh3', 'CuSO4+NH3_excess', 'cuso4_nh3_complex', 'copper_ammonia_deep_blue'
]);
register(new Al2So43NaOhAmphotericController(), [
  'aluminium_amphoteric', 'al_naoh', 'al_naoh_amphoteric', 'Al2(SO4)3+NaOH', 'al2so4_naoh_amphoteric', 'al_amphoteric_hydroxide'
]);

// 27 - 30: Combustion & Flame Tests
register(new BurnMagnesiumController(), [
  'magnesium_burn', 'mg_combustion', 'Mg+O2_burning', 'burn_magnesium'
]);
register(new FlameTestCopperController(), [
  'flame_cu', 'copper_flame', 'flame_test_copper'
]);
register(new FlameTestSodiumController(), [
  'flame_na', 'sodium_flame', 'flame_test_sodium'
]);
register(new FlameTestPotassiumController(), [
  'flame_k', 'potassium_flame', 'flame_test_potassium'
]);

/**
 * Retrieves the dedicated reaction controller for a given reaction ID.
 */
export function getReactionController(reactionId: string): ReactionVisualController | null {
  if (!reactionId) return null;
  if (CONTROLLERS[reactionId]) return CONTROLLERS[reactionId];

  // Normalized fuzzy lookup (handling + vs _, uppercase/lowercase, whitespace)
  const normalized = reactionId.toLowerCase().trim().replace(/[\s\(\)]/g, '').replace(/\+/g, '_');
  if (CONTROLLERS[normalized]) return CONTROLLERS[normalized];

  for (const [key, ctrl] of Object.entries(CONTROLLERS)) {
    const normKey = key.toLowerCase().trim().replace(/[\s\(\)]/g, '').replace(/\+/g, '_');
    if (normKey === normalized) {
      return ctrl;
    }
  }

  return null;
}

/**
 * Lists all registered reaction IDs.
 */
export function getAllRegisteredReactionIds(): string[] {
  return Object.keys(CONTROLLERS);
}
