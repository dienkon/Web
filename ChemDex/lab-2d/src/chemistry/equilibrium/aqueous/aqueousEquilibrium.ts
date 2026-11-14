import type { SubstanceQuantity } from '../../../types/chemistry';
import {
  AQUEOUS_CONSTANTS_25C,
  aqueousConstantsAtTemperature,
  supportedAqueousTemperature,
} from './aqueousTemperature';
import { carbonateConstantsAtTemperature, carbonateFractions } from './carbonateEquilibrium';
import { identifySpecies } from './speciesIdentity';

export { AQUEOUS_CONSTANTS_25C } from './aqueousTemperature';

export interface AqueousEquilibrium {
  inorganicCarbon_M: number;
  carbonDioxide_M: number;
  bicarbonate_M: number;
  carbonate_M: number;
  calcium_M: number;
  phosphoric_M: number;
  ph: number;
  hydrogen_M: number;
  hydroxide_M: number;
  aceticAcid_M: number;
  acetate_M: number;
  ammonia_M: number;
  ammonium_M: number;
  bisulfate_M: number;
  sulfate_M: number;
  chargeResidual_M: number;
  referenceTemperature_c: number;
  idealSolution: true;
}

const INERT_OR_INSOLUBLE_SOLIDS = new Set([
  'caco3',
  'ca(oh)2',
  'h2o',
  'na',
  'k',
  'li',
  'ca',
  'mg',
  'al',
  'zn',
  'fe',
  'cu',
  'ag',
  'pb',
  'agcl',
  'agbr',
  'agi',
  'baso4',
  'pbi2',
  'pbcl2',
  'cu(oh)2',
  'fe(oh)2',
  'fe(oh)3',
  'al(oh)3',
  'zn(oh)2',
  'mg(oh)2',
  'cuo',
  'fe2o3',
  'fe3o4',
  'al2o3',
  'mno2',
  's',
  'c',
  'i2',
]);

export function indicatorKey(formula: string): string | null {
  const token = formula.toLowerCase().replace(/[\s_-]/g, '');
  if (token === 'phenolphthalein') return 'phenolphthalein';
  if (token === 'methylorange') return 'methyl_orange';
  if (token === 'bromothymolblue') return 'bromothymol_blue';
  if (token === 'thymolphthalein') return 'thymolphthalein';
  if (token === 'litmus') return 'litmus';
  if (token === 'universal') return 'universal';
  return null;
}

function phosphateFractions(hydrogen_M: number) {
  const { phosphoricKa1: k1, phosphoricKa2: k2, phosphoricKa3: k3 } = AQUEOUS_CONSTANTS_25C;
  const h2 = hydrogen_M * hydrogen_M;
  const h3 = h2 * hydrogen_M;
  const denom = h3 + k1 * h2 + k1 * k2 * hydrogen_M + k1 * k2 * k3;
  return {
    h3po4: h3 / denom,
    h2po4: (k1 * h2) / denom,
    hpo4: (k1 * k2 * hydrogen_M) / denom,
    po4: (k1 * k2 * k3) / denom,
  };
}

/**
 * Finite analytical totals + electroneutrality (including water self-ionization).
 * Returns null if volume/temperature are out of range or if any unrecognized dissolved
 * species is encountered so callers can safely fall back with explicit provenance.
 */
export function solveAqueousEquilibrium(
  contents: readonly SubstanceQuantity[],
  volume_ml: number,
  temperature_c = 25
): AqueousEquilibrium | null {
  if (
    !Number.isFinite(volume_ml) ||
    volume_ml <= 0 ||
    !contents.length ||
    !supportedAqueousTemperature(temperature_c)
  ) {
    return null;
  }

  const liters = volume_ml / 1000;
  let acetic = 0;
  let ammoniacal = 0;
  let sulfuric = 0;
  let phosphoric = 0;
  let carbonic = 0;
  let calcium = 0;
  let fixedCharge = 0;
  let hasSolution = false;

  for (const item of contents) {
    if (!Number.isFinite(item.moles) || item.moles < 0) return null;
    if (item.moles === 0) continue;

    const identity = identifySpecies(item.formula);
    const phase = item.state ?? identity.phase;
    if (phase === 'g') continue;
    const formula = identity.formula.toLowerCase();

    if (phase === 's') {
      if (INERT_OR_INSOLUBLE_SOLIDS.has(formula)) continue;
      return null;
    }

    const concentration = item.moles / liters;
    if (!Number.isFinite(concentration)) return null;

    hasSolution = true;
    if (
      formula === 'h2o' ||
      indicatorKey(identity.formula) ||
      formula === 'starch' ||
      formula === 'c2h5oh' ||
      formula === 'c6h12o6' ||
      formula === 'c12h22o11'
    ) {
      continue;
    }

    switch (formula) {
      case 'hcl':
      case 'hno3':
      case 'hbr':
      case 'hi':
      case 'hclo4':
        fixedCharge -= concentration;
        break;
      case 'naoh':
      case 'koh':
      case 'lioh':
        fixedCharge += concentration;
        break;
      case 'ca(oh)2':
        calcium += concentration;
        fixedCharge += 2 * concentration;
        break;
      case 'ba(oh)2':
        fixedCharge += 2 * concentration;
        break;
      case 'co2':
      case 'h2co3':
        if (formula === 'co2' && phase !== 'aq') return null;
        carbonic += concentration;
        break;
      case 'na2co3':
      case 'k2co3':
        carbonic += concentration;
        fixedCharge += 2 * concentration;
        break;
      case 'nahco3':
      case 'khco3':
        carbonic += concentration;
        fixedCharge += concentration;
        break;
      case 'ca(hco3)2':
        carbonic += 2 * concentration;
        calcium += concentration;
        fixedCharge += 2 * concentration;
        break;
      case 'caco3':
        if (phase !== 'aq') return null;
        carbonic += concentration;
        calcium += concentration;
        fixedCharge += 2 * concentration;
        break;
      case '(nh4)2co3':
        carbonic += concentration;
        ammoniacal += 2 * concentration;
        break;
      case 'nh4hco3':
        carbonic += concentration;
        ammoniacal += concentration;
        break;
      case 'ch3cooh':
      case 'hc2h3o2':
      case 'c2h4o2':
        acetic += concentration;
        break;
      case 'ch3coona':
      case 'nach3coo':
      case 'ch3cook':
      case 'kch3coo':
        acetic += concentration;
        fixedCharge += concentration;
        break;
      case 'ca(ch3coo)2':
      case '(ch3coo)2ca':
        acetic += 2 * concentration;
        calcium += concentration;
        fixedCharge += 2 * concentration;
        break;
      case 'ba(ch3coo)2':
      case '(ch3coo)2ba':
        acetic += 2 * concentration;
        fixedCharge += 2 * concentration;
        break;
      case 'ch3coonh4':
      case 'nh4ch3coo':
        acetic += concentration;
        ammoniacal += concentration;
        break;
      case 'nh3':
      case 'nh4oh':
        ammoniacal += concentration;
        break;
      case 'nh4cl':
      case 'nh4no3':
      case 'nh4br':
      case 'nh4i':
        ammoniacal += concentration;
        fixedCharge -= concentration;
        break;
      case 'h2so4':
        sulfuric += concentration;
        break;
      case 'nahso4':
      case 'khso4':
        sulfuric += concentration;
        fixedCharge += concentration;
        break;
      case 'na2so4':
      case 'k2so4':
        sulfuric += concentration;
        fixedCharge += 2 * concentration;
        break;
      case '(nh4)2so4':
        sulfuric += concentration;
        ammoniacal += 2 * concentration;
        break;
      case 'h3po4':
        phosphoric += concentration;
        break;
      case 'nah2po4':
      case 'kh2po4':
        phosphoric += concentration;
        fixedCharge += concentration;
        break;
      case 'na2hpo4':
      case 'k2hpo4':
        phosphoric += concentration;
        fixedCharge += 2 * concentration;
        break;
      case 'na3po4':
      case 'k3po4':
        phosphoric += concentration;
        fixedCharge += 3 * concentration;
        break;
      case 'cacl2':
      case 'ca(no3)2':
        calcium += concentration;
        break;
      case 'nacl':
      case 'kcl':
      case 'nabr':
      case 'kbr':
      case 'nai':
      case 'ki':
      case 'nano3':
      case 'kno3':
      case 'naclo4':
      case 'kclo4':
      case 'bacl2':
      case 'babr2':
      case 'ba(no3)2':
      case 'mgcl2':
      case 'mgso4':
        break;
      default:
        return null;
    }
  }

  if (!hasSolution) return null;

  // Acetic and phosphoric acid systems currently lock to 25 °C reference constants until T-fits are sourced.
  const referenceTemperature_c = acetic > 0 || phosphoric > 0 ? 25 : temperature_c;
  const { waterKw, ammoniumKa, bisulfateKa } = aqueousConstantsAtTemperature(referenceTemperature_c)!;
  const { aceticKa } = AQUEOUS_CONSTANTS_25C;
  const carbonateConstants = carbonateConstantsAtTemperature(referenceTemperature_c)!;

  const carbonCharge = (hydrogen: number) => {
    if (carbonic === 0) return 0;
    const fractions = carbonateFractions(hydrogen, carbonateConstants);
    return carbonic * (fractions.bicarbonate + 2 * fractions.carbonate);
  };

  const phosphateCharge = (hydrogen: number) => {
    if (phosphoric === 0) return 0;
    const fractions = phosphateFractions(hydrogen);
    return phosphoric * (fractions.h2po4 + 2 * fractions.hpo4 + 3 * fractions.po4);
  };

  const residual = (hydrogen: number) =>
    hydrogen +
    fixedCharge +
    (ammoniacal * hydrogen) / (hydrogen + ammoniumKa) -
    waterKw / hydrogen -
    (acetic * aceticKa) / (hydrogen + aceticKa) -
    sulfuric * (1 + bisulfateKa / (hydrogen + bisulfateKa)) -
    carbonCharge(hydrogen) -
    phosphateCharge(hydrogen);

  let lower = -4;
  let upper = 18;
  if (residual(10 ** -lower) < 0 || residual(10 ** -upper) > 0) return null;

  for (let iteration = 0; iteration < 64; iteration++) {
    const middle = (lower + upper) / 2;
    if (residual(10 ** -middle) > 0) lower = middle;
    else upper = middle;
  }

  const ph = (lower + upper) / 2;
  const hydrogen = 10 ** -ph;
  const acetate = (acetic * aceticKa) / (hydrogen + aceticKa);
  const ammonium = (ammoniacal * hydrogen) / (hydrogen + ammoniumKa);
  const sulfate = (sulfuric * bisulfateKa) / (hydrogen + bisulfateKa);
  const carbon = carbonateFractions(hydrogen, carbonateConstants);

  return {
    inorganicCarbon_M: carbonic,
    carbonDioxide_M: carbonic * carbon.carbonDioxide,
    bicarbonate_M: carbonic * carbon.bicarbonate,
    carbonate_M: carbonic * carbon.carbonate,
    calcium_M: calcium,
    phosphoric_M: phosphoric,
    ph,
    hydrogen_M: hydrogen,
    hydroxide_M: waterKw / hydrogen,
    aceticAcid_M: acetic - acetate,
    acetate_M: acetate,
    ammonia_M: ammoniacal - ammonium,
    ammonium_M: ammonium,
    bisulfate_M: sulfuric - sulfate,
    sulfate_M: sulfate,
    chargeResidual_M: residual(hydrogen),
    referenceTemperature_c,
    idealSolution: true,
  };
}

const cache = new WeakMap<
  readonly SubstanceQuantity[],
  { volume: number; temperature: number; result: AqueousEquilibrium | null }
>();

export function cachedAqueousEquilibrium(
  contents: readonly SubstanceQuantity[],
  volume_ml: number,
  temperature_c = 25
): AqueousEquilibrium | null {
  const previous = cache.get(contents);
  if (previous && previous.volume === volume_ml && previous.temperature === temperature_c) {
    return previous.result;
  }
  const result = solveAqueousEquilibrium(contents, volume_ml, temperature_c);
  cache.set(contents, { volume: volume_ml, temperature: temperature_c, result });
  return result;
}
