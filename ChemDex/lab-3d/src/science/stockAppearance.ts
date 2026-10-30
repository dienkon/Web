import type { ChemicalDefinition, SolidMorphology } from '../types/chemistry';

/** Stock identity includes preparation/form. Never use this table to assign a
 * phase to reaction products or to turn an aqueous stock into the pure solid.
 * RGB, roughness and glyph dimensions are illustrative, not measured spectra.
 * Physical descriptions and limitations: docs/research/stock-and-product-appearance.vi.md.
 */
export const COLORLESS_STOCKS = new Set([
  'H2O', 'HCl (dil)', 'H2SO4 (dil)', 'H2SO4 (conc)', 'NaOH',
  'Phenolphthalein', 'NaNO3', 'AgNO3', 'BaCl2', 'Na2SO4', 'Na2CO3',
  'KI', 'Pb(NO3)2', 'H2O2 (30%)', 'NH3', 'HNO3 (conc)', 'KSCN',
  'H2C2O4', 'Na2S2O3', 'KIO3', 'NaHSO3', 'Al2(SO4)3', 'Ca(OH)2',
  'CaCl2', 'CH3COOH (dil)', 'CH3COOH (glacial)', 'NH3 (aq)', 'KOH',
  'C2H5OH', 'CH3COCH3', 'Hexane', 'CO2(aq)', 'CH3COOH', 'CH3COONa',
  'CH3COOK', 'NH4Cl(aq)',
]);

export const STOCK_FORM_OVERRIDES: Readonly<Record<string, SolidMorphology>> = {
  'Fe (nail)': 'NAIL', 'Al': 'FOIL', 'Al (foil)': 'FOIL',
};

const solidColors: Readonly<Record<string, string>> = {
  I2: '#302e36', 'I2 (solid)': '#302e36',
  Fe: '#73767b', 'Fe (filings)': '#62666b', 'Fe (nail)': '#85888c',
  Cu: '#b87346', 'Cu (turnings)': '#b87346',
  Mg: '#bdc1c4', 'Mg (ribbon)': '#bdc1c4', 'Mg (powder)': '#94979a',
  Al: '#c6c9cb', 'Al (foil)': '#c6c9cb',
  Zn: '#9ca2a5', 'Zn (granules)': '#9ca2a5', 'Zn (dust)': '#737a7e',
  MnO2: '#29272a', CuO: '#242225', Fe2O3: '#8e3c2e',
  S: '#ecd967', 'C (Carbon)': '#242424',
  'KMnO4 (solid)': '#322637', 'K2Cr2O7 (solid)': '#d96b28',
  'CuSO4·5H2O': '#2589c5', 'CoCl2.6H2O': '#be6686',
  'NiSO4.6H2O': '#459f82', 'FeSO4.7H2O': '#a1bd9c',
};

/** Apply only known, full stock identities; unfamiliar chemicals keep their
 * declared appearance rather than being silently made clear or metallic. */
export function applyStockAppearance(chemical: ChemicalDefinition): void {
  if (chemical.type === 'liquid' && COLORLESS_STOCKS.has(chemical.formula)) chemical.color = '#ffffff';
  if (chemical.type === 'solid' && solidColors[chemical.formula]) chemical.color = solidColors[chemical.formula];
  if (STOCK_FORM_OVERRIDES[chemical.formula]) chemical.solidMorphology = STOCK_FORM_OVERRIDES[chemical.formula];
}

export function stockSolidMaterial(chemical: ChemicalDefinition | undefined, morphology: SolidMorphology) {
  const metal = chemical?.category === 'metal'
    || /^(Fe|Cu|Zn|Mg|Al|Na|K)(?: \([^)]*\))?$/.test(chemical?.formula ?? '');
  const iodine = morphology === 'LUSTROUS_PLATES';
  const crystal = ['CUBIC_CRYSTAL', 'PRISMATIC_CRYSTAL', 'TABULAR_CRYSTAL', 'HYDRATE_CRYSTAL'].includes(morphology);
  return {
    color: chemical?.color ?? '#9c9c9c',
    // Ionic crystals are dielectrics, including dark permanganate. Metal
    // powders have a rough oxide-covered appearance rather than chrome dust.
    metalness: metal ? (morphology === 'POWDER' ? 0.15 : 0.88) : iodine ? 0.35 : 0,
    roughness: metal ? (morphology === 'POWDER' ? 0.98 : morphology === 'FILINGS' ? 0.48 : 0.28)
      : iodine ? 0.28 : crystal ? 0.27 : 0.93,
  };
}

export function stockPhase(chemical: ChemicalDefinition): 's' | 'l' | 'aq' | 'g' {
  if (chemical.type === 'solid') return 's';
  if (chemical.type === 'gas') return 'g';
  return chemical.formula !== 'H2O' && (chemical.defaultConcentration ?? 0) > 0 ? 'aq' : 'l';
}
