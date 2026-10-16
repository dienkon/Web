import * as THREE from 'three';
import { ReactionProgram } from '../../shared/programSchema';
import { getProgramById } from '../programs/library/index';
import { GAS_SPECIES_TABLE, GasSpecies, toRecipeStyle, normalizeMorphology } from '../catalog/vocab';

export type VfxRecipeLayer =
  | { kind: 'colorFront'; t: [number, number]; from?: string; to: string; origin: 'pourPoint' | 'bottom' | 'solidSurface' | 'uniform'; speed: number }
  | { kind: 'bubbles'; t: [number, number]; rate: number; size?: [number, number]; emitter: 'solid' | 'bulk' | 'bottom' | 'surfaceOnly'; color?: string; gasType?: string }
  | { kind: 'gasPlume'; t: [number, number]; color: string; density: number; heavy?: boolean; buoyancy: number; curl?: number }
  | { kind: 'precipitate'; t: [number, number]; style: 'milky' | 'curdy' | 'flake-gold' | 'gel' | 'powder-black' | 'metal-copper'; color: string; settleTime: number; substance?: string }
  | { kind: 'turbidity'; t: [number, number]; color: string; peak: number }
  | { kind: 'foam'; t: [number, number]; rate: number; viscous?: boolean }
  | { kind: 'steam'; t: [number, number]; density: number }
  | { kind: 'flash'; at: number; color: string; intensity: number; duration: number }
  | { kind: 'burst'; at: number; droplets: number; speed: number; steam: number; shockwave?: boolean }
  | { kind: 'shake'; t: [number, number]; trauma: number }
  | { kind: 'slowmo'; t: [number, number]; scale: number }
  | { kind: 'solidDissolve'; target: string; style: 'shrink' | 'coat-copper' | 'darken' }
  | { kind: 'light'; t: [number, number]; color: string; intensity: number; flicker?: number }
  | { kind: 'sound'; at: number; id: string };

export interface ReactionVfxRecipe {
  id: string;
  name: string;
  duration?: number; // suggested duration in seconds (default ~4.5 - 5.0)
  layers: VfxRecipeLayer[];

  // Convenience summary projections for instant static querying
  bubbles?: { rate: number; gasType?: string; color?: string; emitter?: 'solid' | 'bulk' | 'bottom' | 'surfaceOnly' };
  gasPlume?: { color: string; density: 'heavy' | 'light' | 'neutral'; rate: number; turbidity?: number; buoyancy?: number };
  steam?: { active: boolean; rate?: number };
  precipitate?: { substance: string; color: string; morphology: 'flake' | 'curd' | 'gel' | 'powder' | 'floc' | string; rate?: number; settleTime?: number };
  foam?: { active: boolean; growthMultiplier?: number; viscous?: boolean };
  sparks?: { active: boolean; rate?: number; burstCount?: number; color?: string };
  specialEffect?: 
    | 'frost' 
    | 'golden_rain' 
    | 'elephant_toothpaste' 
    | 'sodium_dart' 
    | 'flash_flare' 
    | 'copper_plating'
    | 'blood_color_swirl'
    | 'magenta_swirl'
    | 'fuming_brown_gas'
    | 'explosion_burst';
  soundEffect?: 'fizz' | 'boil' | 'pop' | 'alarm' | 'pour';
}

export type VfxRecipe = ReactionVfxRecipe;

export const REACTION_VFX_RECIPES: Record<string, ReactionVfxRecipe> = {
  // 1. HCl + NaOH -> NaCl + H2O (Neutralization)
  'hcl_naoh_neutralization': {
    id: 'hcl_naoh_neutralization',
    name: 'HCl + NaOH Neutralization',
    duration: 4.5,
    layers: [
      { kind: 'colorFront', t: [0.0, 0.4], to: '#f8fafc', origin: 'pourPoint', speed: 2.2 },
      { kind: 'steam', t: [0.2, 0.7], density: 0.12 },
      { kind: 'sound', at: 0.05, id: 'pour' }
    ],
    steam: { active: true, rate: 8 },
    specialEffect: 'magenta_swirl',
    soundEffect: 'pour'
  },

  // 2. H2SO4 + 2NaOH -> Na2SO4 + 2H2O (Exothermic Neutralization)
  'h2so4_naoh_neutralization': {
    id: 'h2so4_naoh_neutralization',
    name: 'H2SO4 + NaOH Exothermic Neutralization',
    duration: 5.0,
    layers: [
      { kind: 'colorFront', t: [0.0, 0.5], to: '#f8fafc', origin: 'pourPoint', speed: 2.5 },
      { kind: 'steam', t: [0.1, 0.85], density: 0.35 },
      { kind: 'light', t: [0.1, 0.6], color: '#ffedd5', intensity: 0.4 }
    ],
    steam: { active: true, rate: 18 }
  },

  // 3. BaCl2 + H2SO4 -> BaSO4(s) + 2HCl (Milky BaSO4)
  'bacl2_h2so4_precipitate': {
    id: 'bacl2_h2so4_precipitate',
    name: 'Barium Sulfate Milky Precipitation',
    duration: 10.0,
    layers: [
      { kind: 'turbidity', t: [0.0, 0.45], color: '#ffffff', peak: 0.92 },
      { kind: 'precipitate', t: [0.05, 1.0], style: 'milky', color: '#ffffff', settleTime: 9.5, substance: 'BaSO4' },
      { kind: 'colorFront', t: [0.0, 0.4], to: '#ffffff', origin: 'pourPoint', speed: 1.5 }
    ],
    precipitate: { substance: 'BaSO4', color: '#ffffff', morphology: 'curd', rate: 32, settleTime: 9.5 }
  },

  // 4. AgNO3 + NaCl -> AgCl(s) + NaNO3 (Curdy White)
  'agno3_nacl_precipitate': {
    id: 'agno3_nacl_precipitate',
    name: 'Silver Chloride Curdy Precipitation',
    duration: 7.5,
    layers: [
      { kind: 'precipitate', t: [0.0, 0.85], style: 'curdy', color: '#f8fafc', settleTime: 6.0, substance: 'AgCl' },
      { kind: 'turbidity', t: [0.0, 0.5], color: '#ffffff', peak: 0.82 },
      { kind: 'sound', at: 0.02, id: 'pour' }
    ],
    precipitate: { substance: 'AgCl', color: '#f8fafc', morphology: 'curd', rate: 35, settleTime: 6.0 }
  },

  // 4b. AgNO3 + KI -> AgI(s) + KNO3 (Pale Yellow Curd)
  'agno3_ki_precipitate': {
    id: 'agno3_ki_precipitate',
    name: 'Silver Iodide Pale Yellow Curdy Precipitation',
    duration: 7.5,
    layers: [
      { kind: 'precipitate', t: [0.0, 0.85], style: 'curdy', color: '#fef08a', settleTime: 6.5, substance: 'AgI' },
      { kind: 'turbidity', t: [0.0, 0.5], color: '#fef9c3', peak: 0.85 },
      { kind: 'sound', at: 0.02, id: 'pour' }
    ],
    precipitate: { substance: 'AgI', color: '#fef08a', morphology: 'curd', rate: 30, settleTime: 6.5 }
  },

  // 5. 2KI + Pb(NO3)2 -> PbI2(s) + 2KNO3 ("Golden Rain")
  'golden_rain_pbi2': {
    id: 'golden_rain_pbi2',
    name: 'Golden Rain (Lead Iodide Hexagonal Flakes)',
    duration: 14.0,
    layers: [
      { kind: 'precipitate', t: [0.02, 1.0], style: 'flake-gold', color: '#fbbf24', settleTime: 12.0, substance: 'PbI2' },
      { kind: 'turbidity', t: [0.15, 0.9], color: '#fef08a', peak: 0.70 },
      { kind: 'colorFront', t: [0.25, 0.85], to: '#fef08a', origin: 'pourPoint', speed: 0.95 },
      { kind: 'light', t: [0.1, 0.95], color: '#fde047', intensity: 1.8, flicker: 0.12 }
    ],
    precipitate: { substance: 'PbI2', color: '#fbbf24', morphology: 'flake', rate: 48, settleTime: 12.0 },
    specialEffect: 'golden_rain'
  },

  // 6. CuSO4 + 2NaOH -> Cu(OH)2(s) + Na2SO4 (Gelatinous Blue Gel)
  'cuso4_naoh_precipitate': {
    id: 'cuso4_naoh_precipitate',
    name: 'Copper(II) Hydroxide Blue Gel',
    duration: 9.5,
    layers: [
      { kind: 'precipitate', t: [0.0, 0.95], style: 'gel', color: '#0284c7', settleTime: 11.0, substance: 'Cu(OH)2' },
      { kind: 'colorFront', t: [0.05, 0.65], from: '#0284c7', to: '#bae6fd', origin: 'pourPoint', speed: 1.1 }
    ],
    precipitate: { substance: 'Cu(OH)2', color: '#0284c7', morphology: 'gel', rate: 28, settleTime: 11.0 }
  },

  // 6b. FeCl3 + 3NaOH -> Fe(OH)3(s) + 3NaCl (Rust-Brown Flocculent Precipitate)
  'fecl3_naoh_precipitate': {
    id: 'fecl3_naoh_precipitate',
    name: 'Iron(III) Hydroxide Rust-Brown Flocculation',
    duration: 8.5,
    layers: [
      { kind: 'precipitate', t: [0.0, 0.95], style: 'curdy', color: '#9a3412', settleTime: 9.0, substance: 'Fe(OH)3' },
      { kind: 'turbidity', t: [0.02, 0.75], color: '#b45309', peak: 0.85 },
      { kind: 'colorFront', t: [0.05, 0.65], from: '#f59e0b', to: '#b45309', origin: 'pourPoint', speed: 1.2 }
    ],
    precipitate: { substance: 'Fe(OH)3', color: '#9a3412', morphology: 'floc', rate: 30, settleTime: 9.0 }
  },

  // 6c. CaCl2 + Na2CO3 -> CaCO3(s) + 2NaCl (Chalky Calcite Grains)
  'cacl2_na2co3_precipitate': {
    id: 'cacl2_na2co3_precipitate',
    name: 'Calcium Carbonate Calcite Grain Precipitation',
    duration: 7.0,
    layers: [
      { kind: 'precipitate', t: [0.0, 0.9], style: 'milky', color: '#e2e8f0', settleTime: 5.5, substance: 'CaCO3' },
      { kind: 'turbidity', t: [0.0, 0.6], color: '#f1f5f9', peak: 0.88 }
    ],
    precipitate: { substance: 'CaCO3', color: '#e2e8f0', morphology: 'powder', rate: 32, settleTime: 5.5 }
  },

  // 7. Fe + CuSO4 -> FeSO4 + Cu(s) (Reddish Copper Coating)
  'fe_cuso4_displacement': {
    id: 'fe_cuso4_displacement',
    name: 'Iron in Copper Sulfate (Displacement)',
    duration: 14.0,
    layers: [
      { kind: 'solidDissolve', target: 'Fe', style: 'coat-copper' },
      { kind: 'precipitate', t: [0.15, 0.95], style: 'metal-copper', color: '#b45309', settleTime: 11.0, substance: 'Cu' },
      { kind: 'colorFront', t: [0.12, 0.9], from: '#0284c7', to: '#86efac', origin: 'solidSurface', speed: 0.85 }
    ],
    precipitate: { substance: 'Cu', color: '#b45309', morphology: 'curd', rate: 14 },
    specialEffect: 'copper_plating'
  },

  // 7b. Zn + CuSO4 -> ZnSO4 + Cu(s) (Spongy Dark Copper & Decolorization to Colorless ZnSO4)
  'zn_cuso4_displacement': {
    id: 'zn_cuso4_displacement',
    name: 'Zinc in Copper Sulfate (Displacement)',
    duration: 12.0,
    layers: [
      { kind: 'solidDissolve', target: 'Zn', style: 'coat-copper' },
      { kind: 'precipitate', t: [0.1, 0.95], style: 'metal-copper', color: '#451a03', settleTime: 10.0, substance: 'Cu' },
      { kind: 'colorFront', t: [0.1, 0.9], from: '#0284c7', to: '#f8fafc', origin: 'solidSurface', speed: 0.9 }
    ],
    precipitate: { substance: 'Cu', color: '#451a03', morphology: 'curd', rate: 16 },
    specialEffect: 'copper_plating'
  },

  // 8. CaCO3 + 2HCl -> CaCl2 + CO2(g) + H2O (Limestone Bubbles & Dense CO2 Fog)
  'caco3_hcl_gas': {
    id: 'caco3_hcl_gas',
    name: 'Calcium Carbonate Gas Evolution',
    duration: 6.0,
    layers: [
      { kind: 'bubbles', t: [0.0, 0.85], rate: 85, size: [0.02, 0.045], emitter: 'solid', color: '#f8fafc', gasType: 'CO2' },
      { kind: 'foam', t: [0.05, 0.7], rate: 12, viscous: false },
      { kind: 'gasPlume', t: [0.1, 0.9], color: '#f1f5f9', density: 0.55, heavy: true, buoyancy: -0.15, curl: 0.4 },
      { kind: 'solidDissolve', target: 'CaCO3', style: 'shrink' },
      { kind: 'sound', at: 0.05, id: 'fizz' }
    ],
    bubbles: { rate: 85, gasType: 'CO2', color: '#f8fafc', emitter: 'solid' },
    gasPlume: { color: '#f1f5f9', density: 'heavy', rate: 22, turbidity: 0.4, buoyancy: -0.15 },
    foam: { active: true, growthMultiplier: 1.8 },
    soundEffect: 'fizz'
  },

  // 9. Zn + 2HCl -> ZnCl2 + H2(g) (Zinc Acid Rapid Hydrogen Microbubbles)
  'zn_hcl_gas': {
    id: 'zn_hcl_gas',
    name: 'Zinc Acid Rapid Hydrogen Evolution',
    duration: 5.5,
    layers: [
      { kind: 'bubbles', t: [0.0, 0.9], rate: 140, size: [0.008, 0.02], emitter: 'solid', color: '#ffffff', gasType: 'H2' },
      { kind: 'gasPlume', t: [0.1, 0.8], color: '#ffffff', density: 0.15, heavy: false, buoyancy: 0.4 },
      { kind: 'solidDissolve', target: 'Zn', style: 'shrink' },
      { kind: 'sound', at: 0.04, id: 'fizz' }
    ],
    bubbles: { rate: 140, gasType: 'H2', color: '#ffffff', emitter: 'solid' },
    gasPlume: { color: '#ffffff', density: 'light', rate: 12, turbidity: 0.2, buoyancy: 0.4 },
    soundEffect: 'fizz'
  },

  // 10. Mg + 2HCl -> MgCl2 + H2(g) (Violent Magnesium Effervescence & Steam)
  'mg_hcl_gas': {
    id: 'mg_hcl_gas',
    name: 'Magnesium Violent Acid Reaction',
    duration: 4.0,
    layers: [
      { kind: 'bubbles', t: [0.0, 0.95], rate: 240, size: [0.015, 0.035], emitter: 'solid', color: '#ffffff', gasType: 'H2' },
      { kind: 'foam', t: [0.05, 0.85], rate: 24, viscous: false },
      { kind: 'steam', t: [0.1, 0.9], density: 0.75 },
      { kind: 'gasPlume', t: [0.05, 0.9], color: '#ffffff', density: 0.7, heavy: false, buoyancy: 0.5 },
      { kind: 'solidDissolve', target: 'Mg', style: 'shrink' },
      { kind: 'sound', at: 0.02, id: 'fizz' }
    ],
    bubbles: { rate: 240, gasType: 'H2', color: '#ffffff', emitter: 'solid' },
    steam: { active: true, rate: 30 },
    foam: { active: true, growthMultiplier: 2.8 },
    soundEffect: 'fizz'
  },

  // 11. 2H2O2 -> 2H2O + O2 (MnO2 Catalyst - Elephant Toothpaste Foam Eruption)
  'h2o2_mno2_decomposition': {
    id: 'h2o2_mno2_decomposition',
    name: 'Elephant Toothpaste Foam Eruption',
    duration: 6.0,
    layers: [
      { kind: 'bubbles', t: [0.0, 0.95], rate: 90, emitter: 'bulk', color: '#ffffff', gasType: 'O2' },
      { kind: 'foam', t: [0.05, 1.0], rate: 45, viscous: true },
      { kind: 'steam', t: [0.1, 0.9], density: 0.85 },
      { kind: 'sound', at: 0.05, id: 'boil' }
    ],
    bubbles: { rate: 90, gasType: 'O2', color: '#ffffff', emitter: 'bulk' },
    steam: { active: true, rate: 35 },
    foam: { active: true, growthMultiplier: 4.5, viscous: true },
    specialEffect: 'elephant_toothpaste',
    soundEffect: 'boil'
  },

  // 12. NH3 + HCl -> NH4Cl(s) (Dense Billowing White Fumes)
  'nh3_hcl_fumes': {
    id: 'nh3_hcl_fumes',
    name: 'Ammonium Chloride Dense White Smoke',
    duration: 5.5,
    layers: [
      { kind: 'gasPlume', t: [0.0, 1.0], color: '#ffffff', density: 1.0, heavy: false, buoyancy: 0.15, curl: 0.65 },
      { kind: 'turbidity', t: [0.05, 0.9], color: '#ffffff', peak: 0.6 }
    ],
    gasPlume: { color: '#ffffff', density: 'heavy', rate: 45, turbidity: 0.95, buoyancy: 0.15 }
  },

  // 13. Na2CO3 + 2HCl -> 2NaCl + CO2(g) + H2O (Uniform Soda Bulk Effervescence)
  'na2co3_hcl_gas': {
    id: 'na2co3_hcl_gas',
    name: 'Sodium Carbonate Bulk Effervescence',
    duration: 4.5,
    layers: [
      { kind: 'bubbles', t: [0.0, 0.8], rate: 120, emitter: 'bulk', color: '#f8fafc', gasType: 'CO2' },
      { kind: 'gasPlume', t: [0.05, 0.7], color: '#f1f5f9', density: 0.35, heavy: true, buoyancy: -0.1 },
      { kind: 'sound', at: 0.02, id: 'fizz' }
    ],
    bubbles: { rate: 120, gasType: 'CO2', color: '#f8fafc', emitter: 'bulk' },
    gasPlume: { color: '#f1f5f9', density: 'neutral', rate: 15, turbidity: 0.3 },
    soundEffect: 'fizz'
  },

  // 13b. NaHCO3 + HCl -> NaCl + CO2(g) + H2O (Bicarbonate Rapid Effervescence)
  'nahco3_hcl_gas': {
    id: 'nahco3_hcl_gas',
    name: 'Sodium Bicarbonate Rapid Acid Effervescence',
    duration: 4.5,
    layers: [
      { kind: 'bubbles', t: [0.0, 0.85], rate: 110, emitter: 'bulk', color: '#f8fafc', gasType: 'CO2' },
      { kind: 'gasPlume', t: [0.05, 0.75], color: '#f1f5f9', density: 0.4, heavy: true, buoyancy: -0.08 },
      { kind: 'sound', at: 0.02, id: 'fizz' }
    ],
    bubbles: { rate: 110, gasType: 'CO2', color: '#f8fafc', emitter: 'bulk' },
    gasPlume: { color: '#f1f5f9', density: 'neutral', rate: 18, turbidity: 0.35 },
    soundEffect: 'fizz'
  },

  // 14. Cu(OH)2 -> CuO + H2O (Thermal Decomposition Blue -> Jet Black)
  'cuoh2_thermal_decomposition': {
    id: 'cuoh2_thermal_decomposition',
    name: 'Copper(II) Hydroxide Thermal Decomposition',
    duration: 6.0,
    layers: [
      { kind: 'colorFront', t: [0.05, 0.95], from: '#0284c7', to: '#18181b', origin: 'bottom', speed: 1.1 },
      { kind: 'precipitate', t: [0.1, 1.0], style: 'powder-black', color: '#18181b', settleTime: 4.0, substance: 'CuO' },
      { kind: 'steam', t: [0.2, 0.9], density: 0.35 }
    ],
    steam: { active: true, rate: 18 },
    precipitate: { substance: 'CuO', color: '#18181b', morphology: 'curd', rate: 20 }
  },

  // 15. I2(s) -> I2(g) (Iodine Sublimation Rich Purple Gas)
  'iodine_sublimation': {
    id: 'iodine_sublimation',
    name: 'Iodine Sublimation Dense Purple Vapor',
    duration: 6.5,
    layers: [
      { kind: 'gasPlume', t: [0.05, 1.0], color: '#9333ea', density: 0.9, heavy: true, buoyancy: 0.08, curl: 0.3 },
      { kind: 'light', t: [0.1, 0.9], color: '#a855f7', intensity: 0.8 }
    ],
    gasPlume: { color: '#9333ea', density: 'heavy', rate: 35, turbidity: 0.9, buoyancy: 0.08 }
  },

  // 16. H2O into Conc H2SO4 (CRITICAL SAFETY EXPLOSION)
  'water_into_conc_h2so4_explosion': {
    id: 'water_into_conc_h2so4_explosion',
    name: 'Violent Acid Splattering Explosion',
    duration: 2.2,
    layers: [
      { kind: 'burst', at: 0.08, droplets: 140, speed: 4.5, steam: 1.0, shockwave: true },
      { kind: 'flash', at: 0.08, color: '#fca5a5', intensity: 3.5, duration: 0.4 },
      { kind: 'shake', t: [0.08, 0.55], trauma: 0.85 },
      { kind: 'slowmo', t: [0.08, 0.65], scale: 0.3 },
      { kind: 'steam', t: [0.08, 0.95], density: 0.95 },
      { kind: 'sound', at: 0.08, id: 'alarm' }
    ],
    steam: { active: true, rate: 45 },
    specialEffect: 'explosion_burst',
    soundEffect: 'alarm'
  },

  // 17. 2Na + 2H2O -> 2NaOH + H2(g) (Sodium Fire Dart & Miniature Pop)
  'sodium_water_reaction': {
    id: 'sodium_water_reaction',
    name: 'Sodium Metal Water Dart & Ignition',
    duration: 8.5,
    layers: [
      { kind: 'bubbles', t: [0.0, 0.9], rate: 50, emitter: 'surfaceOnly', color: '#fef08a', gasType: 'H2' },
      { kind: 'gasPlume', t: [0.05, 0.9], color: '#ffffff', density: 0.55, heavy: false, buoyancy: 0.35 },
      { kind: 'colorFront', t: [0.12, 0.85], to: '#f43f5e', origin: 'pourPoint', speed: 1.2 },
      { kind: 'light', t: [0.4, 0.9], color: '#ffb300', intensity: 2.5, flicker: 0.35 },
      { kind: 'flash', at: 0.65, color: '#fbbf24', intensity: 2.2, duration: 0.25 },
      { kind: 'burst', at: 0.92, droplets: 35, speed: 2.6, steam: 0.45, shockwave: false },
      { kind: 'sound', at: 0.92, id: 'pop' }
    ],
    bubbles: { rate: 50, gasType: 'H2', color: '#fef08a', emitter: 'surfaceOnly' },
    gasPlume: { color: '#ffffff', density: 'light', rate: 28, turbidity: 0.7 },
    sparks: { active: true, rate: 30, burstCount: 16, color: '#f59e0b' },
    specialEffect: 'sodium_dart',
    soundEffect: 'pop'
  },

  // 17b. 2K + 2H2O -> 2KOH + H2(g) (Violent Lilac Reaction, Sparks & Pop)
  'potassium_water_reaction': {
    id: 'potassium_water_reaction',
    name: 'Potassium Metal Violent Water Reaction & Lilac Flame',
    duration: 7.0,
    layers: [
      { kind: 'bubbles', t: [0.0, 0.95], rate: 90, emitter: 'surfaceOnly', color: '#c084fc', gasType: 'H2' },
      { kind: 'gasPlume', t: [0.05, 0.95], color: '#f3e8ff', density: 0.7, heavy: false, buoyancy: 0.45 },
      { kind: 'colorFront', t: [0.08, 0.85], to: '#f43f5e', origin: 'pourPoint', speed: 1.5 },
      { kind: 'light', t: [0.2, 0.95], color: '#c084fc', intensity: 3.2, flicker: 0.3 },
      { kind: 'flash', at: 0.5, color: '#c084fc', intensity: 3.0, duration: 0.3 },
      { kind: 'burst', at: 0.85, droplets: 45, speed: 3.2, steam: 0.6, shockwave: false },
      { kind: 'sound', at: 0.85, id: 'pop' }
    ],
    bubbles: { rate: 90, gasType: 'H2', color: '#c084fc', emitter: 'surfaceOnly' },
    gasPlume: { color: '#f3e8ff', density: 'light', rate: 35, turbidity: 0.75 },
    sparks: { active: true, rate: 45, burstCount: 22, color: '#c084fc' },
    soundEffect: 'pop'
  },

  // 18. Cu + 4HNO3(conc) -> Cu(NO3)2 + 2NO2 + 2H2O (Fuming Red-Brown NO2)
  'cu_hno3_conc': {
    id: 'cu_hno3_conc',
    name: 'Copper in Concentrated Nitric Acid (NO2 Fumes)',
    duration: 6.0,
    layers: [
      { kind: 'bubbles', t: [0.0, 0.9], rate: 35, emitter: 'solid', color: '#78350f', gasType: 'NO2' },
      { kind: 'gasPlume', t: [0.05, 1.0], color: '#78350f', density: 0.95, heavy: true, buoyancy: 0.12, curl: 0.5 },
      { kind: 'colorFront', t: [0.0, 0.6], to: '#065f46', origin: 'solidSurface', speed: 1.5 },
      { kind: 'sound', at: 0.05, id: 'fizz' }
    ],
    bubbles: { rate: 35, gasType: 'NO2', color: '#78350f', emitter: 'solid' },
    gasPlume: { color: '#78350f', density: 'heavy', rate: 42, turbidity: 0.95, buoyancy: 0.12 },
    specialEffect: 'fuming_brown_gas',
    soundEffect: 'fizz'
  },

  // 19. Cu + 2H2SO4(conc) -(t°)-> CuSO4 + SO2 + 2H2O (Heated Copper Choking Gas)
  'cu_conc_h2so4_heated': {
    id: 'cu_conc_h2so4_heated',
    name: 'Copper in Hot Concentrated Sulfuric Acid',
    duration: 6.5,
    layers: [
      { kind: 'colorFront', t: [0.1, 0.8], to: '#0284c7', origin: 'solidSurface', speed: 1.0 },
      { kind: 'gasPlume', t: [0.15, 0.95], color: '#f1f5f9', density: 0.35, heavy: false, buoyancy: 0.2 },
      { kind: 'bubbles', t: [0.1, 0.9], rate: 25, emitter: 'solid', color: '#e2e8f0', gasType: 'SO2' },
      { kind: 'steam', t: [0.2, 0.9], density: 0.25 }
    ],
    bubbles: { rate: 25, gasType: 'SO2', color: '#e2e8f0', emitter: 'solid' },
    gasPlume: { color: '#f1f5f9', density: 'light', rate: 16, turbidity: 0.3, buoyancy: 0.2 },
    steam: { active: true, rate: 12 }
  },

  // 20. FeCl3 + 3KSCN -> Fe(SCN)3 (Blood Red Complex)
  'fecl3_kscn_complex': {
    id: 'fecl3_kscn_complex',
    name: 'Iron(III) Thiocyanate Blood-Red Complex',
    duration: 5.0,
    layers: [
      { kind: 'colorFront', t: [0.0, 0.45], to: '#7f1d1d', origin: 'pourPoint', speed: 2.4 },
      { kind: 'light', t: [0.1, 0.8], color: '#991b1b', intensity: 0.6 }
    ],
    specialEffect: 'blood_color_swirl'
  },

  // 21. 2KMnO4 + 5H2C2O4 -> Decolorization (Autocatalytic Redox)
  'kmno4_oxalic_redox': {
    id: 'kmno4_oxalic_redox',
    name: 'Potassium Permanganate Decolorization',
    duration: 6.0,
    layers: [
      { kind: 'colorFront', t: [0.2, 0.95], from: '#581c87', to: '#f8fafc', origin: 'bottom', speed: 1.6 },
      { kind: 'bubbles', t: [0.3, 0.9], rate: 30, emitter: 'bulk', color: '#f1f5f9', gasType: 'CO2' }
    ],
    bubbles: { rate: 30, gasType: 'CO2', color: '#f1f5f9', emitter: 'bulk' }
  },

  // 22. K2Cr2O7 + 2NaOH -> 2Na2CrO4 (Orange to Yellow Chromate Shift)
  'k2cr2o7_naoh_equilibrium': {
    id: 'k2cr2o7_naoh_equilibrium',
    name: 'Dichromate-Chromate Equilibrium (Orange -> Yellow)',
    duration: 4.5,
    layers: [
      { kind: 'colorFront', t: [0.0, 0.5], from: '#c2410c', to: '#facc15', origin: 'pourPoint', speed: 2.2 }
    ]
  },

  // 23. Iodine Clock: KIO3 + NaHSO3 + Starch (Clear to Midnight Blue-Black)
  'iodine_clock': {
    id: 'iodine_clock',
    name: 'Iodine Clock Sudden Blue-Black Transition',
    duration: 5.0,
    layers: [
      { kind: 'flash', at: 0.6, color: '#1e1b4b', intensity: 1.5, duration: 0.15 },
      { kind: 'colorFront', t: [0.6, 0.72], from: '#f8fafc', to: '#0f172a', origin: 'uniform', speed: 5.0 }
    ]
  },

  // 24. Na2S2O3 + 2HCl -> S(s) + SO2 (Colloidal Sulfur Disappearing Cross)
  'na2s2o3_hcl_turbidity': {
    id: 'na2s2o3_hcl_turbidity',
    name: 'Colloidal Sulfur Turbidity Growth',
    duration: 7.5,
    layers: [
      { kind: 'turbidity', t: [0.1, 1.0], color: '#fef08a', peak: 0.96 },
      { kind: 'precipitate', t: [0.15, 1.0], style: 'milky', color: '#fef9c3', settleTime: 12.0, substance: 'S' }
    ],
    precipitate: { substance: 'S', color: '#fef9c3', morphology: 'curd', rate: 15, settleTime: 12.0 }
  },

  // 25. CuSO4 + 4NH3 -> [Cu(NH3)4]2+ (Deep Royal Blue Complex)
  'cuso4_nh3_complex': {
    id: 'cuso4_nh3_complex',
    name: 'Tetraamminecopper(II) Royal Blue Complex',
    duration: 5.5,
    layers: [
      { kind: 'precipitate', t: [0.0, 0.25], style: 'gel', color: '#38bdf8', settleTime: 3.0, substance: 'Cu(OH)2' },
      { kind: 'colorFront', t: [0.25, 0.8], from: '#38bdf8', to: '#1d4ed8', origin: 'pourPoint', speed: 2.0 }
    ],
    precipitate: { substance: 'Cu(OH)2', color: '#38bdf8', morphology: 'gel', rate: 10 }
  },

  // 26. Al2(SO4)3 + NaOH -> Al(OH)3 (Amphoteric Gel Redissolving)
  'al2so4_naoh_amphoteric': {
    id: 'al2so4_naoh_amphoteric',
    name: 'Amphoteric Aluminum Hydroxide Gel Redissolution',
    duration: 6.0,
    layers: [
      { kind: 'precipitate', t: [0.0, 0.4], style: 'gel', color: '#f8fafc', settleTime: 4.0, substance: 'Al(OH)3' },
      { kind: 'colorFront', t: [0.45, 0.9], from: '#f8fafc', to: '#e2e8f0', origin: 'uniform', speed: 2.5 }
    ],
    precipitate: { substance: 'Al(OH)3', color: '#f8fafc', morphology: 'gel', rate: 18 }
  },

  // 27. 2Mg + O2 -> 2MgO (Blinding White Magnesium Burn)
  'burn_magnesium': {
    id: 'burn_magnesium',
    name: 'Magnesium Ribbon Blinding Combustion',
    duration: 4.5,
    layers: [
      { kind: 'light', t: [0.05, 0.85], color: '#ffffff', intensity: 4.5, flicker: 0.1 },
      { kind: 'flash', at: 0.1, color: '#ffffff', intensity: 5.0, duration: 0.5 },
      { kind: 'gasPlume', t: [0.1, 1.0], color: '#ffffff', density: 1.0, heavy: false, buoyancy: 0.45 },
      { kind: 'burst', at: 0.15, droplets: 15, speed: 2.0, steam: 1.0 }
    ],
    gasPlume: { color: '#ffffff', density: 'heavy', rate: 50, turbidity: 1.0 },
    sparks: { active: true, rate: 40, color: '#ffffff' }
  },

  // 28. Copper Wire Loop Flame Test (Azure Blue-Green 510 nm)
  'flame_test_copper': {
    id: 'flame_test_copper',
    name: 'Copper Atomic Emission Flame Test (Emerald/Cyan)',
    duration: 5.0,
    layers: [
      { kind: 'light', t: [0.0, 1.0], color: '#10b981', intensity: 2.5, flicker: 0.25 },
      { kind: 'flash', at: 0.1, color: '#06b6d4', intensity: 2.2, duration: 0.3 }
    ]
  },

  // 29. Sodium Wire Loop Flame Test (Intense Yellow 589 nm)
  'flame_test_sodium': {
    id: 'flame_test_sodium',
    name: 'Sodium Atomic Emission Flame Test (589 nm Yellow)',
    duration: 5.0,
    layers: [
      { kind: 'light', t: [0.0, 1.0], color: '#f59e0b', intensity: 3.5, flicker: 0.15 }
    ]
  },

  // 30. Potassium Wire Loop Flame Test (Lilac 766 nm)
  'flame_test_potassium': {
    id: 'flame_test_potassium',
    name: 'Potassium Atomic Emission Flame Test (Lilac Violet)',
    duration: 5.0,
    layers: [
      { kind: 'light', t: [0.0, 1.0], color: '#c084fc', intensity: 1.8, flicker: 0.2 }
    ]
  }
};

/**
 * Converts a declarative ReactionProgram into a layered ReactionVfxRecipe
 */
export function programToRecipe(program: ReactionProgram): ReactionVfxRecipe {
  const layers: VfxRecipeLayer[] = [];
  let bubblesRate = 0;
  let bubblesColor: string | undefined;
  let bubblesGasType: string | undefined;
  let gasColor: string | undefined;
  let gasDensity: 'heavy' | 'light' | 'neutral' = 'neutral';
  let gasPlumeRate = 0;
  let steamActive = false;
  let steamRate = 0;
  let precipitateSubstance: string | undefined;
  let precipitateColor = '#ffffff';
  let precipitateMorphology: 'flake' | 'curd' | 'gel' = 'curd';
  let foamActive = false;
  let sparksActive = false;
  let sparksColor = '#f59e0b';
  let sparksRate = 30;
  let soundEffect: 'fizz' | 'boil' | 'pop' | 'alarm' | 'pour' | undefined;

  for (const atom of program.visual.timeline) {
    const w = atom.window || [0, 1];
    const p = atom.params || {};

    switch (atom.atom) {
      case 'nucleateBubbles': {
        const rate = (p.bubbleRate as number) || 30;
        const color = (p.color as string) || '#e0f2fe';
        const gasType = (p.gasSpecies as string) || 'H2';
        bubblesRate = Math.max(bubblesRate, rate);
        bubblesColor = color;
        bubblesGasType = gasType;
        layers.push({ kind: 'bubbles', t: w, rate, color, emitter: 'bottom', gasType });
        break;
      }
      case 'effervescenceBurst': {
        const intensity = (p.intensity as number) || 2.0;
        const rate = Math.round(intensity * 25);
        const gasType = (p.gasSpecies as string) || 'CO2';
        bubblesRate = Math.max(bubblesRate, rate);
        bubblesGasType = gasType;
        layers.push({ kind: 'bubbles', t: w, rate, emitter: 'bottom', gasType });
        break;
      }
      case 'buoyantGasPlume': {
        const color = (p.colorHex as string) || (p.color as string) || (p.gasSpecies ? GAS_SPECIES_TABLE[p.gasSpecies as GasSpecies]?.colorHex : undefined) || '#ffffff';
        gasColor = color;
        gasDensity = 'neutral';
        gasPlumeRate = Math.max(gasPlumeRate, 25);
        layers.push({ kind: 'gasPlume', t: w, color, density: 0.6, heavy: false, buoyancy: 0.3 });
        break;
      }
      case 'heavyVaporPour': {
        const color = (p.colorHex as string) || (p.color as string) || (p.gasSpecies ? GAS_SPECIES_TABLE[p.gasSpecies as GasSpecies]?.colorHex : undefined) || '#9a3412';
        gasColor = color;
        gasDensity = 'heavy';
        gasPlumeRate = Math.max(gasPlumeRate, 35);
        layers.push({ kind: 'gasPlume', t: w, color, density: 0.9, heavy: true, buoyancy: -0.2 });
        break;
      }
      case 'thermalSteam': {
        steamActive = true;
        const density = (p.steamDensity as number) || 0.4;
        steamRate = Math.max(steamRate, density * 30);
        layers.push({ kind: 'steam', t: w, density });
        break;
      }
      case 'precipitateNucleation':
      case 'curdyPrecipitation':
      case 'finePowderPrecipitation':
      case 'flocculentPrecipitation':
      case 'gelationNetwork':
      case 'crystallinePlates':
      case 'crystallineNeedles': {
        const sub = (p.substance as string) || program.visual.after.precipitate?.substance || 'precipitate';
        const col = (p.colorHex as string) || (p.color as string) || program.visual.after.precipitate?.color || '#ffffff';
        const rawMorph = (p.morphology as string) || program.visual.after.precipitate?.morphology || 'curd';
        const morph = normalizeMorphology(rawMorph);
        const style = toRecipeStyle(morph) as any;
        precipitateSubstance = sub;
        precipitateColor = col;
        precipitateMorphology = style === 'gel' ? 'gel' : style === 'flake-gold' ? 'flake' : 'curd';
        layers.push({ kind: 'precipitate', t: w, style, color: col, settleTime: 8.0, substance: sub });
        break;
      }
      case 'cellularFoamGrowth': {
        foamActive = true;
        const rate = (p.foamExpansionRate as number) || 20;
        layers.push({ kind: 'foam', t: w, rate });
        break;
      }
      case 'pyrotechnicSparks':
      case 'energeticSparks': {
        sparksActive = true;
        sparksColor = (p.sparkColor as string) || (p.colorHex as string) || '#f59e0b';
        sparksRate = (p.sparkCount as number) || 35;
        break;
      }
      case 'combustionFlash': {
        const col = (p.colorHex as string) || '#fef08a';
        const intensity = (p.peakLuminance as number) || 3.0;
        layers.push({ kind: 'flash', at: w[0], color: col, intensity, duration: 0.4 });
        break;
      }
      case 'cameraShake': {
        const trauma = (p.trauma as number) || 0.4;
        layers.push({ kind: 'shake', t: w, trauma });
        break;
      }
      case 'cameraSlowMo': {
        const scale = (p.timeScale as number) || 0.25;
        layers.push({ kind: 'slowmo', t: w, scale });
        break;
      }
      case 'proceduralAcoustics': {
        const profile = (p.soundProfile as string) || 'fizz_effervescence';
        const snd = profile.includes('boil') ? 'boil' : profile.includes('pop') ? 'pop' : profile.includes('fizz') ? 'fizz' : 'pour';
        soundEffect = snd;
        layers.push({ kind: 'sound', at: w[0], id: snd });
        break;
      }
      case 'liquidSwirl':
      case 'beerLambertFade': {
        const toCol = (p.endColor as string) || (p.color as string) || program.visual.after.liquidColor || '#ffffff';
        layers.push({ kind: 'colorFront', t: w, to: toCol, origin: 'pourPoint', speed: 2.0 });
        break;
      }
    }
  }

  // If program.visual.after specifies precipitate but no precipitate atom in timeline
  if (program.visual.after.precipitate && !layers.some(l => l.kind === 'precipitate')) {
    const afterP = program.visual.after.precipitate;
    const morph = normalizeMorphology(afterP.morphology);
    const style = toRecipeStyle(morph) as any;
    precipitateSubstance = afterP.substance;
    precipitateColor = afterP.color || '#ffffff';
    precipitateMorphology = style === 'gel' ? 'gel' : style === 'flake-gold' ? 'flake' : 'curd';
    layers.push({ kind: 'precipitate', t: [0.0, 0.8], style, color: precipitateColor, settleTime: 8.0, substance: precipitateSubstance });
  }

  // If program produces gas but no bubble atom in timeline
  if (program.visual.after.gasesOffgassed && program.visual.after.gasesOffgassed.length > 0 && !layers.some(l => l.kind === 'bubbles')) {
    const gasSpecies = program.visual.after.gasesOffgassed[0].species;
    const gasInfo = GAS_SPECIES_TABLE[gasSpecies as GasSpecies];
    bubblesRate = 25;
    bubblesGasType = gasSpecies;
    bubblesColor = gasInfo?.colorHex || '#e0f2fe';
    layers.push({ kind: 'bubbles', t: [0.0, 0.8], rate: 25, color: bubblesColor, emitter: 'bottom', gasType: gasSpecies });
  }

  // If strongly exothermic
  if (program.chemistry.deltaH_kJ_per_mol && program.chemistry.deltaH_kJ_per_mol < -80 && !steamActive) {
    steamActive = true;
    steamRate = 12;
    layers.push({ kind: 'steam', t: [0.1, 0.8], density: 0.35 });
  }

  return {
    id: program.id,
    name: program.explain.observation_en || program.id,
    duration: program.visual.duration_s || 5.0,
    layers,
    bubbles: bubblesRate > 0 ? { rate: bubblesRate, color: bubblesColor, gasType: bubblesGasType, emitter: 'bottom' } : undefined,
    gasPlume: gasPlumeRate > 0 ? { color: gasColor || '#ffffff', density: gasDensity, rate: gasPlumeRate } : undefined,
    steam: steamActive ? { active: true, rate: steamRate } : undefined,
    precipitate: precipitateSubstance ? { substance: precipitateSubstance, color: precipitateColor, morphology: precipitateMorphology } : undefined,
    foam: foamActive ? { active: true, growthMultiplier: 1.5 } : undefined,
    sparks: sparksActive ? { active: true, color: sparksColor, rate: sparksRate } : undefined,
    soundEffect
  };
}

/**
 * Returns matching recipe by exact ID or canonical aliases
 */
export function getReactionVfxRecipe(reactionId?: string): ReactionVfxRecipe | null {
  if (!reactionId) return null;
  const rawLower = reactionId.toLowerCase().trim();
  const normalized = rawLower.replace(/[\s\(\)]/g, '').replace(/\+/g, '_');

  if (REACTION_VFX_RECIPES[rawLower]) return REACTION_VFX_RECIPES[rawLower];
  if (REACTION_VFX_RECIPES[normalized]) return REACTION_VFX_RECIPES[normalized];

  // Check 100+ program library
  const prog = getProgramById(reactionId) || getProgramById(rawLower) || getProgramById(normalized);
  if (prog) {
    return programToRecipe(prog);
  }

  // Canonical alias checks
  if (normalized.includes('caco3_hcl')) return REACTION_VFX_RECIPES['caco3_hcl_gas'];
  if (normalized.includes('zn_cuso4') || normalized.includes('cuso4_zn')) return REACTION_VFX_RECIPES['zn_cuso4_displacement'];
  if (normalized.includes('fe_cu') || normalized.includes('cuso4_fe') || (normalized.includes('displacement') && normalized.includes('fe'))) return REACTION_VFX_RECIPES['fe_cuso4_displacement'];
  if (normalized.includes('agno3_ki') || normalized.includes('ki_agno3')) return REACTION_VFX_RECIPES['agno3_ki_precipitate'];
  if (normalized.includes('agno3_nacl') || normalized.includes('agcl_precipitate')) return REACTION_VFX_RECIPES['agno3_nacl_precipitate'];
  if (normalized.includes('pbno3') || normalized.includes('pbi2') || normalized.includes('golden_rain')) return REACTION_VFX_RECIPES['golden_rain_pbi2'];
  if (normalized.includes('h2o2') || normalized.includes('mno2')) return REACTION_VFX_RECIPES['h2o2_mno2_decomposition'];
  if (normalized.includes('potassium_water') || normalized.includes('k_h2o') || normalized.includes('k+h2o') || normalized.includes('alkali_metal_water_k')) return REACTION_VFX_RECIPES['potassium_water_reaction'];
  if (normalized.includes('sodium_water') || normalized.includes('na_h2o') || normalized.includes('sodium_dart') || normalized.includes('alkali_metal_water_na')) return REACTION_VFX_RECIPES['sodium_water_reaction'];
  if (normalized.includes('zn_hcl')) return REACTION_VFX_RECIPES['zn_hcl_gas'];
  if (normalized.includes('mg_hcl')) return REACTION_VFX_RECIPES['mg_hcl_gas'];
  if (normalized.includes('nh3_hcl') || normalized.includes('fumes')) return REACTION_VFX_RECIPES['nh3_hcl_fumes'];
  if (normalized.includes('nahco3_hcl') || normalized.includes('hcl_nahco3')) return REACTION_VFX_RECIPES['nahco3_hcl_gas'];
  if (normalized.includes('na2co3_hcl') || normalized.includes('hcl_na2co3')) return REACTION_VFX_RECIPES['na2co3_hcl_gas'];
  if (normalized.includes('h2so4_naoh')) return REACTION_VFX_RECIPES['h2so4_naoh_neutralization'];
  if (normalized.includes('hcl_naoh') || normalized.includes('titration')) return REACTION_VFX_RECIPES['hcl_naoh_neutralization'];
  if (normalized.includes('cuso4_naoh')) return REACTION_VFX_RECIPES['cuso4_naoh_precipitate'];
  if (normalized.includes('fecl3_naoh') || normalized.includes('feoh3')) return REACTION_VFX_RECIPES['fecl3_naoh_precipitate'];
  if (normalized.includes('cacl2_na2co3')) return REACTION_VFX_RECIPES['cacl2_na2co3_precipitate'];
  if (normalized.includes('cuoh2') || normalized.includes('thermal_decomp')) return REACTION_VFX_RECIPES['cuoh2_thermal_decomposition'];
  if (normalized.includes('iodine_sub') || normalized.includes('i2_sub')) return REACTION_VFX_RECIPES['iodine_sublimation'];
  if (normalized.includes('water_into') || normalized.includes('explosion') || normalized.includes('hazard')) return REACTION_VFX_RECIPES['water_into_conc_h2so4_explosion'];
  if (normalized.includes('cu_hno3') || normalized.includes('no2')) return REACTION_VFX_RECIPES['cu_hno3_conc'];
  if (normalized.includes('cu_conc_h2so4') || normalized.includes('cu_h2so4')) return REACTION_VFX_RECIPES['cu_conc_h2so4_heated'];
  if (normalized.includes('bacl2') || normalized.includes('baso4')) return REACTION_VFX_RECIPES['bacl2_h2so4_precipitate'];

  // Complex & kinetics reactions
  if (normalized.includes('fecl3_kscn') || normalized.includes('kscn') || normalized.includes('thiocyanate')) return REACTION_VFX_RECIPES['fecl3_kscn_complex'];
  if (normalized.includes('kmno4') || normalized.includes('oxalic') || normalized.includes('permanganate')) return REACTION_VFX_RECIPES['kmno4_oxalic_redox'];
  if (normalized.includes('cr2o7') || normalized.includes('chromate') || normalized.includes('dichromate')) return REACTION_VFX_RECIPES['k2cr2o7_naoh_equilibrium'];
  if (normalized.includes('kio3') || normalized.includes('landolt') || normalized.includes('clock') || normalized.includes('iodine_clock')) return REACTION_VFX_RECIPES['iodine_clock'];
  if (normalized.includes('na2s2o3') || normalized.includes('thiosulfate') || normalized.includes('turbidity')) return REACTION_VFX_RECIPES['na2s2o3_hcl_turbidity'];
  if (normalized.includes('cuso4_nh3') || normalized.includes('copper_ammonia')) return REACTION_VFX_RECIPES['cuso4_nh3_complex'];
  if (normalized.includes('al2so4') || normalized.includes('al_naoh') || normalized.includes('amphoteric')) return REACTION_VFX_RECIPES['al2so4_naoh_amphoteric'];

  // Combustion & flame tests
  if (normalized.includes('mg_o2') || normalized.includes('magnesium_burn') || normalized.includes('burn_mg') || normalized.includes('burn_magnesium')) return REACTION_VFX_RECIPES['burn_magnesium'];
  if (normalized.includes('flame_cu') || normalized.includes('copper_flame')) return REACTION_VFX_RECIPES['flame_test_copper'];
  if (normalized.includes('flame_na') || normalized.includes('sodium_flame')) return REACTION_VFX_RECIPES['flame_test_sodium'];
  if (normalized.includes('flame_k') || normalized.includes('potassium_flame')) return REACTION_VFX_RECIPES['flame_test_potassium'];

  return null;
}

/**
 * Samples a recipe at a specific progress (0.0 to 1.0) and returns the instantaneous active layer parameters
 */
export function sampleRecipeProgress(recipe: ReactionVfxRecipe, progress: number) {
  const p = Math.max(0, Math.min(1, progress));
  
  let bubblesRate = 0;
  let bubblesColor: string | undefined;
  let bubblesGasType: string | undefined;
  let bubblesEmitter: 'solid' | 'bulk' | 'bottom' | 'surfaceOnly' = 'bottom';

  let gasColor: string | undefined;
  let gasDensity = 0;
  let gasHeavy = false;
  let gasBuoyancy = 0.2;

  let steamDensity = 0;

  let precipitateActive = false;
  let precipitateColor: string | undefined;
  let precipitateStyle: string | undefined;
  let precipitateSubstance: string | undefined;

  let foamRate = 0;
  let foamViscous = false;

  let lightColor: string | undefined;
  let lightIntensity = 0;

  let shockwaveTrigger = false;
  let burstDroplets = 0;
  let trauma = 0;
  let slowmoScale = 1.0;

  for (const layer of recipe.layers) {
    if ('t' in layer) {
      const [t0, t1] = layer.t;
      if (p >= t0 && p <= t1) {
        const factor = (p - t0) / Math.max(0.001, t1 - t0);
        switch (layer.kind) {
          case 'bubbles':
            bubblesRate = Math.max(bubblesRate, layer.rate);
            bubblesColor = layer.color;
            bubblesGasType = layer.gasType;
            bubblesEmitter = layer.emitter;
            break;
          case 'gasPlume':
            gasColor = layer.color;
            gasDensity = Math.max(gasDensity, layer.density);
            gasHeavy = !!layer.heavy;
            gasBuoyancy = layer.buoyancy;
            break;
          case 'steam':
            steamDensity = Math.max(steamDensity, layer.density);
            break;
          case 'precipitate':
            precipitateActive = true;
            precipitateColor = layer.color;
            precipitateStyle = layer.style;
            precipitateSubstance = layer.substance;
            break;
          case 'foam':
            foamRate = Math.max(foamRate, layer.rate);
            foamViscous = !!layer.viscous;
            break;
          case 'light':
            lightColor = layer.color;
            lightIntensity = Math.max(lightIntensity, layer.intensity);
            break;
          case 'shake':
            trauma = Math.max(trauma, layer.trauma * (1 - factor));
            break;
          case 'slowmo':
            slowmoScale = layer.scale;
            break;
        }
      }
    } else if ('at' in layer) {
      if (Math.abs(p - layer.at) < 0.05) {
        if (layer.kind === 'burst') {
          burstDroplets = layer.droplets;
          if (layer.shockwave) shockwaveTrigger = true;
        }
      }
    }
  }

  return {
    bubblesRate,
    bubblesColor,
    bubblesGasType,
    bubblesEmitter,
    gasColor,
    gasDensity,
    gasHeavy,
    gasBuoyancy,
    steamDensity,
    precipitateActive,
    precipitateColor,
    precipitateStyle,
    precipitateSubstance,
    foamRate,
    foamViscous,
    lightColor,
    lightIntensity,
    shockwaveTrigger,
    burstDroplets,
    trauma,
    slowmoScale
  };
}
