import type { SubstanceContent } from '../types/chemistry';
import { identifySpecies } from './speciesIdentity';
import { carbonateFractions, carbonateConstantsAtTemperature } from './carbonateEquilibrium';
import { AQUEOUS_CONSTANTS_25C, aqueousConstantsAtTemperature, supportedAqueousTemperature } from './aqueousTemperature';
export { AQUEOUS_CONSTANTS_25C } from './aqueousTemperature';

/** OpenStax Chemistry 2e §14.3, concentration constants at 25 °C.
 * https://openstax.org/books/chemistry-2e/pages/14-3-relative-strengths-of-acids-and-bases
 * Supported temperature corrections are in aqueousTemperature/carbonateEquilibrium.
 * Formula-unit inventory remains unchanged: this is dissolved speciation only.
 */

export interface AqueousEquilibrium {
  inorganicCarbon_M: number;
  carbonDioxide_M: number;
  bicarbonate_M: number;
  carbonate_M: number;
  calcium_M: number;
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

export function indicatorKey(formula: string): string | null {
  const token = formula.toLowerCase().replace(/[\s_-]/g, '');
  if (token === 'phenolphthalein') return 'phenolphthalein';
  if (token === 'methylorange') return 'methyl_orange';
  if (token === 'bromothymolblue') return 'bromothymol_blue';
  return null;
}

/** Finite analytical totals + electroneutrality, including water ionization.
 * Unknown solutes/solids cause a null result instead of an invented pH 7.
 * Explicit calcite solid is handled by the separate finite phase partition.
 * Elemental metal solids belong to surface/redox kinetics, not the aqueous
 * charge balance: only their dissolved products enter this calculation.
 * No activity correction, gas transfer or metal hydrolysis. Acetate-containing
 * systems retain the complete 25 C reference until its temperature fit is sourced.
 */
export function solveAqueousEquilibrium(contents: readonly SubstanceContent[], volume_ml: number,
  temperature_c = 25): AqueousEquilibrium | null {
  if (!Number.isFinite(volume_ml) || volume_ml <= 0 || !contents.length || !supportedAqueousTemperature(temperature_c)) return null;
  const liters = volume_ml / 1000;
  let acetic = 0, ammoniacal = 0, sulfuric = 0, fixedCharge = 0, carbonic = 0, calcium = 0;
  let hasSolution = false;
  for (const item of contents) {
    if (!Number.isFinite(item.moles) || item.moles < 0) return null;
    if (item.moles === 0) continue;
    const identity = identifySpecies(item.formula);
    const phase = item.phase ?? item.state ?? identity.phase;
    if (phase === 'g') continue;
    if (phase === 's') {
      if (['caco3', 'ca(oh)2', 'h2o', 'na', 'k', 'li', 'ca', 'mg', 'al', 'zn', 'fe', 'cu', 'ag']
        .includes(identity.formula.toLowerCase())) continue;
      return null;
    }
    const concentration = item.moles / liters;
    if (!Number.isFinite(concentration)) return null;
    const formula = identity.formula.toLowerCase();
    hasSolution = true;
    if (formula === 'h2o' || indicatorKey(identity.formula) || formula === 'starch') continue;
    switch (formula) {
      case 'hcl': case 'hno3': case 'hbr': case 'hi':
        fixedCharge -= concentration; break;
      case 'naoh': case 'koh': case 'lioh':
        fixedCharge += concentration; break;
      case 'ca(oh)2':
        calcium += concentration; fixedCharge += 2 * concentration; break;
      case 'ba(oh)2':
        fixedCharge += 2 * concentration; break;
      case 'co2':
        if (phase !== 'aq') return null;
        carbonic += concentration; break;
      case 'na2co3': case 'k2co3':
        carbonic += concentration; fixedCharge += 2 * concentration; break;
      case 'nahco3': case 'khco3':
        carbonic += concentration; fixedCharge += concentration; break;
      case 'ca(hco3)2':
        carbonic += 2 * concentration; calcium += concentration; fixedCharge += 2 * concentration; break;
      case 'caco3':
        // Formal dissolved Ca/carbonate inventory, not a claim that neutral
        // CaCO3 molecules account for all dissolved calcium.
        if (phase !== 'aq') return null;
        carbonic += concentration; calcium += concentration; fixedCharge += 2 * concentration; break;
      case 'ch3cooh': case 'hc2h3o2':
        acetic += concentration; break;
      case 'ch3coona': case 'nach3coo': case 'ch3cook': case 'kch3coo':
        acetic += concentration; fixedCharge += concentration; break;
      case 'nh3':
        ammoniacal += concentration; break;
      case 'nh4cl': case 'nh4no3':
        ammoniacal += concentration; fixedCharge -= concentration; break;
      case 'ch3coonh4': case 'nh4ch3coo':
        acetic += concentration; ammoniacal += concentration; break;
      case 'h2so4':
        sulfuric += concentration; break;
      case 'nahso4': case 'khso4':
        sulfuric += concentration; fixedCharge += concentration; break;
      case 'na2so4': case 'k2so4':
        sulfuric += concentration; fixedCharge += 2 * concentration; break;
      case '(nh4)2so4':
        sulfuric += concentration; ammoniacal += 2 * concentration; break;
      case 'nacl': case 'kcl': case 'nano3': case 'kno3':
      case 'cacl2': case 'ca(no3)2':
        calcium += concentration; break;
      case 'bacl2': case 'ba(no3)2':
        break; // Equal spectator cation/anion equivalents.
      default: return null;
    }
  }
  if (!hasSolution) return null;
  const referenceTemperature_c = acetic > 0 ? 25 : temperature_c;
  const { waterKw, ammoniumKa, bisulfateKa } = aqueousConstantsAtTemperature(referenceTemperature_c)!;
  const { aceticKa } = AQUEOUS_CONSTANTS_25C;
  const carbonateConstants = carbonateConstantsAtTemperature(referenceTemperature_c)!;
  const carbonCharge = (hydrogen: number) => {
    if (carbonic === 0) return 0;
    const fractions = carbonateFractions(hydrogen, carbonateConstants);
    return carbonic * (fractions.bicarbonate + 2 * fractions.carbonate);
  };
  const residual = (hydrogen: number) => hydrogen + fixedCharge
    + ammoniacal * hydrogen / (hydrogen + ammoniumKa)
    - waterKw / hydrogen
    - acetic * aceticKa / (hydrogen + aceticKa)
    - sulfuric * (1 + bisulfateKa / (hydrogen + bisulfateKa)) - carbonCharge(hydrogen);
  let lower = -4, upper = 18;
  if (residual(10 ** -lower) < 0 || residual(10 ** -upper) > 0) return null;
  for (let iteration = 0; iteration < 64; iteration++) {
    const middle = (lower + upper) / 2;
    if (residual(10 ** -middle) > 0) lower = middle;
    else upper = middle;
  }
  const ph = (lower + upper) / 2;
  const hydrogen = 10 ** -ph;
  const acetate = acetic * aceticKa / (hydrogen + aceticKa);
  const ammonium = ammoniacal * hydrogen / (hydrogen + ammoniumKa);
  const sulfate = sulfuric * bisulfateKa / (hydrogen + bisulfateKa);
  const carbon = carbonateFractions(hydrogen, carbonateConstants);
  return {
    inorganicCarbon_M: carbonic, carbonDioxide_M: carbonic * carbon.carbonDioxide,
    bicarbonate_M: carbonic * carbon.bicarbonate, carbonate_M: carbonic * carbon.carbonate,
    calcium_M: calcium,
    ph, hydrogen_M: hydrogen, hydroxide_M: waterKw / hydrogen,
    aceticAcid_M: acetic - acetate, acetate_M: acetate,
    ammonia_M: ammoniacal - ammonium, ammonium_M: ammonium,
    bisulfate_M: sulfuric - sulfate, sulfate_M: sulfate,
    chargeResidual_M: residual(hydrogen),
    referenceTemperature_c, idealSolution: true,
  };
}

// Immutable inventory arrays are the cache keys; weak entries disappear with
// old vessel snapshots. No per-frame stringification or unbounded history.
const cache = new WeakMap<readonly SubstanceContent[], { volume: number; temperature: number; result: AqueousEquilibrium | null }>();
export function cachedAqueousEquilibrium(contents: readonly SubstanceContent[], volume_ml: number,
  temperature_c = 25): AqueousEquilibrium | null {
  const previous = cache.get(contents);
  if (previous && previous.volume === volume_ml && previous.temperature === temperature_c) return previous.result;
  const result = solveAqueousEquilibrium(contents, volume_ml, temperature_c);
  cache.set(contents, { volume: volume_ml, temperature: temperature_c, result });
  return result;
}

export function aqueousModelFields(equilibrium: AqueousEquilibrium | null) {
  return {
    phModel: equilibrium ? equilibrium.referenceTemperature_c === 25 ? 'ideal_aqueous_25c' as const : 'ideal_aqueous_temperature' as const : undefined,
    phReferenceTemperature_c: equilibrium?.referenceTemperature_c,
  };
}
