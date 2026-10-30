import type { SubstanceContent } from '../types/chemistry';
import { identifySpecies } from './speciesIdentity';
import { aqueousConstantsAtTemperature, temperatureAdjustedConstant, waterDissociationEnthalpy_J_mol } from './aqueousTemperature';

export const ALUMINUM_EQUILIBRIUM_SOURCES = [
  'https://github.com/phreeqc-dev/phreeqc3/blob/master/database/wateq4f.dat',
  'https://github.com/phreeqc-dev/phreeqc3/blob/master/database/phreeqc.dat',
];

/** WATEQ4F: fresh amorphous Al(OH)3(a), NOT gibbsite or aqueous Al(OH)3.
 * Concentrations approximate activities; no gel-aging or kinetic calibration. */
export function aluminumAqueousConstants(temperature_c: number) {
  const aqueous = aqueousConstantsAtTemperature(temperature_c);
  if (!aqueous) return null;
  const thermal = (kcal: number) => Math.exp(kcal * 4184 / 8.314462618
    * (1 / 298.15 - 1 / (temperature_c + 273.15)));
  const acidDissolution = 10 ** 10.8 * thermal(-26.5);
  return { ...aqueous, acidDissolution, ksp: acidDissolution * aqueous.waterKw ** 3,
    hydrolysis: [
      temperatureAdjustedConstant(1e-5, [-38.253, 0, -656.27, 14.327], temperature_c),
      temperatureAdjustedConstant(10 ** -10.1, [88.5, 0, -9391.6, -27.121], temperature_c),
      temperatureAdjustedConstant(10 ** -16.9, [226.374, 0, -18247.8, -73.597], temperature_c),
      temperatureAdjustedConstant(10 ** -22.7, [51.578, 0, -11168.9, -14.865], temperature_c),
    ],
    sulfateBeta1: 10 ** 3.5 * thermal(2.29), sulfateBeta2: 1e5 * thermal(3.11),
  };
}

/** dH of Al(OH)3(s)+OH-=Al(OH)4- from the same equilibrium curves.
 * The normalization at 25 C cancels when differentiating ln K. */
export function aluminumHydroxideBaseDissolutionEnthalpy_J_mol(temperature_c: number): number | null {
  const water = waterDissociationEnthalpy_J_mol(temperature_c);
  if (water === null) return null;
  const hydrolysis = 8.314462618 * (Math.LN10 * 11168.9 - 14.865 * (temperature_c + 273.15));
  return -26.5 * 4184 + hydrolysis - water;
}

export function aluminumHydroxidePrecipitationEnthalpy_J_mol(temperature_c: number): number | null {
  const water = waterDissociationEnthalpy_J_mol(temperature_c);
  return water === null ? null : -(-26.5 * 4184 + 3 * water);
}

export function aluminumAluminateFormationEnthalpy_J_mol(temperature_c: number): number | null {
  const precipitation = aluminumHydroxidePrecipitationEnthalpy_J_mol(temperature_c);
  const dissolution = aluminumHydroxideBaseDissolutionEnthalpy_J_mol(temperature_c);
  return precipitation === null || dissolution === null ? null : precipitation + dissolution;
}

function inventory(contents: readonly SubstanceContent[], volume_ml: number) {
  if (!(volume_ml > 0) || !Number.isFinite(volume_ml)) return null;
  let chlorideAl = 0, sulfateAl = 0, base = 0, chlorideSalt = 0, sulfateSalt = 0, aluminate = 0, solid = 0, water = false;
  for (const c of contents) {
    if (!Number.isFinite(c.moles) || c.moles < 0 || (c.location && c.location !== 'bulk')) return null;
    if (c.moles === 0) continue;
    const identity = identifySpecies(c.formula), phase = c.phase ?? identity.phase;
    if (identity.concentration === 'concentrated') return null;
    if (identity.formula === 'H2O' && phase === 'l') { water = true; continue; }
    if (identity.formula === 'Al(OH)3' && phase === 's') { solid += c.moles; continue; }
    if (phase !== 'aq') return null;
    if (identity.formula === 'AlCl3') chlorideAl += c.moles;
    else if (identity.formula === 'Al2(SO4)3') sulfateAl += 2 * c.moles;
    else if (identity.formula === 'NaOH') base += c.moles;
    else if (identity.formula === 'NaCl') chlorideSalt += c.moles;
    else if (identity.formula === 'Na2SO4') sulfateSalt += c.moles;
    else if (identity.formula === 'Na[Al(OH)4]') aluminate += c.moles;
    else return null;
  }
  return water ? { chlorideAl, sulfateAl, base, chlorideSalt, sulfateSalt, aluminate, solid, liters: volume_ml / 1000 } : null;
}

function speciate(totals: NonNullable<ReturnType<typeof inventory>>, temperature_c: number, precipitatedAl = 0) {
  const constants = aluminumAqueousConstants(temperature_c);
  if (!constants) return null;
  const alTotal = Math.max(0, totals.chlorideAl + totals.sulfateAl + totals.aluminate - precipitatedAl) / totals.liters;
  const sodium = (totals.base + totals.chlorideSalt + 2 * totals.sulfateSalt + totals.aluminate) / totals.liters;
  const chloride = (3 * totals.chlorideAl + totals.chlorideSalt) / totals.liters;
  const sulfateTotal = (1.5 * totals.sulfateAl + totals.sulfateSalt) / totals.liters;
  const at = (logH: number) => {
    const h = 10 ** logH, oh = constants.waterKw / h;
    const [r1, r2, r3, r4] = constants.hydrolysis.map((k, i) => k / h ** (i + 1));
    const hydrolysis = 1 + r1 + r2 + r3 + r4, bisulfateRatio = h / constants.bisulfateKa;
    const sulfateState = (s: number) => {
      const c1 = constants.sulfateBeta1 * s, c2 = constants.sulfateBeta2 * s * s;
      const freeAluminum_M = alTotal / (hydrolysis + c1 + c2);
      return { freeAluminum_M, c1, c2, boundSulfate_M: freeAluminum_M * (c1 + 2 * c2) };
    };
    let lowS = 0, highS = sulfateTotal;
    if (sulfateTotal > 0) for (let i = 0; i < 48; i++) {
      const mid = (lowS + highS) / 2;
      if (mid * (1 + bisulfateRatio) + sulfateState(mid).boundSulfate_M > sulfateTotal) highS = mid; else lowS = mid;
    }
    const freeSulfate_M = (lowS + highS) / 2;
    const { freeAluminum_M, c1, c2, boundSulfate_M } = sulfateState(freeSulfate_M);
    const bisulfate_M = freeSulfate_M * bisulfateRatio;
    return { ph: -logH, hydroxide_M: oh, freeAluminum_M, freeSulfate_M, bisulfate_M, boundSulfate_M,
      aluminate_M: freeAluminum_M * r4, neutralAluminumHydroxide_M: freeAluminum_M * r3,
      hydrolyzedAluminum_M: freeAluminum_M * (r1 + r2 + r3 + r4),
      sulfateComplexedAluminum_M: freeAluminum_M * (c1 + c2),
      chargeResidual_M: h + sodium + freeAluminum_M * (3 + 2 * r1 + r2 - r4 + c1 - c2)
        - oh - chloride - 2 * freeSulfate_M - bisulfate_M };
  };
  let low = -16, high = 0;
  if (at(low).chargeResidual_M > 0 || at(high).chargeResidual_M < 0) return null;
  for (let i = 0; i < 56; i++) {
    const mid = (low + high) / 2;
    if (at(mid).chargeResidual_M > 0) high = mid; else low = mid;
  }
  return at((low + high) / 2);
}

export function aluminumAqueousState(contents: readonly SubstanceContent[], volume_ml: number, temperature_c: number) {
  const totals = inventory(contents, volume_ml);
  return totals ? speciate(totals, temperature_c) : null;
}

/** All extent functions return mol of Al, including the sulfate route (2 Al
 * per formula unit). Each formula-unit reaction remains reagent-limited. */
export function aluminumHydroxidePrecipitationExtent(contents: readonly SubstanceContent[], volume_ml: number, temperature_c: number,
  route: 'chloride' | 'sulfate' = 'chloride'): number | null {
  const totals = inventory(contents, volume_ml), constants = aluminumAqueousConstants(temperature_c);
  if (!totals || !constants || !speciate(totals, temperature_c)) return null;
  const maximum = Math.min(route === 'chloride' ? totals.chlorideAl : totals.sulfateAl, totals.base / 3);
  const product = (x: number) => {
    const state = speciate(totals, temperature_c, x)!;
    return state.freeAluminum_M * state.hydroxide_M ** 3;
  };
  if (!(maximum > 0) || product(0) <= constants.ksp * (1 + 1e-10)) return 0;
  if (product(maximum) >= constants.ksp) return maximum;
  let low = 0, high = maximum;
  for (let i = 0; i < 60; i++) {
    const mid = (low + high) / 2;
    if (product(mid) > constants.ksp) low = mid; else high = mid;
  }
  return (low + high) / 2;
}

export function aluminumHydroxideDissolutionExtent(contents: readonly SubstanceContent[], volume_ml: number, temperature_c: number): number | null {
  const totals = inventory(contents, volume_ml), constants = aluminumAqueousConstants(temperature_c);
  if (!totals || !constants || !speciate(totals, temperature_c)) return null;
  const maximum = Math.min(totals.solid, totals.base);
  const product = (x: number) => {
    const state = speciate(totals, temperature_c, -x)!;
    return state.freeAluminum_M * state.hydroxide_M ** 3;
  };
  if (!(maximum > 0) || product(0) >= constants.ksp * (1 - 1e-10)) return 0;
  if (product(maximum) <= constants.ksp) return maximum;
  let low = 0, high = maximum;
  for (let i = 0; i < 60; i++) {
    const mid = (low + high) / 2;
    if (product(mid) < constants.ksp) low = mid; else high = mid;
  }
  return (low + high) / 2;
}

/** Formal salt conversion records the additional aluminate already predicted
 * by the aqueous equilibrium. It preserves analytical Al/Na/Cl/S totals. */
export function aluminateConversionExtent(contents: readonly SubstanceContent[], volume_ml: number, temperature_c: number,
  route: 'chloride' | 'sulfate' = 'chloride'): number | null {
  const totals = inventory(contents, volume_ml), constants = aluminumAqueousConstants(temperature_c);
  if (!totals || !constants) return null;
  const state = speciate(totals, temperature_c);
  if (!state) return null;
  if (state.freeAluminum_M * state.hydroxide_M ** 3 > constants.ksp * (1 + 1e-9)) return 0;
  return Math.max(0, Math.min(route === 'chloride' ? totals.chlorideAl : totals.sulfateAl, totals.base / 4,
    state.aluminate_M * totals.liters - totals.aluminate));
}

const ALUMINUM_ROUTES: Record<string, { kind: 'precipitation' | 'dissolution' | 'aluminate'; route: 'chloride' | 'sulfate'; factor: number }> = {
  alcl3_naoh: { kind: 'precipitation', route: 'chloride', factor: 1 },
  alcl3_naoh_precipitate: { kind: 'precipitation', route: 'chloride', factor: 1 },
  al2so43_naoh: { kind: 'precipitation', route: 'sulfate', factor: 2 },
  al2so4_naoh_amphoteric: { kind: 'precipitation', route: 'sulfate', factor: 2 },
  aloh3_naoh: { kind: 'dissolution', route: 'chloride', factor: 1 },
  aloh3_naoh_dissolution: { kind: 'dissolution', route: 'chloride', factor: 1 },
  alcl3_naoh_excess: { kind: 'aluminate', route: 'chloride', factor: 1 },
  alcl3_naoh_aluminate: { kind: 'aluminate', route: 'chloride', factor: 1 },
  al2so43_naoh_excess: { kind: 'aluminate', route: 'sulfate', factor: 2 },
  al2so43_naoh_aluminate: { kind: 'aluminate', route: 'sulfate', factor: 2 },
};

/** undefined: unrelated reaction; null: recognized but unsupported inventory. */
export function isAluminumReaction(id: string): boolean { return Object.hasOwn(ALUMINUM_ROUTES, id); }

export function aluminumReactionExtent(id: string, contents: readonly SubstanceContent[], volume_ml: number, temperature_c: number): number | null | undefined {
  if (!isAluminumReaction(id)) return undefined;
  const mode = ALUMINUM_ROUTES[id];
  if (!mode) return undefined;
  const extent = mode.kind === 'precipitation' ? aluminumHydroxidePrecipitationExtent(contents, volume_ml, temperature_c, mode.route)
    : mode.kind === 'dissolution' ? aluminumHydroxideDissolutionExtent(contents, volume_ml, temperature_c)
    : aluminateConversionExtent(contents, volume_ml, temperature_c, mode.route);
  return extent === null ? null : extent / mode.factor;
}

export function aluminumReactionEnthalpy_J_mol(id: string, temperature_c: number): number | null | undefined {
  if (!isAluminumReaction(id)) return undefined;
  const mode = ALUMINUM_ROUTES[id];
  if (!mode) return undefined;
  const heat = mode.kind === 'precipitation' ? aluminumHydroxidePrecipitationEnthalpy_J_mol(temperature_c)
    : mode.kind === 'dissolution' ? aluminumHydroxideBaseDissolutionEnthalpy_J_mol(temperature_c)
    : aluminumAluminateFormationEnthalpy_J_mol(temperature_c);
  return heat === null ? null : heat * mode.factor;
}
