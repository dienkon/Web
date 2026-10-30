import type { SubstanceContent } from '../types/chemistry';
import { identifySpecies } from './speciesIdentity';
import { aqueousConstantsAtTemperature } from './aqueousTemperature';

/** Fresh amorphous Fe(OH)3(a) PHASE, not the aqueous neutral species:
 * WATEQ4F log K acid dissolution=4.891. No phase enthalpy is supplied, so
 * this acid constant is held at its reference value when temperature changes. */
export function ferricHydroxideKsp(temperature_c: number): number | null {
  const constants = aqueousConstantsAtTemperature(temperature_c);
  return constants ? 10 ** 4.891 * constants.waterKw ** 3 : null;
}

function inventory(contents: readonly SubstanceContent[], volume_ml: number, allowAcid = false) {
  if (!(volume_ml > 0) || !Number.isFinite(volume_ml)) return null;
  let iron = 0, base = 0, salt = 0, acid = 0, solid = 0, water = false;
  for (const c of contents) {
    if (!Number.isFinite(c.moles) || c.moles < 0 || (c.location && c.location !== 'bulk')) return null;
    if (c.moles === 0) continue;
    const identity = identifySpecies(c.formula), phase = c.phase ?? identity.phase;
    if (identity.concentration === 'concentrated') return null;
    if (identity.formula === 'H2O' && phase === 'l') { water = true; continue; }
    if (identity.formula === 'Fe(OH)3' && phase === 's') { solid += c.moles; continue; }
    if (phase !== 'aq') return null;
    if (identity.formula === 'FeCl3') iron += c.moles;
    else if (identity.formula === 'NaOH') base += c.moles;
    else if (identity.formula === 'NaCl') salt += c.moles;
    else if (allowAcid && identity.formula === 'HCl') acid += c.moles;
    else return null;
  }
  return water ? { iron, base, salt, acid, solid, liters: volume_ml / 1000 } : null;
}

function speciate(totals: NonNullable<ReturnType<typeof inventory>>, temperature_c: number, extent = 0) {
  const constants = aqueousConstantsAtTemperature(temperature_c);
  if (!constants) return null;
  const ironTotal = Math.max(0, totals.iron - extent) / totals.liters;
  const chlorideTotal = (3 * totals.iron + totals.salt + totals.acid) / totals.liters;
  const sodium = (totals.base + totals.salt) / totals.liters;
  const thermal = (enthalpy_kcal: number) => Math.exp(enthalpy_kcal * 4184 / 8.314462618
    * (1 / 298.15 - 1 / (temperature_c + 273.15)));
  // WATEQ4F mononuclear and dissolved di-/trinuclear hydrolysis species.
  const k1 = 10 ** -2.19 * thermal(10.4), k2 = 10 ** -5.67 * thermal(17.1);
  const k3 = 10 ** -12.56 * thermal(24.8), k4 = 10 ** -21.6 * thermal(31.9);
  const beta1 = 10 ** 1.48 * thermal(5.6), beta2 = 10 ** 2.13, beta3 = 10 ** 1.13;
  const dimerK = 10 ** -2.95 * thermal(13.5), trimerK = 10 ** -6.3 * thermal(14.3);
  const at = (logH: number) => {
    const h = 10 ** logH, oh = constants.waterKw / h;
    const r1 = k1 / h, r2 = k2 / h ** 2, r3 = k3 / h ** 3, r4 = k4 / h ** 4;
    const hydrolysis = 1 + r1 + r2 + r3 + r4;
    const dimerRatio = dimerK / h ** 2, trimerRatio = trimerK / h ** 4;
    const chlorideState = (cl: number) => {
      const c1 = beta1 * cl, c2 = beta2 * cl ** 2, c3 = beta3 * cl ** 3;
      const a = hydrolysis + c1 + c2 + c3;
      // Fe total = a*f + 2*d*f^2 + 3*t*f^3. Positive coefficients
      // make this strictly increasing and convex. Each single-term root is
      // an upper bound, so Newton steps from their minimum stay above the root.
      let freeIron_M = Math.min(ironTotal / a, Math.sqrt(ironTotal / (2 * dimerRatio)),
        Math.cbrt(ironTotal / (3 * trimerRatio)));
      if (ironTotal > 0) {
        for (let i = 0; i < 16; i++) {
          const represented = freeIron_M * (a + freeIron_M * (2 * dimerRatio + 3 * trimerRatio * freeIron_M));
          if (Math.abs(represented - ironTotal) <= ironTotal * 1e-14) break;
          const derivative = a + freeIron_M * (4 * dimerRatio + 9 * trimerRatio * freeIron_M);
          freeIron_M -= (represented - ironTotal) / derivative;
        }
      }
      return { freeIron_M, c1, c2, c3,
        dimer_M: dimerRatio * freeIron_M ** 2, trimer_M: trimerRatio * freeIron_M ** 3,
        boundChloride_M: freeIron_M * (c1 + 2 * c2 + 3 * c3) };
    };
    // Bound chloride is a monotone function of free chloride. Solve its
    // analytical mass balance instead of treating all chloride as free.
    let lowCl = 0, highCl = chlorideTotal;
    if (ironTotal > 0) {
      for (let i = 0; i < 48; i++) {
        const mid = (lowCl + highCl) / 2;
        if (mid + chlorideState(mid).boundChloride_M > chlorideTotal) highCl = mid; else lowCl = mid;
      }
    } else lowCl = highCl;
    const freeChloride_M = (lowCl + highCl) / 2;
    const { freeIron_M, c1, c2, c3, dimer_M, trimer_M, boundChloride_M } = chlorideState(freeChloride_M);
    return { ph: -logH, hydroxide_M: oh, freeIron_M, freeChloride_M, boundChloride_M,
      // Hydrolyzed total is mol of Fe atoms/L; dimer/trimer fields are mol of
      // complexes/L. Count their 2/3 Fe atoms and +4/+5 charges separately.
      dimer_M, trimer_M,
      hydrolyzedIron_M: freeIron_M * (r1 + r2 + r3 + r4) + 2 * dimer_M + 3 * trimer_M,
      complexedIron_M: freeIron_M * (c1 + c2 + c3),
      chargeResidual_M: h + sodium + freeIron_M * (3 + 2 * r1 + r2 - r4 + 2 * c1 + c2)
        + 4 * dimer_M + 5 * trimer_M - oh - freeChloride_M };
  };
  let low = -16, high = 0;
  if (at(low).chargeResidual_M > 0 || at(high).chargeResidual_M < 0) return null;
  for (let i = 0; i < 56; i++) {
    const mid = (low + high) / 2;
    if (at(mid).chargeResidual_M > 0) high = mid; else low = mid;
  }
  return at((low + high) / 2);
}

export function ferricChlorideAqueousState(contents: readonly SubstanceContent[], volume_ml: number, temperature_c: number) {
  const totals = inventory(contents, volume_ml, true);
  return totals ? speciate(totals, temperature_c) : null;
}

/** Fe(OH)3(s) + 3 HCl -> FeCl3(aq) + 3 H2O. Negative precipitation
 * extent raises dissolved iron without changing analytical chloride/sodium.
 * Acid/base neutralization must be handled first when NaOH remains. */
export function ferricHydroxideDissolutionExtent(contents: readonly SubstanceContent[], volume_ml: number, temperature_c: number): number | null {
  const ksp = ferricHydroxideKsp(temperature_c), totals = inventory(contents, volume_ml, true);
  if (ksp === null || !totals || totals.base > 1e-15 || !speciate(totals, temperature_c)) return null;
  const maximum = Math.min(totals.solid, totals.acid / 3);
  if (!(maximum > 0)) return 0;
  const product = (x: number) => {
    const state = speciate(totals, temperature_c, -x)!;
    return state.freeIron_M * state.hydroxide_M ** 3;
  };
  if (product(0) >= ksp * (1 - 1e-10)) return 0;
  if (product(maximum) <= ksp) return maximum;
  let low = 0, high = maximum;
  for (let i = 0; i < 60; i++) {
    const mid = (low + high) / 2;
    if (product(mid) < ksp) low = mid; else high = mid;
  }
  return (low + high) / 2;
}

/** Forward extent of FeCl3 + 3 NaOH -> Fe(OH)3(s) + 3 NaCl only.
 * Not a general phase partition or spontaneous hydrolysis precipitation. */
export function ferricHydroxideExtent(contents: readonly SubstanceContent[], volume_ml: number, temperature_c: number): number | null {
  const ksp = ferricHydroxideKsp(temperature_c), totals = inventory(contents, volume_ml);
  if (ksp === null || !totals || !speciate(totals, temperature_c)) return null;
  const product = (x: number) => {
    const state = speciate(totals, temperature_c, x)!;
    return state.freeIron_M * state.hydroxide_M ** 3;
  };
  if (product(0) <= ksp * (1 + 1e-10)) return 0;
  let low = 0, high = Math.min(totals.iron, totals.base / 3);
  for (let i = 0; i < 60; i++) {
    const mid = (low + high) / 2;
    if (product(mid) > ksp) low = mid; else high = mid;
  }
  return (low + high) / 2;
}
