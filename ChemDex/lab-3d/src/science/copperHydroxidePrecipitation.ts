import type { SubstanceContent } from '../types/chemistry';
import { identifySpecies } from './speciesIdentity';
import { aqueousConstantsAtTemperature } from './aqueousTemperature';

/** WATEQ4F Cu(OH)2 + 2H+ = Cu2+ + 2H2O: log K 8.64,
 * dH -15.25 kcal/mol. Thermodynamic solid constant; the aqueous solver below
 * separately accounts for mononuclear hydrolysis and CuSO4 ion pairing. */
export function copperHydroxideKsp(temperature_c: number): number | null {
  const constants = aqueousConstantsAtTemperature(temperature_c);
  if (!constants) return null;
  return 10 ** 8.64 * Math.exp(-15.25 * 4184 / 8.314462618
    * (1 / 298.15 - 1 / (temperature_c + 273.15))) * constants.waterKw ** 2;
}

function inventory(contents: readonly SubstanceContent[], volume_ml: number) {
  if (!(volume_ml > 0) || !Number.isFinite(volume_ml)) return null;
  let cu = 0, base = 0, sodiumSulfate = 0, water = false;
  for (const c of contents) {
    if (!Number.isFinite(c.moles) || c.moles < 0 || (c.location && c.location !== 'bulk')) return null;
    if (c.moles === 0) continue;
    const identity = identifySpecies(c.formula), phase = c.phase ?? identity.phase;
    if (identity.formula === 'H2O' && phase === 'l') { water = true; continue; }
    if (identity.formula === 'Cu(OH)2' && phase === 's') continue;
    if (phase !== 'aq') return null;
    if (identity.formula === 'CuSO4') cu += c.moles;
    else if (identity.formula === 'NaOH') base += c.moles;
    else if (identity.formula === 'Na2SO4') sodiumSulfate += c.moles;
    else return null;
  }
  if (!water) return null;
  return { cu, base, sodiumSulfate, liters: volume_ml / 1000 };
}

function speciate(totals: NonNullable<ReturnType<typeof inventory>>, temperature_c: number, extent = 0) {
  const constants = aqueousConstantsAtTemperature(temperature_c);
  if (!constants) return null;
  const cuTotal = Math.max(0, totals.cu - extent) / totals.liters;
  const sodium = (totals.base + 2 * totals.sodiumSulfate) / totals.liters;
  const sulfateTotal = (totals.cu + totals.sodiumSulfate) / totals.liters;
  // WATEQ4F mononuclear hydrolysis constants at 25 C; temperature dependence
  // was not specified for these entries. Cu dimers are not included yet.
  // WATEQ4F Cu2+ + SO4(2-) = CuSO4(aq): log beta=2.31, dH=1.22 kcal/mol.
  const beta = 10 ** 2.31 * Math.exp(1.22 * 4184 / 8.314462618
    * (1 / 298.15 - 1 / (temperature_c + 273.15)));
  const at = (logH: number) => {
    const h = 10 ** logH, oh = constants.waterKw / h;
    const r1 = 1e-8 / h, r2 = 10 ** -13.68 / h ** 2;
    const r3 = 10 ** -26.9 / h ** 3, r4 = 10 ** -39.6 / h ** 4;
    const a = 1 + r1 + r2 + r3 + r4, b = 1 + h / constants.bisulfateKa;
    // Eliminate free sulfate from both mass balances, then solve the positive
    // quadratic root using a cancellation-safe form for either sign of B.
    const A = a * beta, B = a * b + beta * (sulfateTotal - cuTotal), C = cuTotal * b;
    const root = Math.sqrt(B * B + 4 * A * C);
    const freeCopper_M = C === 0 ? 0 : B >= 0 ? 2 * C / (B + root) : (-B + root) / (2 * A);
    const freeSulfate_M = sulfateTotal / (b + beta * freeCopper_M);
    const copperSulfatePair_M = beta * freeCopper_M * freeSulfate_M;
    const bisulfate_M = freeSulfate_M * h / constants.bisulfateKa;
    const sulfateCharge = 2 * freeSulfate_M + bisulfate_M;
    return { ph: -logH, freeCopper_M, hydroxide_M: oh, freeSulfate_M, copperSulfatePair_M,
      bisulfate_M, hydrolyzedCopper_M: freeCopper_M * (r1 + r2 + r3 + r4),
      chargeResidual_M: h + sodium + freeCopper_M * (2 + r1 - r3 - 2 * r4) - oh - sulfateCharge };
  };
  let low = -16, high = 0;
  if (at(low).chargeResidual_M > 0 || at(high).chargeResidual_M < 0) return null;
  for (let i = 0; i < 56; i++) {
    const mid = (low + high) / 2;
    if (at(mid).chargeResidual_M > 0) high = mid; else low = mid;
  }
  return at((low + high) / 2);
}

export function copperSulfateAqueousState(contents: readonly SubstanceContent[], volume_ml: number, temperature_c: number) {
  const totals = inventory(contents, volume_ml);
  return totals ? speciate(totals, temperature_c) : null;
}

export function copperHydroxideExtent(contents: readonly SubstanceContent[], volume_ml: number, temperature_c: number): number | null {
  const ksp = copperHydroxideKsp(temperature_c), totals = inventory(contents, volume_ml);
  if (ksp === null || !totals || !speciate(totals, temperature_c)) return null;
  const product = (x: number) => {
    const state = speciate(totals, temperature_c, x)!;
    return state.freeCopper_M * state.hydroxide_M ** 2;
  };
  if (product(0) <= ksp * (1 + 1e-10)) return 0;
  let low = 0, high = Math.min(totals.cu, totals.base / 2);
  for (let i = 0; i < 60; i++) {
    const mid = (low + high) / 2;
    if (product(mid) > ksp) low = mid; else high = mid;
  }
  return (low + high) / 2;
}
