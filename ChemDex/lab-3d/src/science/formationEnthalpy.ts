import type { ReactionProgram, SpeciesRole } from '../shared/programSchema';
import { identifySpecies } from './speciesIdentity';

/** 298.15 K reference data, kJ/mol. An aqueous salt denotes separated ions
 * at the ideal dilute reference state, not a concentrated stock solution.
 * Every value remains tied to its phase; unknown data never become zero. */
const OPENSTAX = 'https://openstax.org/books/chemistry-2e/pages/g-standard-thermodynamic-properties-for-selected-substances';
const TEXAS = 'https://ch301.cm.utexas.edu/worksheets13/thermo/enthalpy-wkst-KEY.pdf';
const HESS = 'https://chemlab.truman.edu/formationnote/';
const UCONN = 'https://chemphys.uconn.edu/~chem12x/127fall2004/exam_3.html';
type Datum = { value: number; source: string };
const data = (values: Record<string, number>, source: string): Record<string, Datum> =>
  Object.fromEntries(Object.entries(values).map(([key, value]) => [key, { value, source }]));

const FORMATION: Record<string, Datum> = {
  ...data({
    'H2O|l': -285.83, 'H2O|g': -241.82, 'HCl|g': -92.307,
    'NH3|g': -45.9, 'CO2|g': -393.51, 'CO|g': -110.52,
    'CH4|g': -74.6, 'C2H4|g': 52.4, 'C2H2|g': 227.4, 'C2H6|g': -84,
    'C2H5OH|l': -277.6, 'CH3OH|l': -239.2, 'NO|g': 90.25, 'NO2|g': 33.2,
    'SO2|g': -296.83, 'H2S|g': -20.6, 'I2|g': 62.438,
    'CaO|s': -634.9, 'Ca(OH)2|s': -985.2, 'BaSO4|s': -1473.2,
    'CuO|s': -157.3, 'Cu2O|s': -168.6, 'CuS|s': -53.1,
    'Fe2O3|s': -824.2, 'Fe3O4|s': -1118.4, 'FeO|s': -272,
    'Fe(OH)2|s': -569, 'Fe(OH)3|s': -823, 'FeS|s': -100,
    'AgCl|s': -127, 'Ag2O|s': -31.05, 'Ag2S|s': -32.6,
    'ZnO|s': -350.5, 'ZnS|s': -206, 'PbS|s': -100.4, 'PbCl2|s': -359.4,
    'NH4Cl|s': -314.43, 'NH4NO3|s': -365.56,
    'NaCl|s': -411.2, 'KCl|s': -436.5,
    'H+|aq': 0, 'OH-|aq': -230, 'Na+|aq': -240.1, 'K+|aq': -252.4,
    'Li+|aq': -278.5, 'Cl-|aq': -167.2, 'Br-|aq': -120.9, 'I-|aq': -55.19,
    'NO3-|aq': -205, 'SO4^2-|aq': -909.3, 'HSO4-|aq': -885.75,
    'CO3^2-|aq': -677.1, 'HCO3-|aq': -691.11, 'NH4+|aq': -132.5,
    'Ca^2+|aq': -542.96, 'Ba^2+|aq': -537.6, 'Mg^2+|aq': -466.9,
    'Zn^2+|aq': -153.9, 'Cu^2+|aq': 64.77, 'Fe^2+|aq': -89.1,
    'Fe^3+|aq': -48.5, 'Al^3+|aq': -531, 'Ag+|aq': 105.6,
    'Pb^2+|aq': -1.7, 'Mn^2+|aq': -220.8, 'Ni^2+|aq': -64,
    'Co^2+|aq': -67.4, 'S^2-|aq': 41.8, 'S2O3^2-|aq': -648.5,
    'CrO4^2-|aq': -881.2, 'Cr2O7^2-|aq': -1490.3, 'MnO4-|aq': -541.4,
  }, OPENSTAX),
  // Calcite in the OpenStax HTML table conflicts with the university worked
  // example. Use the explicitly identified calcite reference here.
  ...data({ 'CaCO3|s': -1206.9 }, TEXAS),
  ...data({ 'NaHCO3|s': -947.7, 'Na2CO3|s': -1130.8 }, UCONN),
};

// Explicit dissociation only. No regex that guesses the charge of an unknown
// transition metal, weak acid, complex, hydrate or organic molecule.
const AQUEOUS_IONS: Record<string, Record<string, number>> = {
  CaCO3: { 'Ca^2+': 1, 'CO3^2-': 1 }, // Formal dissolved pool, not pure solid calcite.
  HCl: { 'H+': 1, 'Cl-': 1 }, HBr: { 'H+': 1, 'Br-': 1 }, HI: { 'H+': 1, 'I-': 1 },
  HNO3: { 'H+': 1, 'NO3-': 1 }, H2SO4: { 'H+': 2, 'SO4^2-': 1 },
  NaOH: { 'Na+': 1, 'OH-': 1 }, KOH: { 'K+': 1, 'OH-': 1 }, LiOH: { 'Li+': 1, 'OH-': 1 },
  'Ca(OH)2': { 'Ca^2+': 1, 'OH-': 2 }, 'Ba(OH)2': { 'Ba^2+': 1, 'OH-': 2 },
  NaCl: { 'Na+': 1, 'Cl-': 1 }, KCl: { 'K+': 1, 'Cl-': 1 }, KBr: { 'K+': 1, 'Br-': 1 },
  KI: { 'K+': 1, 'I-': 1 }, NaI: { 'Na+': 1, 'I-': 1 },
  NaNO3: { 'Na+': 1, 'NO3-': 1 }, KNO3: { 'K+': 1, 'NO3-': 1 },
  Na2SO4: { 'Na+': 2, 'SO4^2-': 1 }, K2SO4: { 'K+': 2, 'SO4^2-': 1 },
  NaHSO4: { 'Na+': 1, 'HSO4-': 1 }, KHSO4: { 'K+': 1, 'HSO4-': 1 },
  Na2CO3: { 'Na+': 2, 'CO3^2-': 1 }, NaHCO3: { 'Na+': 1, 'HCO3-': 1 },
  CaCl2: { 'Ca^2+': 1, 'Cl-': 2 }, BaCl2: { 'Ba^2+': 1, 'Cl-': 2 },
  MgCl2: { 'Mg^2+': 1, 'Cl-': 2 }, ZnCl2: { 'Zn^2+': 1, 'Cl-': 2 },
  CuCl2: { 'Cu^2+': 1, 'Cl-': 2 }, FeCl2: { 'Fe^2+': 1, 'Cl-': 2 },
  FeCl3: { 'Fe^3+': 1, 'Cl-': 3 }, AlCl3: { 'Al^3+': 1, 'Cl-': 3 },
  CoCl2: { 'Co^2+': 1, 'Cl-': 2 }, MnCl2: { 'Mn^2+': 1, 'Cl-': 2 },
  AgNO3: { 'Ag+': 1, 'NO3-': 1 }, 'Pb(NO3)2': { 'Pb^2+': 1, 'NO3-': 2 },
  'Cu(NO3)2': { 'Cu^2+': 1, 'NO3-': 2 }, 'Zn(NO3)2': { 'Zn^2+': 1, 'NO3-': 2 },
  'Ca(NO3)2': { 'Ca^2+': 1, 'NO3-': 2 },
  CuSO4: { 'Cu^2+': 1, 'SO4^2-': 1 }, FeSO4: { 'Fe^2+': 1, 'SO4^2-': 1 },
  ZnSO4: { 'Zn^2+': 1, 'SO4^2-': 1 }, MgSO4: { 'Mg^2+': 1, 'SO4^2-': 1 },
  MnSO4: { 'Mn^2+': 1, 'SO4^2-': 1 }, NiSO4: { 'Ni^2+': 1, 'SO4^2-': 1 },
  'Fe2(SO4)3': { 'Fe^3+': 2, 'SO4^2-': 3 },
  NH4Cl: { 'NH4+': 1, 'Cl-': 1 }, NH4NO3: { 'NH4+': 1, 'NO3-': 1 },
  '(NH4)2SO4': { 'NH4+': 2, 'SO4^2-': 1 },
  Na2S: { 'Na+': 2, 'S^2-': 1 }, Na2S2O3: { 'Na+': 2, 'S2O3^2-': 1 },
  KMnO4: { 'K+': 1, 'MnO4-': 1 }, K2CrO4: { 'K+': 2, 'CrO4^2-': 1 },
  Na2CrO4: { 'Na+': 2, 'CrO4^2-': 1 }, K2Cr2O7: { 'K+': 2, 'Cr2O7^2-': 1 },
};
const ELEMENT_REFERENCES = new Set(['Na|s', 'K|s', 'Li|s', 'Ca|s', 'Mg|s', 'Zn|s', 'Fe|s',
  'Cu|s', 'Ag|s', 'Al|s', 'Pb|s', 'S|s', 'S8|s', 'C|s', 'I2|s', 'Br2|l',
  'Cl2|g', 'H2|g', 'O2|g', 'N2|g']);

export function formationEnthalpy(formula: string, phase: string): { value: number; sources: string[] } | null {
  const identity = identifySpecies(formula);
  if (identity.concentration === 'concentrated') return null;
  const key = `${identity.formula}|${phase}`;
  if (ELEMENT_REFERENCES.has(key)) return { value: 0, sources: [OPENSTAX] };
  const direct = FORMATION[key];
  if (direct) return { value: direct.value, sources: [direct.source] };
  const ions = phase === 'aq' ? AQUEOUS_IONS[identity.formula] : undefined;
  if (!ions) return null;
  let value = 0;
  const sources = new Set<string>();
  for (const [ion, count] of Object.entries(ions)) {
    const entry = FORMATION[`${ion}|aq`];
    if (!entry) return null;
    value += count * entry.value; sources.add(entry.source);
  }
  return { value, sources: [...sources] };
}

export function deriveStandardEnthalpy(species: readonly Pick<SpeciesRole, 'formula' | 'phase' | 'coeff' | 'role'>[]) {
  const reactants = species.filter(term => term.role === 'reactant');
  const products = species.filter(term => term.role === 'product');
  if (!reactants.length || !products.length) return null;
  let value = 0;
  const sources = new Set([HESS]);
  const contributions = [];
  for (const term of [...reactants, ...products]) {
    if (!Number.isFinite(term.coeff) || term.coeff <= 0) return null;
    const formation = formationEnthalpy(term.formula, term.phase);
    if (!formation) return null;
    const signed = (term.role === 'product' ? 1 : -1) * term.coeff;
    value += signed * formation.value;
    for (const url of formation.sources) sources.add(url);
    contributions.push({ formula: term.formula, phase: term.phase, coefficient: signed, formation_kJ_mol: formation.value });
  }
  return { value: Math.round(value * 1000) / 1000, sources: [...sources], contributions };
}

/** Decorate only covered standard-state reactions. Preserve manually reviewed
 * references and explicitly leave dilution/indicator/emission models alone. */
export function sourceProgramThermochemistry(program: ReactionProgram): void {
  if (program.chemistry.deltaHSourceUrls?.length
    || ['dilution', 'indicator', 'emission'].includes(program.chemistry.representation ?? '')
    || /conc|dilution/i.test(program.id)) return;
  const derived = deriveStandardEnthalpy(program.chemistry.species);
  if (!derived) return;
  program.chemistry.deltaH_kJ_per_mol = derived.value;
  program.chemistry.deltaHSourceUrls = derived.sources;
  program.chemistry.deltaHReferenceTemperature_K = 298.15;
  program.chemistry.deltaHNote_vi = 'Tính theo định luật Hess từ enthalpy tạo thành và pha như phương trình viết; chất điện ly dùng ion ở giới hạn dung dịch loãng. Chưa hiệu chuẩn nhiệt pha loãng, nồng độ hoặc nhiệt độ của mẫu thực.';
}
