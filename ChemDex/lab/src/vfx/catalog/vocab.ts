/**
 * vocab.ts — Canonical Vocabularies for ChemDex Lab Simulation & Effect-Director
 * 
 * Single source of truth for phases, precipitate morphologies, gas species,
 * heat classes, anchors, and legacy adapter functions.
 */

// 1. Phases
export type Phase = 's' | 'l' | 'g' | 'aq';

// 2. Precipitate Morphology
export type PrecipMorphology =
  | 'fine_powder'       // BaSO4, milky suspension, extremely slow Stokes settling
  | 'curd'              // AgCl, cottage-cheese clumping
  | 'floc'              // Fe(OH)3, loose rust-brown feathery flocs
  | 'gel'               // Cu(OH)2, Al(OH)3, hydrated viscous transparent network
  | 'crystal_plate'     // PbI2, hexagonal golden glints
  | 'crystal_needle'    // CaSO4, sharp needles
  | 'crystal_cubic'     // NaCl, recrystallized cubic crystals
  | 'granular'          // CaCO3 grit, MnO2 coarse particles
  | 'dendrite'          // Ag/Cu/Pb metallic branching trees
  | 'metallic_film'     // Tollens silver mirror, metallic lustrous film
  | 'colloid'           // Colloidal sulfur, Prussian blue, non-settling Tyndall haze
  | 'amorphous_black';  // CuS, PbS, FeS, carbon soot

export interface PrecipMorphologyInfo {
  id: PrecipMorphology;
  name_en: string;
  name_vi: string;
  stokesRadius_um: number;
  settlingMultiplier: number;
  bedPorosity: number;
  opticalTurbidity: number;
}

export const PRECIP_MORPHOLOGY_PROPERTIES: Record<PrecipMorphology, PrecipMorphologyInfo> = {
  fine_powder: {
    id: 'fine_powder',
    name_en: 'Fine Milky Powder',
    name_vi: 'Bột mịn huyền phù (đục sữa)',
    stokesRadius_um: 0.5,
    settlingMultiplier: 0.05,
    bedPorosity: 0.60,
    opticalTurbidity: 0.95,
  },
  curd: {
    id: 'curd',
    name_en: 'Curdy Clumps',
    name_vi: 'Kết tủa vón cục (dạng phô mai)',
    stokesRadius_um: 4.5,
    settlingMultiplier: 1.2,
    bedPorosity: 0.85,
    opticalTurbidity: 0.85,
  },
  floc: {
    id: 'floc',
    name_en: 'Flocculent Flakes',
    name_vi: 'Kết tủa dạng bông cặn',
    stokesRadius_um: 3.5,
    settlingMultiplier: 0.7,
    bedPorosity: 0.90,
    opticalTurbidity: 0.80,
  },
  gel: {
    id: 'gel',
    name_en: 'Gelatinous Network',
    name_vi: 'Dạng keo nhớt thể tích lớn',
    stokesRadius_um: 6.0,
    settlingMultiplier: 0.3,
    bedPorosity: 0.95,
    opticalTurbidity: 0.65,
  },
  crystal_plate: {
    id: 'crystal_plate',
    name_en: 'Crystalline Plates',
    name_vi: 'Tinh thể vảy lấp lánh',
    stokesRadius_um: 8.0,
    settlingMultiplier: 1.8,
    bedPorosity: 0.55,
    opticalTurbidity: 0.75,
  },
  crystal_needle: {
    id: 'crystal_needle',
    name_en: 'Crystalline Needles',
    name_vi: 'Tinh thể hình kim',
    stokesRadius_um: 7.0,
    settlingMultiplier: 1.4,
    bedPorosity: 0.70,
    opticalTurbidity: 0.70,
  },
  crystal_cubic: {
    id: 'crystal_cubic',
    name_en: 'Cubic Crystals',
    name_vi: 'Tinh thể lập phương',
    stokesRadius_um: 10.0,
    settlingMultiplier: 2.2,
    bedPorosity: 0.50,
    opticalTurbidity: 0.60,
  },
  granular: {
    id: 'granular',
    name_en: 'Granular Grit',
    name_vi: 'Hạt lợn cợn dạng cát sỏi',
    stokesRadius_um: 12.0,
    settlingMultiplier: 2.5,
    bedPorosity: 0.45,
    opticalTurbidity: 0.70,
  },
  dendrite: {
    id: 'dendrite',
    name_en: 'Metallic Dendrite',
    name_vi: 'Cành cây kim loại phân nhánh',
    stokesRadius_um: 15.0,
    settlingMultiplier: 3.0,
    bedPorosity: 0.80,
    opticalTurbidity: 0.50,
  },
  metallic_film: {
    id: 'metallic_film',
    name_en: 'Metallic Film / Mirror',
    name_vi: 'Màng gương kim loại tráng thành',
    stokesRadius_um: 0.1,
    settlingMultiplier: 0.0,
    bedPorosity: 0.10,
    opticalTurbidity: 1.0,
  },
  colloid: {
    id: 'colloid',
    name_en: 'Colloidal Sol',
    name_vi: 'Hệ keo khuếch tán bền',
    stokesRadius_um: 0.08,
    settlingMultiplier: 0.002,
    bedPorosity: 0.98,
    opticalTurbidity: 0.88,
  },
  amorphous_black: {
    id: 'amorphous_black',
    name_en: 'Amorphous Black Precipitate',
    name_vi: 'Kết tủa đen vô định hình',
    stokesRadius_um: 5.0,
    settlingMultiplier: 1.5,
    bedPorosity: 0.65,
    opticalTurbidity: 0.99,
  },
};

export const CANONICAL_MORPHOLOGY_LIST = Object.keys(PRECIP_MORPHOLOGY_PROPERTIES) as PrecipMorphology[];

// 3. Gas Species and Physical Properties
export type GasSpecies =
  | 'H2'
  | 'O2'
  | 'N2'
  | 'CO2'
  | 'Cl2'
  | 'NO'
  | 'NO2'
  | 'SO2'
  | 'H2S'
  | 'NH3'
  | 'HCl'
  | 'Br2'
  | 'I2'
  | 'CH4'
  | 'C2H2'
  | 'H2O'
  | 'unknown';

export interface GasSpeciesInfo {
  species: GasSpecies;
  formula: string;
  molarMass_g_mol: number;
  relativeDensityAir: number; // M / 28.96
  buoyancyClass: 'very_light' | 'light' | 'neutral' | 'heavy' | 'very_heavy';
  colorHex: string;
  opacity: number;
  odor_vi: string;
  odor_en: string;
  solubility_mol_L_atm: number; // at 25 °C
  toxicityLevel: 'none' | 'irritant' | 'toxic' | 'asphyxiant' | 'lethal';
  flammable: boolean;
}

export const GAS_SPECIES_TABLE: Record<GasSpecies, GasSpeciesInfo> = {
  H2: {
    species: 'H2',
    formula: 'H₂',
    molarMass_g_mol: 2.016,
    relativeDensityAir: 0.0696,
    buoyancyClass: 'very_light',
    colorHex: '#ffffff',
    opacity: 0.05,
    odor_vi: 'Không mùi',
    odor_en: 'Odorless',
    solubility_mol_L_atm: 0.00078,
    toxicityLevel: 'asphyxiant',
    flammable: true,
  },
  O2: {
    species: 'O2',
    formula: 'O₂',
    molarMass_g_mol: 31.999,
    relativeDensityAir: 1.105,
    buoyancyClass: 'neutral',
    colorHex: '#e0f2fe',
    opacity: 0.08,
    odor_vi: 'Không mùi',
    odor_en: 'Odorless',
    solubility_mol_L_atm: 0.0013,
    toxicityLevel: 'none',
    flammable: false,
  },
  N2: {
    species: 'N2',
    formula: 'N₂',
    molarMass_g_mol: 28.013,
    relativeDensityAir: 0.967,
    buoyancyClass: 'neutral',
    colorHex: '#ffffff',
    opacity: 0.05,
    odor_vi: 'Không mùi',
    odor_en: 'Odorless',
    solubility_mol_L_atm: 0.00065,
    toxicityLevel: 'asphyxiant',
    flammable: false,
  },
  CO2: {
    species: 'CO2',
    formula: 'CO₂',
    molarMass_g_mol: 44.01,
    relativeDensityAir: 1.52,
    buoyancyClass: 'heavy',
    colorHex: '#f1f5f9',
    opacity: 0.15,
    odor_vi: 'Không mùi, vị chua nhẹ',
    odor_en: 'Odorless, slightly acidic',
    solubility_mol_L_atm: 0.034,
    toxicityLevel: 'asphyxiant',
    flammable: false,
  },
  Cl2: {
    species: 'Cl2',
    formula: 'Cl₂',
    molarMass_g_mol: 70.90,
    relativeDensityAir: 2.45,
    buoyancyClass: 'very_heavy',
    colorHex: '#d9f99d', // Yellow-green
    opacity: 0.70,
    odor_vi: 'Hắc nồng, xốc sực',
    odor_en: 'Pungent, suffocating bleach-like',
    solubility_mol_L_atm: 0.092,
    toxicityLevel: 'toxic',
    flammable: false,
  },
  NO: {
    species: 'NO',
    formula: 'NO',
    molarMass_g_mol: 30.01,
    relativeDensityAir: 1.036,
    buoyancyClass: 'neutral',
    colorHex: '#ffffff',
    opacity: 0.05,
    odor_vi: 'Không màu (hóa nâu ngay trong không khí)',
    odor_en: 'Colorless (spontaneously turns brown in air)',
    solubility_mol_L_atm: 0.0019,
    toxicityLevel: 'toxic',
    flammable: false,
  },
  NO2: {
    species: 'NO2',
    formula: 'NO₂',
    molarMass_g_mol: 46.006,
    relativeDensityAir: 1.589,
    buoyancyClass: 'heavy',
    colorHex: '#9a3412', // Rich reddish-brown
    opacity: 0.85,
    odor_vi: 'Mùi hắc gắt đặc trưng, cay mũi',
    odor_en: 'Harsh acrid, biting odor',
    solubility_mol_L_atm: 0.045,
    toxicityLevel: 'toxic',
    flammable: false,
  },
  SO2: {
    species: 'SO2',
    formula: 'SO₂',
    molarMass_g_mol: 64.066,
    relativeDensityAir: 2.21,
    buoyancyClass: 'very_heavy',
    colorHex: '#f8fafc',
    opacity: 0.40,
    odor_vi: 'Mùi hắc que diêm cháy xốc họng',
    odor_en: 'Choking burnt match sulfurous',
    solubility_mol_L_atm: 1.25,
    toxicityLevel: 'toxic',
    flammable: false,
  },
  H2S: {
    species: 'H2S',
    formula: 'H₂S',
    molarMass_g_mol: 34.08,
    relativeDensityAir: 1.177,
    buoyancyClass: 'neutral',
    colorHex: '#fef08a',
    opacity: 0.15,
    odor_vi: 'Mùi trứng thối nồng nặc',
    odor_en: 'Rotten eggs foul odor',
    solubility_mol_L_atm: 0.102,
    toxicityLevel: 'lethal',
    flammable: true,
  },
  C2H2: {
    species: 'C2H2',
    formula: 'C₂H₂',
    molarMass_g_mol: 26.04,
    relativeDensityAir: 0.906,
    buoyancyClass: 'neutral',
    colorHex: '#ffffff',
    opacity: 0.05,
    odor_vi: 'Mùi thoang thoảng tỏi do lẫn phosphine',
    odor_en: 'Slight garlic-like odor from trace phosphine',
    solubility_mol_L_atm: 0.042,
    toxicityLevel: 'irritant',
    flammable: true,
  },
  NH3: {
    species: 'NH3',
    formula: 'NH₃',
    molarMass_g_mol: 17.031,
    relativeDensityAir: 0.588,
    buoyancyClass: 'light',
    colorHex: '#ffffff',
    opacity: 0.20,
    odor_vi: 'Mùi khai nồng nặc, chảy nước mắt',
    odor_en: 'Sharp pungent ammoniacal',
    solubility_mol_L_atm: 31.0, // Extremely soluble
    toxicityLevel: 'irritant',
    flammable: false,
  },
  HCl: {
    species: 'HCl',
    formula: 'HCl',
    molarMass_g_mol: 36.46,
    relativeDensityAir: 1.259,
    buoyancyClass: 'heavy',
    colorHex: '#f1f5f9',
    opacity: 0.55,
    odor_vi: 'Hơi axit bốc khói xộc buốt mũi',
    odor_en: 'Fuming white acidic vapor',
    solubility_mol_L_atm: 19.5, // Extremely soluble
    toxicityLevel: 'toxic',
    flammable: false,
  },
  Br2: {
    species: 'Br2',
    formula: 'Br₂',
    molarMass_g_mol: 159.808,
    relativeDensityAir: 5.518,
    buoyancyClass: 'very_heavy',
    colorHex: '#7f1d1d', // Dark red-brown heavy vapor
    opacity: 0.90,
    odor_vi: 'Hơi màu nâu đỏ độc, ăn mòn da',
    odor_en: 'Pungent suffocating reddish-brown vapor',
    solubility_mol_L_atm: 0.21,
    toxicityLevel: 'toxic',
    flammable: false,
  },
  I2: {
    species: 'I2',
    formula: 'I₂',
    molarMass_g_mol: 253.808,
    relativeDensityAir: 8.76,
    buoyancyClass: 'very_heavy',
    colorHex: '#7e22ce', // Violet sublimation vapor
    opacity: 0.75,
    odor_vi: 'Hơi thăng hoa màu tím tím lãng mạn',
    odor_en: 'Violet dense sublimation vapor',
    solubility_mol_L_atm: 0.0013,
    toxicityLevel: 'irritant',
    flammable: false,
  },
  CH4: {
    species: 'CH4',
    formula: 'CH₄',
    molarMass_g_mol: 16.043,
    relativeDensityAir: 0.554,
    buoyancyClass: 'light',
    colorHex: '#ffffff',
    opacity: 0.05,
    odor_vi: 'Không mùi',
    odor_en: 'Odorless',
    solubility_mol_L_atm: 0.0014,
    toxicityLevel: 'asphyxiant',
    flammable: true,
  },
  H2O: {
    species: 'H2O',
    formula: 'H₂O (vapor)',
    molarMass_g_mol: 18.015,
    relativeDensityAir: 0.622,
    buoyancyClass: 'light',
    colorHex: '#ffffff',
    opacity: 0.40,
    odor_vi: 'Hơi nước không mùi',
    odor_en: 'Steam / water vapor',
    solubility_mol_L_atm: 55.5,
    toxicityLevel: 'none',
    flammable: false,
  },
  unknown: {
    species: 'unknown',
    formula: 'Gas',
    molarMass_g_mol: 28.96,
    relativeDensityAir: 1.0,
    buoyancyClass: 'neutral',
    colorHex: '#ffffff',
    opacity: 0.15,
    odor_vi: 'Chất khí chưa định danh',
    odor_en: 'Unspecified gas',
    solubility_mol_L_atm: 0.005,
    toxicityLevel: 'none',
    flammable: false,
  },
};

// 4. Heat Classes
export type HeatClass =
  | 'endo_strong'   // ΔH > +80 kJ/mol (intense cold, beaker condensation/frost)
  | 'endo'          // ΔH +10..+80 kJ/mol (noticeable temperature drop)
  | 'neutral'       // -10 < ΔH < +10 kJ/mol
  | 'exo'           // ΔH -10..-80 kJ/mol (warming, gentle steam)
  | 'exo_strong'    // ΔH -80..-300 kJ/mol (hot, vigorous boiling/fuming)
  | 'runaway';      // ΔH < -300 kJ/mol (violent boiling, explosion risk)

export function classifyDeltaH(deltaH_kJ_per_mol?: number | null): HeatClass {
  if (deltaH_kJ_per_mol === undefined || deltaH_kJ_per_mol === null) return 'neutral';
  if (deltaH_kJ_per_mol > 80) return 'endo_strong';
  if (deltaH_kJ_per_mol > 10) return 'endo';
  if (deltaH_kJ_per_mol >= -10) return 'neutral';
  if (deltaH_kJ_per_mol >= -80) return 'exo';
  if (deltaH_kJ_per_mol >= -300) return 'exo_strong';
  return 'runaway';
}

// 5. Anchors
export type Anchor =
  | 'pourPoint'
  | 'stream'
  | 'bottom'
  | 'surface'
  | 'meniscus'
  | 'wall'
  | 'wallLower'
  | 'wallUpper'
  | 'rim'
  | 'headspace'
  | 'outside'
  | 'bulk'
  | `solid:${string}`
  | `electrode:${string}`
  | 'flame'
  | 'thermometer';

// 6. Adapters for Legacy Types (F7)
export function normalizeMorphology(raw?: string): PrecipMorphology {
  if (!raw) return 'fine_powder';
  const lower = raw.toLowerCase().trim();

  if (lower.includes('curd')) return 'curd';
  if (lower.includes('floc')) return 'floc';
  if (lower.includes('gel')) return 'gel';
  if (lower.includes('plate') || lower.includes('flake') || lower.includes('gold')) return 'crystal_plate';
  if (lower.includes('needle')) return 'crystal_needle';
  if (lower.includes('cubic')) return 'crystal_cubic';
  if (lower.includes('powder') || lower.includes('milky') || lower.includes('fine')) return 'fine_powder';
  if (lower.includes('granul') || lower.includes('grit')) return 'granular';
  if (lower.includes('dendrite') || lower.includes('tree')) return 'dendrite';
  if (lower.includes('mirror') || lower.includes('film') || lower.includes('metal')) return 'metallic_film';
  if (lower.includes('colloid') || lower.includes('sol')) return 'colloid';
  if (lower.includes('black') || lower.includes('soot')) return 'amorphous_black';

  return 'fine_powder';
}

export function toLegacyMorphologyType(morph: PrecipMorphology): 'FINE_POWDER' | 'CURD' | 'FLOC' | 'GEL' | 'CRYSTAL_PLATE' | 'CRYSTAL_ROD' | 'METALLIC_DEPOSIT' {
  switch (morph) {
    case 'curd': return 'CURD';
    case 'floc': return 'FLOC';
    case 'gel': return 'GEL';
    case 'crystal_plate': return 'CRYSTAL_PLATE';
    case 'crystal_needle': return 'CRYSTAL_ROD';
    case 'dendrite':
    case 'metallic_film': return 'METALLIC_DEPOSIT';
    case 'fine_powder':
    case 'colloid':
    case 'granular':
    case 'crystal_cubic':
    case 'amorphous_black':
    default:
      return 'FINE_POWDER';
  }
}

export function toRecipeStyle(morph: PrecipMorphology): string {
  switch (morph) {
    case 'fine_powder': return 'milky';
    case 'curd': return 'curdy';
    case 'crystal_plate': return 'flake-gold';
    case 'gel': return 'gel';
    case 'amorphous_black': return 'powder-black';
    case 'dendrite':
    case 'metallic_film': return 'metal-copper';
    default: return 'curdy';
  }
}

export const canonicalizeMorphology = normalizeMorphology;
export const toLegacyMorphology = toLegacyMorphologyType;
