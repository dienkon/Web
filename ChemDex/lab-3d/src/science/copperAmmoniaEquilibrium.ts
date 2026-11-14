import type { SubstanceContent } from '../types/chemistry';
import { identifySpecies } from './speciesIdentity';
import { reagentPhase } from './reagentAvailability';
import { aqueousConstantsAtTemperature, waterDissociationEnthalpy_J_mol } from './aqueousTemperature';
import { copperHydroxideKsp } from './copperHydroxidePrecipitation';

export const COPPER_AMMONIA_SOURCES = [
  'https://skb.com/publication/17527/TR-00-13.pdf',
  'https://github.com/phreeqc-dev/phreeqc3/blob/master/database/wateq4f.dat',
  'https://chemed.chem.purdue.edu/genchem/topicreview/bp/ch18/combine.php',
];
// SKB TR-00-13, section 7.7.1.2, printed p.87 (PDF p.84): cumulative
// constants at infinite dilution, 25 C. Constant reaction heat capacities are
// approximated as zero; concentrations approximate activities in this model.
const LOG_BETA = [4.10, 7.51, 10.31, 12.35];
export const AMMINE_FORMATION_DH_J = [-24e3, -45e3, -68e3, -90e3];
export function copperAmmineBetas(temperature_c: number): number[] | null {
  if (!aqueousConstantsAtTemperature(temperature_c)) return null;
  return LOG_BETA.map((value, i) => 10 ** value * Math.exp(AMMINE_FORMATION_DH_J[i]
    / 8.314462618 * (1 / 298.15 - 1 / (temperature_c + 273.15))));
}

export function copperAmmineFormula(n: number, anion: 'sulfate' | 'hydroxide' = 'sulfate'): string {
  return `[Cu(NH3)${n === 1 ? '' : n}]${anion === 'sulfate' ? 'SO4' : '(OH)2'}`;
}

export interface CopperAmmoniaInventory {
  copper_mol: number;
  nitrogen_mol: number;
  sulfate_mol: number;
  sodium_mol: number;
  solid_mol: number;
  liquidWater_mol: number;
  /** Oxygen outside sulfate; determines the finite water balance on projection. */
  oxygenOutsideSulfate_mol: number;
  liters: number;
}

/** Analytical formula-unit pools, as in the existing aqueous salt models.
 * A CuSO4(aq) pool does not assert that all copper is neutral CuSO4 molecules.
 * Other ligands, metals, concentrated acids and dry stock need other models. */
export function copperAmmoniaInventory(contents: readonly SubstanceContent[], volume_ml: number): CopperAmmoniaInventory | null {
  if (!Number.isFinite(volume_ml) || volume_ml <= 0) return null;
  let copper_mol = 0, nitrogen_mol = 0, sulfate_mol = 0, sodium_mol = 0, solid_mol = 0;
  let liquidWater_mol = 0, oxygenOutsideSulfate_mol = 0;
  for (const item of contents) {
    if (item.location && item.location !== 'bulk') continue;
    if (!Number.isFinite(item.moles) || item.moles < 0 || !Number.isFinite(item.mass_g) || item.mass_g < 0) return null;
    if (item.moles === 0) continue;
    const id = identifySpecies(item.formula), phase = reagentPhase(item), amount = item.moles;
    if (id.concentration === 'concentrated') return null;
    if (id.formula === 'H2O' && phase === 'l') {
      liquidWater_mol += amount; oxygenOutsideSulfate_mol += amount; continue;
    }
    if (id.formula === 'Cu(OH)2' && phase === 's') {
      copper_mol += amount; solid_mol += amount; oxygenOutsideSulfate_mol += 2 * amount; continue;
    }
    if (phase !== 'aq') return null;
    if (id.formula === 'CuSO4') { copper_mol += amount; sulfate_mol += amount; }
    else if (id.formula === 'NH3') nitrogen_mol += amount;
    else if (id.formula === '(NH4)2SO4') { nitrogen_mol += 2 * amount; sulfate_mol += amount; }
    else if (id.formula === 'H2SO4') sulfate_mol += amount;
    else if (id.formula === 'Na2SO4') { sodium_mol += 2 * amount; sulfate_mol += amount; }
    else if (id.formula === 'NaOH') { sodium_mol += amount; oxygenOutsideSulfate_mol += amount; }
    else if (id.formula === 'Cu(OH)2') { copper_mol += amount; oxygenOutsideSulfate_mol += 2 * amount; }
    else {
      let matched = false;
      for (let n = 1; n <= 4; n++) for (const anion of ['sulfate', 'hydroxide'] as const) {
        if (id.formula !== copperAmmineFormula(n, anion)) continue;
        matched = true; copper_mol += amount; nitrogen_mol += n * amount;
        if (anion === 'sulfate') sulfate_mol += amount;
        else oxygenOutsideSulfate_mol += 2 * amount;
      }
      if (!matched) return null;
    }
  }
  if (!(copper_mol > 1e-12) || !(nitrogen_mol > 1e-12) || !(liquidWater_mol > 0)) return null;
  return { copper_mol, nitrogen_mol, sulfate_mol, sodium_mol, solid_mol, liquidWater_mol, oxygenOutsideSulfate_mol, liters: volume_ml / 1000 };
}

export interface CopperAmmoniaState {
  ph: number;
  freeCopper_M: number;
  freeAmmonia_M: number;
  ammonium_M: number;
  hydroxide_M: number;
  freeSulfate_M: number;
  bisulfate_M: number;
  copperSulfatePair_M: number;
  hydrolyzedCopper_M: number;
  ammines_M: number[];
  solid_mol: number;
  saturationRatio: number;
  chargeResidual_M: number;
  copperResidual_M: number;
  nitrogenResidual_M: number;
  sulfateResidual_M: number;
  /** Relative thermodynamic potential in the selected species basis, not
   * an absolute heat of formation or a measured calorimetry result. */
  relativeEnthalpy_J: number;
}

/** Coupled charge, N/Cu/S balances and Cu(OH)2 complementarity. A fixed-solid
 * solve describes aqueous speciation during finite precipitation/dissolution;
 * otherwise the stable solid amount is solved with the aqueous species. */
export function solveCopperAmmonia(totals: CopperAmmoniaInventory, temperature_c: number,
  fixedSolid_mol?: number): CopperAmmoniaState | null {
  const constants = aqueousConstantsAtTemperature(temperature_c), beta = copperAmmineBetas(temperature_c);
  const ksp = copperHydroxideKsp(temperature_c);
  if (!constants || !beta || !ksp) return null;
  const { liters } = totals;
  const C = totals.copper_mol / liters, N = totals.nitrogen_mol / liters, S = totals.sulfate_mol / liters;
  if (![C, N, S].every(Number.isFinite) || C <= 0 || N <= 0 || S < 0) return null;
  if (fixedSolid_mol !== undefined && (!Number.isFinite(fixedSolid_mol) || fixedSolid_mol < 0 || fixedSolid_mol > totals.copper_mol)) return null;
  const dissolved = fixedSolid_mol === undefined ? C : (totals.copper_mol - fixedSolid_mol) / liters;
  const pairBeta = 10 ** 2.31 * Math.exp(1.22 * 4184 / 8.314462618 * (1 / 298.15 - 1 / (temperature_c + 273.15)));
  const at = (logH: number) => {
    const h = 10 ** logH, oh = constants.waterKw / h;
    const hydrolysis = [1e-8 / h, 10 ** -13.68 / h ** 2, 10 ** -26.9 / h ** 3, 10 ** -39.6 / h ** 4];
    const hydroSum = 1 + hydrolysis.reduce((s, r) => s + r, 0);
    const sulfateFactor = 1 + h / constants.bisulfateKa;
    const speciesAt = (ammonia: number) => {
      const ratios = beta.map((b, i) => b * ammonia ** (i + 1));
      const a = hydroSum + ratios.reduce((s, r) => s + r, 0);
      const A = a * pairBeta, B = a * sulfateFactor + pairBeta * (S - dissolved), D = dissolved * sulfateFactor;
      const root = Math.sqrt(B * B + 4 * A * D);
      const unsaturatedCopper = D === 0 ? 0 : B >= 0 ? 2 * D / (B + root) : (-B + root) / (2 * A);
      const cu = fixedSolid_mol === undefined ? Math.min(unsaturatedCopper, ksp / oh ** 2) : unsaturatedCopper;
      const sulfate = S / (sulfateFactor + pairBeta * cu), pair = pairBeta * cu * sulfate;
      const ammines = ratios.map(r => cu * r), ammonium = ammonia * h / constants.ammoniumKa;
      return { cu, sulfate, pair, ammines, ammonium,
        nitrogen: ammonia + ammonium + ammines.reduce((sum, c, i) => sum + (i + 1) * c, 0) };
    };
    let low = 0, high = N / (1 + h / constants.ammoniumKa);
    for (let i = 0; i < 48; i++) {
      const mid = (low + high) / 2;
      if (speciesAt(mid).nitrogen > N) high = mid; else low = mid;
    }
    const ammonia = (low + high) / 2, s = speciesAt(ammonia);
    const bisulfate = s.sulfate * h / constants.bisulfateKa;
    const aqCopper = s.cu * hydroSum + s.pair + s.ammines.reduce((sum, c) => sum + c, 0);
    const solid = fixedSolid_mol ?? Math.max(0, (C - aqCopper) * liters);
    const charge = h + totals.sodium_mol / liters + s.ammonium + s.cu * (2 + hydrolysis[0] - hydrolysis[2] - 2 * hydrolysis[3])
      + 2 * s.ammines.reduce((sum, c) => sum + c, 0) - oh - 2 * s.sulfate - bisulfate;
    return { ph: -logH, freeCopper_M: s.cu, freeAmmonia_M: ammonia, ammonium_M: s.ammonium,
      hydroxide_M: oh, freeSulfate_M: s.sulfate, bisulfate_M: bisulfate, copperSulfatePair_M: s.pair,
      hydrolyzedCopper_M: s.cu * (hydroSum - 1), ammines_M: s.ammines, solid_mol: solid,
      saturationRatio: s.cu * oh ** 2 / ksp, chargeResidual_M: charge,
      copperResidual_M: aqCopper + solid / liters - C, nitrogenResidual_M: s.nitrogen - N,
      sulfateResidual_M: s.sulfate + bisulfate + s.pair - S };
  };
  let low = -16, high = 3;
  if (at(low).chargeResidual_M > 0 || at(high).chargeResidual_M < 0) return null;
  for (let i = 0; i < 52; i++) {
    const mid = (low + high) / 2;
    if (at(mid).chargeResidual_M > 0) high = mid; else low = mid;
  }
  const state = at((low + high) / 2), t = temperature_c + 273.15;
  const waterHeat = waterDissociationEnthalpy_J_mol(temperature_c)!;
  const ammoniumDissociationHeat = 8.314462618 * Math.LN10 * (-0.001225 * t * t + 2835.76);
  const bisulfateDissociationHeat = -8.314462618 * Math.LN10 * (0.006473 * t * t - 2307.9 + 19.8858 * t / Math.LN10);
  const relativeEnthalpy_J = liters * (state.ammines_M.reduce((s, c, i) => s + c * AMMINE_FORMATION_DH_J[i], 0)
    - state.ammonium_M * ammoniumDissociationHeat - state.bisulfate_M * bisulfateDissociationHeat
    + state.hydroxide_M * waterHeat + state.copperSulfatePair_M * 1.22 * 4184)
    + state.solid_mol * 15.25 * 4184;
  const result = { ...state, relativeEnthalpy_J };
  return Object.values(result).filter(v => typeof v === 'number').every(Number.isFinite) ? result : null;
}

const cache = new Map<string, { inventory: CopperAmmoniaInventory; state: CopperAmmoniaState } | null>();
export function copperAmmoniaEquilibrium(contents: readonly SubstanceContent[], volume_ml: number, temperature_c: number,
  fixedSolid = false) {
  const inventory = copperAmmoniaInventory(contents, volume_ml);
  if (!inventory) return null;
  const key = `${volume_ml}|${temperature_c}|${fixedSolid}|` + contents.filter(c => !c.location || c.location === 'bulk')
    .map(c => `${c.formula}:${reagentPhase(c)}:${c.moles}:${c.mass_g}`).join('|');
  if (cache.has(key)) return cache.get(key)!;
  const state = solveCopperAmmonia(inventory, temperature_c, fixedSolid ? inventory.solid_mol : undefined);
  const dissolved = state ? inventory.copper_mol - state.solid_mol : 0;
  const sodiumSulfate = Math.min(inventory.sulfate_mol, inventory.sodium_mol / 2);
  const waterLeft = inventory.oxygenOutsideSulfate_mol - 2 * (inventory.copper_mol - Math.min(inventory.sulfate_mol - sodiumSulfate, dissolved))
    - (inventory.sodium_mol - 2 * sodiumSulfate);
  const result = state && (fixedSolid || waterLeft > 0) ? { inventory, state } : null;
  if (result) { Object.freeze(state!.ammines_M); Object.freeze(state); Object.freeze(inventory); Object.freeze(result); }
  if (cache.size >= 64) cache.delete(cache.keys().next().value!);
  cache.set(key, result);
  return result;
}
