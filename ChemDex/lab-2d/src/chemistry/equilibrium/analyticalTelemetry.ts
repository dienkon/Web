/**
 * Analytical Telemetry Engine for Aqueous Conductivity & Virtual UV-Vis Spectrophotometry.
 * Computes Kohlrausch/Falkenhagen ionic conductivity (mS/cm), ionic strength (M),
 * electrolyte classification, and 380–720 nm Beer-Lambert absorbance/transmittance spectra.
 */

import { SubstanceQuantity } from '../../types/chemistry';
import { calculateSolutionPh, getIndicatorColor, solveAqueousEquilibrium } from './acidBase';
import { AQUEOUS_CONSTANTS_25C, aqueousConstantsAtTemperature } from './aqueous/aqueousTemperature';
import { detectIndicatorType } from '../optics/indicatorAppearance';
import { calculateMixtureOptics } from '../optics/liquidOptics';

export interface IonSpec {
  readonly id: string;
  readonly symbol: string;
  readonly charge: number;
  /** Limiting molar ionic conductivity at 25 °C in S·cm²/mol. */
  readonly lambda0_S_cm2_mol: number;
  /** Temperature coefficient (fractional increase per °C near 25 °C). */
  readonly tempCoeff_per_C?: number;
}

export const ION_CONDUCTIVITY_TABLE: Record<string, IonSpec> = {
  'H+': { id: 'H+', symbol: 'H⁺', charge: 1, lambda0_S_cm2_mol: 349.8, tempCoeff_per_C: 0.015 },
  'OH-': { id: 'OH-', symbol: 'OH⁻', charge: -1, lambda0_S_cm2_mol: 198.3, tempCoeff_per_C: 0.018 },
  'Na+': { id: 'Na+', symbol: 'Na⁺', charge: 1, lambda0_S_cm2_mol: 50.11 },
  'K+': { id: 'K+', symbol: 'K⁺', charge: 1, lambda0_S_cm2_mol: 73.5 },
  'Li+': { id: 'Li+', symbol: 'Li⁺', charge: 1, lambda0_S_cm2_mol: 38.66 },
  'NH4+': { id: 'NH4+', symbol: 'NH₄⁺', charge: 1, lambda0_S_cm2_mol: 73.55 },
  'Ag+': { id: 'Ag+', symbol: 'Ag⁺', charge: 1, lambda0_S_cm2_mol: 61.9 },
  'Ca2+': { id: 'Ca2+', symbol: 'Ca²⁺', charge: 2, lambda0_S_cm2_mol: 119.0 },
  'Mg2+': { id: 'Mg2+', symbol: 'Mg²⁺', charge: 2, lambda0_S_cm2_mol: 106.1 },
  'Ba2+': { id: 'Ba2+', symbol: 'Ba²⁺', charge: 2, lambda0_S_cm2_mol: 127.3 },
  'Cu2+': { id: 'Cu2+', symbol: 'Cu²⁺', charge: 2, lambda0_S_cm2_mol: 107.2 },
  'Zn2+': { id: 'Zn2+', symbol: 'Zn²⁺', charge: 2, lambda0_S_cm2_mol: 105.6 },
  'Fe2+': { id: 'Fe2+', symbol: 'Fe²⁺', charge: 2, lambda0_S_cm2_mol: 108.0 },
  'Fe3+': { id: 'Fe3+', symbol: 'Fe³⁺', charge: 3, lambda0_S_cm2_mol: 204.0 },
  'Al3+': { id: 'Al3+', symbol: 'Al³⁺', charge: 3, lambda0_S_cm2_mol: 183.0 },
  'Pb2+': { id: 'Pb2+', symbol: 'Pb²⁺', charge: 2, lambda0_S_cm2_mol: 142.0 },
  'Cl-': { id: 'Cl-', symbol: 'Cl⁻', charge: -1, lambda0_S_cm2_mol: 76.35 },
  'Br-': { id: 'Br-', symbol: 'Br⁻', charge: -1, lambda0_S_cm2_mol: 78.14 },
  'I-': { id: 'I-', symbol: 'I⁻', charge: -1, lambda0_S_cm2_mol: 76.84 },
  'F-': { id: 'F-', symbol: 'F⁻', charge: -1, lambda0_S_cm2_mol: 55.4 },
  'NO3-': { id: 'NO3-', symbol: 'NO₃⁻', charge: -1, lambda0_S_cm2_mol: 71.42 },
  'ClO4-': { id: 'ClO4-', symbol: 'ClO₄⁻', charge: -1, lambda0_S_cm2_mol: 67.3 },
  'CH3COO-': { id: 'CH3COO-', symbol: 'CH₃COO⁻', charge: -1, lambda0_S_cm2_mol: 40.9 },
  'HCO3-': { id: 'HCO3-', symbol: 'HCO₃⁻', charge: -1, lambda0_S_cm2_mol: 44.5 },
  'CO3^2-': { id: 'CO3^2-', symbol: 'CO₃²⁻', charge: -2, lambda0_S_cm2_mol: 138.6 },
  'HSO4-': { id: 'HSO4-', symbol: 'HSO₄⁻', charge: -1, lambda0_S_cm2_mol: 52.0 },
  'SO4^2-': { id: 'SO4^2-', symbol: 'SO₄²⁻', charge: -2, lambda0_S_cm2_mol: 160.0 },
  'H2PO4-': { id: 'H2PO4-', symbol: 'H₂PO₄⁻', charge: -1, lambda0_S_cm2_mol: 36.0 },
  'HPO4^2-': { id: 'HPO4^2-', symbol: 'HPO₄²⁻', charge: -2, lambda0_S_cm2_mol: 114.0 },
  'PO4^3-': { id: 'PO4^3-', symbol: 'PO₄³⁻', charge: -3, lambda0_S_cm2_mol: 207.0 },
  'MnO4-': { id: 'MnO4-', symbol: 'MnO₄⁻', charge: -1, lambda0_S_cm2_mol: 61.3 },
  'CrO4^2-': { id: 'CrO4^2-', symbol: 'CrO₄²⁻', charge: -2, lambda0_S_cm2_mol: 170.0 },
  'Cr2O7^2-': { id: 'Cr2O7^2-', symbol: 'Cr₂O₇²⁻', charge: -2, lambda0_S_cm2_mol: 146.0 },
  'SCN-': { id: 'SCN-', symbol: 'SCN⁻', charge: -1, lambda0_S_cm2_mol: 66.0 },
  'S2O3^2-': { id: 'S2O3^2-', symbol: 'S₂O₃²⁻', charge: -2, lambda0_S_cm2_mol: 174.0 },
  'Fe(CN)6^3-': { id: 'Fe(CN)6^3-', symbol: '[Fe(CN)₆]³⁻', charge: -3, lambda0_S_cm2_mol: 302.7 },
  'Fe(CN)6^4-': { id: 'Fe(CN)6^4-', symbol: '[Fe(CN)₆]⁴⁻', charge: -4, lambda0_S_cm2_mol: 442.0 },
};

type DissociationEntry = ReadonlyArray<readonly [keyof typeof ION_CONDUCTIVITY_TABLE, number]>;

/** Spectator ions included when aqueousEquilibrium covers acid-base equilibria. */
const SPECTATOR_IONS: Record<string, DissociationEntry> = {
  hcl: [['Cl-', 1]],
  hno3: [['NO3-', 1]],
  hbr: [['Br-', 1]],
  hi: [['I-', 1]],
  hclo4: [['ClO4-', 1]],
  naoh: [['Na+', 1]],
  koh: [['K+', 1]],
  lioh: [['Li+', 1]],
  'ba(oh)2': [['Ba2+', 1]],
  na2co3: [['Na+', 2]],
  k2co3: [['K+', 2]],
  nahco3: [['Na+', 1]],
  khco3: [['K+', 1]],
  ch3coona: [['Na+', 1]],
  nach3coo: [['Na+', 1]],
  ch3cook: [['K+', 1]],
  kch3coo: [['K+', 1]],
  'ba(ch3coo)2': [['Ba2+', 1]],
  '(ch3coo)2ba': [['Ba2+', 1]],
  nh4cl: [['Cl-', 1]],
  nh4no3: [['NO3-', 1]],
  nh4br: [['Br-', 1]],
  nh4i: [['I-', 1]],
  nahso4: [['Na+', 1]],
  khso4: [['K+', 1]],
  na2so4: [['Na+', 2]],
  k2so4: [['K+', 2]],
  nah2po4: [['Na+', 1]],
  kh2po4: [['K+', 1]],
  na2hpo4: [['Na+', 2]],
  k2hpo4: [['K+', 2]],
  na3po4: [['Na+', 3]],
  k3po4: [['K+', 3]],
  cacl2: [['Cl-', 2]],
  'ca(no3)2': [['NO3-', 2]],
  nacl: [['Na+', 1], ['Cl-', 1]],
  kcl: [['K+', 1], ['Cl-', 1]],
  nabr: [['Na+', 1], ['Br-', 1]],
  kbr: [['K+', 1], ['Br-', 1]],
  nai: [['Na+', 1], ['I-', 1]],
  ki: [['K+', 1], ['I-', 1]],
  nano3: [['Na+', 1], ['NO3-', 1]],
  kno3: [['K+', 1], ['NO3-', 1]],
  naclo4: [['Na+', 1], ['ClO4-', 1]],
  kclo4: [['K+', 1], ['ClO4-', 1]],
  bacl2: [['Ba2+', 1], ['Cl-', 2]],
  babr2: [['Ba2+', 1], ['Br-', 2]],
  'ba(no3)2': [['Ba2+', 1], ['NO3-', 2]],
  mgcl2: [['Mg2+', 1], ['Cl-', 2]],
  mgso4: [['Mg2+', 1], ['SO4^2-', 1]],
};

/** Full strong/soluble electrolyte dissociation map for mixtures beyond the core pH whitelist. */
const GENERAL_ELECTROLYTE_IONS: Record<string, DissociationEntry> = {
  ...SPECTATOR_IONS,
  'ca(oh)2': [['Ca2+', 1]],
  caco3: [['Ca2+', 1], ['CO3^2-', 1]],
  'ca(hco3)2': [['Ca2+', 1], ['HCO3-', 2]],
  '(nh4)2co3': [['NH4+', 2], ['CO3^2-', 1]],
  nh4hco3: [['NH4+', 1], ['HCO3-', 1]],
  'ca(ch3coo)2': [['Ca2+', 1], ['CH3COO-', 2]],
  '(ch3coo)2ca': [['Ca2+', 1], ['CH3COO-', 2]],
  ch3coonh4: [['NH4+', 1], ['CH3COO-', 1]],
  nh4ch3coo: [['NH4+', 1], ['CH3COO-', 1]],
  h2so4: [['SO4^2-', 1]],
  '(nh4)2so4': [['NH4+', 2], ['SO4^2-', 1]],
  cuso4: [['Cu2+', 1], ['SO4^2-', 1]],
  cucl2: [['Cu2+', 1], ['Cl-', 2]],
  'cu(no3)2': [['Cu2+', 1], ['NO3-', 2]],
  fecl3: [['Fe3+', 1], ['Cl-', 3]],
  'fe(no3)3': [['Fe3+', 1], ['NO3-', 3]],
  'fe2(so4)3': [['Fe3+', 2], ['SO4^2-', 3]],
  feso4: [['Fe2+', 1], ['SO4^2-', 1]],
  fecl2: [['Fe2+', 1], ['Cl-', 2]],
  znso4: [['Zn2+', 1], ['SO4^2-', 1]],
  zncl2: [['Zn2+', 1], ['Cl-', 2]],
  'zn(no3)2': [['Zn2+', 1], ['NO3-', 2]],
  alcl3: [['Al3+', 1], ['Cl-', 3]],
  'al2(so4)3': [['Al3+', 2], ['SO4^2-', 3]],
  agno3: [['Ag+', 1], ['NO3-', 1]],
  'pb(no3)2': [['Pb2+', 1], ['NO3-', 2]],
  kmno4: [['K+', 1], ['MnO4-', 1]],
  k2cro4: [['K+', 2], ['CrO4^2-', 1]],
  k2cr2o7: [['K+', 2], ['Cr2O7^2-', 1]],
  kscn: [['K+', 1], ['SCN-', 1]],
  nh4scn: [['NH4+', 1], ['SCN-', 1]],
  na2s2o3: [['Na+', 2], ['S2O3^2-', 1]],
  naf: [['Na+', 1], ['F-', 1]],
  kf: [['K+', 1], ['F-', 1]],
  'k3[fe(cn)6]': [['K+', 3], ['Fe(CN)6^3-', 1]],
  'k4[fe(cn)6]': [['K+', 4], ['Fe(CN)6^4-', 1]],
  'fe(scn)3': [['Fe3+', 0.4], ['SCN-', 1.2]],
};

export type ElectrolyteClassification =
  | 'non_electrolyte'
  | 'pure_water'
  | 'weak'
  | 'strong';

export interface IonContribution {
  id: string;
  symbol: string;
  concentration_M: number;
  conductivity_mS_cm: number;
}

export interface ConductivityTelemetry {
  /** Total specific electrical conductivity kappa in mS/cm. */
  conductivity_mS_cm: number;
  /** conductivity_uS_cm convenience value when conductivity is small (< 1 mS/cm). */
  conductivity_uS_cm: number;
  /** Molar ionic strength I = 0.5 * sum(c_i * z_i^2) in mol/L. */
  ionicStrength_M: number;
  /** Classification of aqueous electrolyte behavior. */
  electrolyteClass: ElectrolyteClassification;
  label_en: string;
  label_vi: string;
  /** Sorted top ion contributors to conductivity. */
  topIons: IonContribution[];
}

function cleanFormulaKey(formula: string): string {
  return formula
    .replace(/\s*\((?:s|l|g|aq|conc|dil)\)/gi, '')
    .replace(/[·\.]\d*H2O/gi, '')
    .replace(/\s+/g, '')
    .toLowerCase();
}

function addIonConc(map: Map<string, number>, ionId: string, conc_M: number) {
  if (!(conc_M > 0) || !Number.isFinite(conc_M)) return;
  map.set(ionId, (map.get(ionId) ?? 0) + conc_M);
}

/**
 * Computes aqueous electrical conductivity (mS/cm) and ionic strength (M) using
 * equilibrium speciation + Kohlrausch limiting molar conductivities with
 * Falkenhagen ionic-strength drag 1 / (1 + 0.55 * |z| * sqrt(I)).
 */
export function calculateSolutionConductivity(
  contents: readonly SubstanceQuantity[],
  volume_ml: number,
  temperature_c = 25
): ConductivityTelemetry {
  const safeVol_L = Math.max(1e-6, volume_ml / 1000);
  const ionConc = new Map<string, number>();

  const hasWater = contents.some(
    (c) => cleanFormulaKey(c.formula) === 'h2o' && c.moles > 0
  );
  if (!hasWater || volume_ml <= 1e-4) {
    return {
      conductivity_mS_cm: 0,
      conductivity_uS_cm: 0,
      ionicStrength_M: 0,
      electrolyteClass: 'non_electrolyte',
      label_en: 'No aqueous medium',
      label_vi: 'Không có dung môi nước',
      topIons: [],
    };
  }

  let dissolvedSoluteMoles = 0;
  let dissociatedEquivSoluteMoles = 0;

  const eq = solveAqueousEquilibrium(contents, volume_ml, temperature_c);
  if (eq) {
    addIonConc(ionConc, 'H+', eq.hydrogen_M);
    addIonConc(ionConc, 'OH-', eq.hydroxide_M);
    addIonConc(ionConc, 'CH3COO-', eq.acetate_M);
    addIonConc(ionConc, 'NH4+', eq.ammonium_M);
    addIonConc(ionConc, 'HCO3-', eq.bicarbonate_M);
    addIonConc(ionConc, 'CO3^2-', eq.carbonate_M);
    addIonConc(ionConc, 'Ca2+', eq.calcium_M);
    addIonConc(ionConc, 'HSO4-', eq.bisulfate_M);
    addIonConc(ionConc, 'SO4^2-', eq.sulfate_M);

    if (eq.phosphoric_M > 0) {
      const h = eq.hydrogen_M;
      const { phosphoricKa1: k1, phosphoricKa2: k2, phosphoricKa3: k3 } = AQUEOUS_CONSTANTS_25C;
      const denom = h ** 3 + k1 * h ** 2 + k1 * k2 * h + k1 * k2 * k3;
      if (denom > 0) {
        addIonConc(ionConc, 'H2PO4-', (eq.phosphoric_M * k1 * h ** 2) / denom);
        addIonConc(ionConc, 'HPO4^2-', (eq.phosphoric_M * k1 * k2 * h) / denom);
        addIonConc(ionConc, 'PO4^3-', (eq.phosphoric_M * k1 * k2 * k3) / denom);
      }
    }

    for (const item of contents) {
      if (item.moles <= 0 || item.state === 's' || item.state === 'g') continue;
      if (detectIndicatorType(item.formula)) continue;
      const key = cleanFormulaKey(item.formula);
      if (key === 'h2o') continue;
      const conc = item.moles / safeVol_L;
      dissolvedSoluteMoles += item.moles;

      const spectators = SPECTATOR_IONS[key];
      if (spectators) {
        for (const [ionId, stoich] of spectators) {
          addIonConc(ionConc, ionId, conc * stoich);
        }
        dissociatedEquivSoluteMoles += item.moles;
      } else if (
        key === 'ch3cooh' ||
        key === 'hc2h3o2' ||
        key === 'c2h4o2' ||
        key === 'nh3' ||
        key === 'nh4oh' ||
        key === 'co2' ||
        key === 'h2co3' ||
        key === 'h3po4'
      ) {
        // Weak molecular acids/bases: count dissociated ionic fraction, not nominal moles
        dissociatedEquivSoluteMoles += 0;
      } else {
        dissociatedEquivSoluteMoles += item.moles;
      }
    }
    dissociatedEquivSoluteMoles +=
      (eq.acetate_M + eq.ammonium_M + eq.bicarbonate_M + eq.carbonate_M) * safeVol_L;
  } else {
    const ph = calculateSolutionPh([...contents], volume_ml, temperature_c);
    const h = 10 ** -ph;
    const kw = aqueousConstantsAtTemperature(Math.max(0, Math.min(90, temperature_c)))?.waterKw ?? 1e-14;
    addIonConc(ionConc, 'H+', h);
    addIonConc(ionConc, 'OH-', kw / h);

    for (const item of contents) {
      if (item.moles <= 0 || item.state === 's' || item.state === 'g') continue;
      if (detectIndicatorType(item.formula)) continue;
      const key = cleanFormulaKey(item.formula);
      if (key === 'h2o') continue;
      const conc = item.moles / safeVol_L;
      dissolvedSoluteMoles += item.moles;

      const entry = GENERAL_ELECTROLYTE_IONS[key];
      if (entry) {
        for (const [ionId, stoich] of entry) {
          addIonConc(ionConc, ionId, conc * stoich);
        }
        dissociatedEquivSoluteMoles += item.moles;
      } else if (key === 'ch3cooh' || key === 'hc2h3o2' || key === 'c2h4o2') {
        const ionized = (conc * AQUEOUS_CONSTANTS_25C.aceticKa) / (h + AQUEOUS_CONSTANTS_25C.aceticKa);
        addIonConc(ionConc, 'CH3COO-', ionized);
        dissociatedEquivSoluteMoles += ionized * safeVol_L;
      } else if (key === 'nh3' || key === 'nh4oh') {
        const ka = kw / AQUEOUS_CONSTANTS_25C.ammoniaKb;
        const ionized = (conc * h) / (h + ka);
        addIonConc(ionConc, 'NH4+', ionized);
        dissociatedEquivSoluteMoles += ionized * safeVol_L;
      }
    }
  }

  let ionicStrength_M = 0;
  for (const [ionId, c] of ionConc.entries()) {
    const spec = ION_CONDUCTIVITY_TABLE[ionId];
    if (!spec || c <= 0) continue;
    ionicStrength_M += 0.5 * c * spec.charge * spec.charge;
  }

  const sqrtI = Math.sqrt(Math.max(0, ionicStrength_M));
  const clampedTemp_c = Math.max(0, Math.min(100, temperature_c));
  const deltaT = clampedTemp_c - 25;

  let totalKappa = 0;
  const contributors: IonContribution[] = [];

  for (const [ionId, c] of ionConc.entries()) {
    const spec = ION_CONDUCTIVITY_TABLE[ionId];
    if (!spec || c <= 0) continue;
    const dragFactor = 1 / (1 + 0.55 * Math.abs(spec.charge) * sqrtI);
    const alphaT = spec.tempCoeff_per_C ?? 0.021;
    const tempFactor = Math.max(0.35, 1 + alphaT * deltaT);
    const kappa_i = spec.lambda0_S_cm2_mol * c * dragFactor * tempFactor;
    totalKappa += kappa_i;
    if (kappa_i > 1e-6) {
      contributors.push({
        id: spec.id,
        symbol: spec.symbol,
        concentration_M: c,
        conductivity_mS_cm: kappa_i,
      });
    }
  }

  contributors.sort((a, b) => b.conductivity_mS_cm - a.conductivity_mS_cm);

  let electrolyteClass: ElectrolyteClassification;
  let label_en: string;
  let label_vi: string;

  if (dissolvedSoluteMoles <= 1e-7 && ionicStrength_M < 1e-4) {
    electrolyteClass = 'pure_water';
    label_en = 'Pure water / Negligible ions';
    label_vi = 'Nước tinh khiết / Ion tự do không đáng kể';
  } else if (ionicStrength_M < 1e-4 && totalKappa < 0.05) {
    electrolyteClass = 'non_electrolyte';
    label_en = 'Non-electrolyte solution';
    label_vi = 'Dung dịch chất không điện li';
  } else {
    const dissociationRatio =
      dissolvedSoluteMoles > 1e-9 ? dissociatedEquivSoluteMoles / dissolvedSoluteMoles : 1;
    if (dissociationRatio < 0.2 && totalKappa < 4.5) {
      electrolyteClass = 'weak';
      label_en = 'Weak electrolyte';
      label_vi = 'Chất điện li yếu';
    } else {
      electrolyteClass = 'strong';
      label_en = 'Strong electrolyte';
      label_vi = 'Chất điện li mạnh';
    }
  }

  return {
    conductivity_mS_cm: totalKappa,
    conductivity_uS_cm: totalKappa * 1000,
    ionicStrength_M,
    electrolyteClass,
    label_en,
    label_vi,
    topIons: contributors.slice(0, 4),
  };
}

// ---------------------------------------------------------------------------
// Virtual UV-Vis Spectrophotometry (380 - 720 nm, 1.0 cm quartz cuvette)
// ---------------------------------------------------------------------------

interface GaussianBand {
  readonly lambdaMax_nm: number;
  readonly sigma_nm: number;
  /** Molar absorptivity epsilon in L/(mol*cm) at lambdaMax. */
  readonly epsilon_M_cm: number;
}

const CHROMOPHORE_BANDS: Record<string, readonly GaussianBand[]> = {
  kmno4: [
    { lambdaMax_nm: 525, sigma_nm: 22, epsilon_M_cm: 2400 },
    { lambdaMax_nm: 546, sigma_nm: 19, epsilon_M_cm: 2350 },
    { lambdaMax_nm: 392, sigma_nm: 26, epsilon_M_cm: 950 },
  ],
  k2cro4: [{ lambdaMax_nm: 390, sigma_nm: 26, epsilon_M_cm: 1850 }],
  k2cr2o7: [
    { lambdaMax_nm: 440, sigma_nm: 34, epsilon_M_cm: 370 },
    { lambdaMax_nm: 392, sigma_nm: 26, epsilon_M_cm: 980 },
  ],
  cuso4: [{ lambdaMax_nm: 718, sigma_nm: 58, epsilon_M_cm: 12 }],
  cucl2: [
    { lambdaMax_nm: 715, sigma_nm: 58, epsilon_M_cm: 14 },
    { lambdaMax_nm: 410, sigma_nm: 28, epsilon_M_cm: 22 },
  ],
  'cu(no3)2': [{ lambdaMax_nm: 718, sigma_nm: 58, epsilon_M_cm: 12 }],
  '[cu(nh3)4]so4': [{ lambdaMax_nm: 610, sigma_nm: 48, epsilon_M_cm: 58 }],
  'cu(nh3)4(oh)2': [{ lambdaMax_nm: 610, sigma_nm: 48, epsilon_M_cm: 58 }],
  fecl3: [{ lambdaMax_nm: 404, sigma_nm: 42, epsilon_M_cm: 125 }],
  'fe(no3)3': [{ lambdaMax_nm: 400, sigma_nm: 40, epsilon_M_cm: 95 }],
  'fe2(so4)3': [{ lambdaMax_nm: 402, sigma_nm: 40, epsilon_M_cm: 110 }],
  feso4: [{ lambdaMax_nm: 715, sigma_nm: 55, epsilon_M_cm: 1.9 }],
  fecl2: [{ lambdaMax_nm: 710, sigma_nm: 55, epsilon_M_cm: 2.0 }],
  'fe(scn)3': [{ lambdaMax_nm: 448, sigma_nm: 42, epsilon_M_cm: 4700 }],
  i2: [{ lambdaMax_nm: 452, sigma_nm: 45, epsilon_M_cm: 920 }],
  ki3: [{ lambdaMax_nm: 452, sigma_nm: 45, epsilon_M_cm: 920 }],
  cocl2: [{ lambdaMax_nm: 512, sigma_nm: 32, epsilon_M_cm: 4.9 }],
  'co(no3)2': [{ lambdaMax_nm: 512, sigma_nm: 32, epsilon_M_cm: 4.9 }],
  nicl2: [
    { lambdaMax_nm: 394, sigma_nm: 24, epsilon_M_cm: 5.2 },
    { lambdaMax_nm: 675, sigma_nm: 44, epsilon_M_cm: 2.1 },
  ],
  niso4: [
    { lambdaMax_nm: 394, sigma_nm: 24, epsilon_M_cm: 5.2 },
    { lambdaMax_nm: 675, sigma_nm: 44, epsilon_M_cm: 2.1 },
  ],
  br2: [{ lambdaMax_nm: 416, sigma_nm: 36, epsilon_M_cm: 175 }],
  'k3[fe(cn)6]': [{ lambdaMax_nm: 420, sigma_nm: 26, epsilon_M_cm: 1020 }],
};

export interface UvVisPoint {
  wavelength_nm: number;
  absorbance: number;
  transmittance_pct: number;
}

export interface UvVisSpectrumResult {
  points: UvVisPoint[];
  lambdaMax_nm: number | null;
  peakAbsorbance: number;
  pathLength_cm: number;
  apparentHex: string;
  hasAbsorption: boolean;
  turbidityBaseline: number;
}

function addGaussianBand(
  spectrum: Float64Array,
  startNm: number,
  stepNm: number,
  band: GaussianBand,
  concentration_M: number,
  pathLength_cm: number
) {
  const amp = band.epsilon_M_cm * concentration_M * pathLength_cm;
  if (!(amp > 1e-5)) return;
  const twoSigmaSq = 2 * band.sigma_nm * band.sigma_nm;
  for (let i = 0; i < spectrum.length; i++) {
    const nm = startNm + i * stepNm;
    const d = nm - band.lambdaMax_nm;
    spectrum[i] += amp * Math.exp(-(d * d) / twoSigmaSq);
  }
}

function hexToRgbUnit(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return [0.95, 0.96, 0.98];
  return [
    Math.max(0.02, parseInt(clean.slice(0, 2), 16) / 255),
    Math.max(0.02, parseInt(clean.slice(2, 4), 16) / 255),
    Math.max(0.02, parseInt(clean.slice(4, 6), 16) / 255),
  ];
}

/**
 * Generates a virtual visible spectrophotometer scan (380-720 nm, 5 nm step)
 * referenced to a 1.0 cm cuvette from Beer-Lambert chromophore bands,
 * active pH indicator ionization states, starch-iodine complexation, and turbidity.
 */
export function calculateUvVisSpectrum(
  contents: readonly SubstanceQuantity[],
  volume_ml: number,
  ph = 7,
  turbidity = 0,
  pathLength_cm = 1.0
): UvVisSpectrumResult {
  const startNm = 380;
  const endNm = 720;
  const stepNm = 5;
  const count = Math.floor((endNm - startNm) / stepNm) + 1;
  const absorbances = new Float64Array(count);

  if (volume_ml <= 1e-4 || contents.length === 0) {
    return {
      points: Array.from({ length: count }, (_, i) => ({
        wavelength_nm: startNm + i * stepNm,
        absorbance: 0,
        transmittance_pct: 100,
      })),
      lambdaMax_nm: null,
      peakAbsorbance: 0,
      pathLength_cm,
      apparentHex: '#f8fafc',
      hasAbsorption: false,
      turbidityBaseline: 0,
    };
  }

  const safeVol_L = Math.max(1e-6, volume_ml / 1000);
  const formulaMap = new Map<string, number>();
  for (const item of contents) {
    if (item.moles <= 0 || item.state === 's' || item.state === 'g') continue;
    const key = cleanFormulaKey(item.formula);
    if (key === 'h2o') continue;
    formulaMap.set(key, (formulaMap.get(key) ?? 0) + item.moles / safeVol_L);
  }

  // Starch-iodine complex detection (I2 + Starch -> deep amylose-triiodide band at 595 nm)
  const i2Conc = (formulaMap.get('i2') ?? 0) + (formulaMap.get('ki3') ?? 0);
  const hasStarch = formulaMap.has('starch');
  let coveredAnyChromophore = false;

  if (i2Conc > 0 && hasStarch) {
    coveredAnyChromophore = true;
    addGaussianBand(
      absorbances,
      startNm,
      stepNm,
      { lambdaMax_nm: 595, sigma_nm: 56, epsilon_M_cm: 16000 },
      i2Conc,
      pathLength_cm
    );
  }

  for (const [key, conc] of formulaMap.entries()) {
    if (key === 'starch') continue;
    const bands = CHROMOPHORE_BANDS[key];
    if (bands) {
      coveredAnyChromophore = true;
      for (const band of bands) {
        addGaussianBand(absorbances, startNm, stepNm, band, conc, pathLength_cm);
      }
      continue;
    }

    const ind = detectIndicatorType(key);
    if (ind) {
      coveredAnyChromophore = true;
      // Normalize indicator concentration to spectroscopically observable dye range (~3e-5 M)
      const dyeConc = Math.min(8e-5, Math.max(2.5e-5, conc));
      if (ind === 'phenolphthalein') {
        const fBase = 1 / (1 + 10 ** (9.1 - ph));
        addGaussianBand(
          absorbances,
          startNm,
          stepNm,
          { lambdaMax_nm: 553, sigma_nm: 30, epsilon_M_cm: 33000 * fBase },
          dyeConc,
          pathLength_cm
        );
      } else if (ind === 'methyl_orange') {
        const fAcid = 1 / (1 + 10 ** (ph - 3.7));
        addGaussianBand(
          absorbances,
          startNm,
          stepNm,
          { lambdaMax_nm: 508, sigma_nm: 32, epsilon_M_cm: 32000 * fAcid },
          dyeConc,
          pathLength_cm
        );
        addGaussianBand(
          absorbances,
          startNm,
          stepNm,
          { lambdaMax_nm: 464, sigma_nm: 28, epsilon_M_cm: 22000 * (1 - fAcid) },
          dyeConc,
          pathLength_cm
        );
      } else if (ind === 'bromothymol_blue') {
        const fBase = 1 / (1 + 10 ** (7.1 - ph));
        addGaussianBand(
          absorbances,
          startNm,
          stepNm,
          { lambdaMax_nm: 433, sigma_nm: 28, epsilon_M_cm: 18000 * (1 - fBase) },
          dyeConc,
          pathLength_cm
        );
        addGaussianBand(
          absorbances,
          startNm,
          stepNm,
          { lambdaMax_nm: 616, sigma_nm: 32, epsilon_M_cm: 34000 * fBase },
          dyeConc,
          pathLength_cm
        );
      } else if (ind === 'thymolphthalein') {
        const fBase = 1 / (1 + 10 ** (9.9 - ph));
        addGaussianBand(
          absorbances,
          startNm,
          stepNm,
          { lambdaMax_nm: 595, sigma_nm: 34, epsilon_M_cm: 31000 * fBase },
          dyeConc,
          pathLength_cm
        );
      } else if (ind === 'litmus') {
        const fBase = 1 / (1 + 10 ** (6.8 - ph));
        addGaussianBand(
          absorbances,
          startNm,
          stepNm,
          { lambdaMax_nm: 515, sigma_nm: 34, epsilon_M_cm: 24000 * (1 - fBase) },
          dyeConc,
          pathLength_cm
        );
        addGaussianBand(
          absorbances,
          startNm,
          stepNm,
          { lambdaMax_nm: 592, sigma_nm: 34, epsilon_M_cm: 26000 * fBase },
          dyeConc,
          pathLength_cm
        );
      } else if (ind === 'universal') {
        const indHex = getIndicatorColor('universal', ph);
        const [r, g, b] = hexToRgbUnit(indHex);
        addGaussianBand(
          absorbances,
          startNm,
          stepNm,
          { lambdaMax_nm: 635, sigma_nm: 44, epsilon_M_cm: -Math.log10(r) / dyeConc },
          dyeConc,
          pathLength_cm
        );
        addGaussianBand(
          absorbances,
          startNm,
          stepNm,
          { lambdaMax_nm: 535, sigma_nm: 42, epsilon_M_cm: -Math.log10(g) / dyeConc },
          dyeConc,
          pathLength_cm
        );
        addGaussianBand(
          absorbances,
          startNm,
          stepNm,
          { lambdaMax_nm: 442, sigma_nm: 36, epsilon_M_cm: -Math.log10(b) / dyeConc },
          dyeConc,
          pathLength_cm
        );
      }
    }
  }

  // Fallback to Beer-Lambert linear-RGB engine if an uncataloged colored solute is present
  const optics = calculateMixtureOptics([...contents], volume_ml, [0, 0, 0], pathLength_cm);
  if (!coveredAnyChromophore && optics.hasActiveChromophore) {
    const [r, g, b] = optics.linearRgb;
    const absR = Math.max(0, -Math.log10(Math.max(0.02, r)));
    const absG = Math.max(0, -Math.log10(Math.max(0.02, g)));
    const absB = Math.max(0, -Math.log10(Math.max(0.02, b)));
    addGaussianBand(
      absorbances,
      startNm,
      stepNm,
      { lambdaMax_nm: 635, sigma_nm: 46, epsilon_M_cm: absR },
      1,
      1
    );
    addGaussianBand(
      absorbances,
      startNm,
      stepNm,
      { lambdaMax_nm: 535, sigma_nm: 44, epsilon_M_cm: absG },
      1,
      1
    );
    addGaussianBand(
      absorbances,
      startNm,
      stepNm,
      { lambdaMax_nm: 445, sigma_nm: 38, epsilon_M_cm: absB },
      1,
      1
    );
  }

  // Add Mie/Rayleigh-like baseline scattering when fine precipitate is suspended
  const safeTurbidity = Math.max(0, Math.min(1, turbidity));
  if (safeTurbidity > 0.02) {
    for (let i = 0; i < count; i++) {
      const nm = startNm + i * stepNm;
      const scatter = safeTurbidity * 0.42 * (500 / nm) ** 1.4;
      absorbances[i] += scatter;
    }
  }

  const points: UvVisPoint[] = [];
  let peakAbsorbance = 0;
  let lambdaMax_nm: number | null = null;

  for (let i = 0; i < count; i++) {
    const nm = startNm + i * stepNm;
    const rawA = Math.min(3.5, Math.max(0, absorbances[i]));
    const absorbance = Math.round(rawA * 1000) / 1000;
    const transmittance_pct = Math.round(100 * 10 ** -rawA * 100) / 100;
    points.push({ wavelength_nm: nm, absorbance, transmittance_pct });
    if (absorbance > peakAbsorbance) {
      peakAbsorbance = absorbance;
      lambdaMax_nm = nm;
    }
  }

  return {
    points,
    lambdaMax_nm: peakAbsorbance >= 0.02 ? lambdaMax_nm : null,
    peakAbsorbance,
    pathLength_cm,
    apparentHex: optics.colorHex,
    hasAbsorption: peakAbsorbance >= 0.02,
    turbidityBaseline: Math.round(safeTurbidity * 0.42 * 1000) / 1000,
  };
}
