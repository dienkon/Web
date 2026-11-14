import type { SubstanceContent } from '../types/chemistry';
import { identifySpecies } from './speciesIdentity';
import { reagentPhase } from './reagentAvailability';
import { readComposition } from './balance';

export const LANDOLT_SOURCE = 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9743209/';
export const LANDOLT_EQUATION = 'IO3-(aq) + 3HSO3-(aq) -> I-(aq) + 3SO4(2-)(aq) + 3H+(aq); '
  + 'IO3-(aq) + 5I-(aq) + 6H+(aq) -> 3I2(aq) + 3H2O(l); '
  + 'I2(aq) + HSO3-(aq) + H2O(l) -> 2I-(aq) + SO4(2-)(aq) + 3H+(aq)';
export const LANDOLT_STEPS = [
  { id: 'R1', reactants: [{ formula: 'IO3(-)', coefficient: 1 }, { formula: 'HSO3(-)', coefficient: 3 }],
    products: [{ formula: 'I(-)', coefficient: 1 }, { formula: 'SO4(2-)', coefficient: 3 }, { formula: 'H(+)', coefficient: 3 }] },
  { id: 'R2', reactants: [{ formula: 'IO3(-)', coefficient: 1 }, { formula: 'I(-)', coefficient: 5 }, { formula: 'H(+)', coefficient: 6 }],
    products: [{ formula: 'I2', coefficient: 3 }, { formula: 'H2O', coefficient: 3 }] },
  { id: 'R3', reactants: [{ formula: 'I2', coefficient: 1 }, { formula: 'HSO3(-)', coefficient: 1 }, { formula: 'H2O', coefficient: 1 }],
    products: [{ formula: 'I(-)', coefficient: 2 }, { formula: 'SO4(2-)', coefficient: 1 }, { formula: 'H(+)', coefficient: 3 }] },
];
/** Liu & Taylor, J. Phys. Chem. B 126 (2022), model equations 1–8.
 * Concentration-based, homogeneous, reference-temperature (25 C) model.
 * Oxygen transfer, spatial fronts, starch binding and calorimetry are NOT fit.
 * Fast proton transfers and I2 + I- association are at local equilibrium. */
export const LANDOLT_CONSTANTS = Object.freeze({
  k1a: 0.08, k1b: 4e3, k1c: 3e5, k2a: 2.2e9, k2b: 25, k3: 2e9,
  sulfiteKa1: 2.6e6 / 2e8, sulfiteKa2: 5e3 / 5e10,
  bisulfateKa: 1.3e8 / 1e10, kw: 1e-3 / 1e11, triiodideBeta: 5.6e9 / 8.5e6,
});

export interface LandoltInventory {
  iodate: number; iodide: number; iodine: number; sulfite: number; sulfate: number;
  sodium: number; potassium: number; oxygen: number; liters: number;
  retained: SubstanceContent[];
}

// Analytical salt pools and their dissociated forms can both be received.
type ComponentKey = 'iodate' | 'iodide' | 'iodine' | 'sulfite' | 'sulfate' | 'sodium' | 'potassium';
const COMPONENTS: Record<string, Partial<Record<ComponentKey, number>>> = {
  KIO3: { iodate: 1, potassium: 1 }, NaIO3: { iodate: 1, sodium: 1 },
  KI: { iodide: 1, potassium: 1 }, NaI: { iodide: 1, sodium: 1 },
  NaHSO3: { sulfite: 1, sodium: 1 }, Na2SO3: { sulfite: 1, sodium: 2 }, H2SO3: { sulfite: 1 },
  H2SO4: { sulfate: 1 }, Na2SO4: { sulfate: 1, sodium: 2 }, K2SO4: { sulfate: 1, potassium: 2 },
  NaHSO4: { sulfate: 1, sodium: 1 }, KHSO4: { sulfate: 1, potassium: 1 },
  'Na(+)': { sodium: 1 }, 'K(+)': { potassium: 1 }, 'IO3(-)': { iodate: 1 },
  'I(-)': { iodide: 1 }, I2: { iodine: 1 }, 'I3(-)': { iodide: 1, iodine: 1 },
  'HSO3(-)': { sulfite: 1 }, 'SO3(2-)': { sulfite: 1 },
  'HSO4(-)': { sulfate: 1 }, 'SO4(2-)': { sulfate: 1 }, 'H(+)': {}, 'OH(-)': {},
};

export function isLandoltCandidate(contents: readonly SubstanceContent[]): boolean {
  const pools = contents.filter(c => (!c.location || c.location === 'bulk') && c.moles > 0)
    .map(c => COMPONENTS[identifySpecies(c.formula).formula]);
  return pools.some(c => c?.iodate) && pools.some(c => c?.sulfite || c?.iodide);
}

export function landoltInventory(contents: readonly SubstanceContent[], volume_ml: number): LandoltInventory | null {
  if (!Number.isFinite(volume_ml) || volume_ml <= 0) return null;
  const result: LandoltInventory = { iodate: 0, iodide: 0, iodine: 0, sulfite: 0, sulfate: 0,
    sodium: 0, potassium: 0, oxygen: 0, liters: volume_ml / 1000, retained: [] };
  let water = 0;
  for (const item of contents) {
    if (item.location && item.location !== 'bulk') { result.retained.push({ ...item }); continue; }
    if (!Number.isFinite(item.moles) || item.moles < 0 || !Number.isFinite(item.mass_g) || item.mass_g < 0) return null;
    if (item.moles === 0) continue;
    const id = identifySpecies(item.formula), phase = reagentPhase(item);
    if (/^(starch|tinh bột)$/i.test(item.formula)) { result.retained.push({ ...item }); continue; }
    if (id.formula === 'H2O' && phase === 'l') water += item.moles;
    else {
      const components = COMPONENTS[id.formula];
      if (!components || phase !== 'aq' || id.concentration === 'concentrated') return null;
      for (const key of Object.keys(components) as ComponentKey[]) result[key] += components[key]! * item.moles;
    }
    result.oxygen += (readComposition(item.formula).atoms.O ?? 0) * item.moles;
  }
  if (!(water > 0) || !(result.iodate + result.iodide + 2 * result.iodine > 1e-12)) return null;
  return result;
}

export function landoltSpeciation(t: LandoltInventory) {
  const k = LANDOLT_CONSTANTS, L = t.liters;
  const at = (logH: number) => {
    const h = 10 ** logH, oh = k.kw / h;
    const d = h * h + k.sulfiteKa1 * h + k.sulfiteKa1 * k.sulfiteKa2;
    const h2so3 = t.sulfite / L * h * h / d;
    const hso3 = t.sulfite / L * k.sulfiteKa1 * h / d;
    const so3 = t.sulfite / L * k.sulfiteKa1 * k.sulfiteKa2 / d;
    const so4 = t.sulfate / L * k.bisulfateKa / (h + k.bisulfateKa);
    const hso4 = t.sulfate / L - so4;
    const charge = h + (t.sodium + t.potassium - t.iodate - t.iodide) / L
      - oh - hso3 - 2 * so3 - hso4 - 2 * so4;
    return { h, oh, h2so3, hso3, so3, so4, hso4, charge };
  };
  let lo = -16, hi = 2;
  for (let i = 0; i < 54; i++) {
    const mid = (lo + hi) / 2;
    if (at(mid).charge > 0) hi = mid; else lo = mid;
  }
  const acid = at((lo + hi) / 2), a = t.iodide / L, b = t.iodine / L, beta = k.triiodideBeta;
  const B = 1 + beta * (a + b);
  const i3 = a && b ? 2 * beta * a * b / (B + Math.sqrt(Math.max(0, B * B - 4 * beta * beta * a * b))) : 0;
  return { ...acid, ph: -Math.log10(acid.h), iodide: Math.max(0, a - i3), iodine: Math.max(0, b - i3), triiodide: i3 };
}

export function landoltRates(t: LandoltInventory) {
  const s = landoltSpeciation(t), a = t.iodate / t.liters, k = LANDOLT_CONSTANTS;
  return { initiation_M_s: (k.k1a + k.k1b * s.h + k.k1c * s.h ** 2) * a * s.hso3,
    dushman_M_s: (k.k2a * s.iodide * s.h + k.k2b) * a * s.iodide * s.h,
    scavenging_M_s: k.k3 * s.iodine * s.hso3 };
}

/** Electron-transfer capacity measured in moles of consumed iodate. */
export const landoltCapacity = (t: LandoltInventory) => Math.max(0, Math.min(t.iodate, (2 * t.sulfite + t.iodide) / 5));

function quench(t: LandoltInventory, dt: number): LandoltInventory {
  if (!(t.iodine > 0 && t.sulfite > 0)) return t;
  const s = landoltSpeciation(t), a = Math.min(t.iodine, t.sulfite) / t.liters;
  const b = Math.max(t.iodine, t.sulfite) / t.liters;
  const rate = LANDOLT_CONSTANTS.k3 * (s.iodine / (t.iodine / t.liters)) * (s.hso3 / (t.sulfite / t.liters));
  const d = b - a, decay = Math.exp(-rate * d * dt);
  const left = d < 1e-10 * b ? a / (1 + rate * a * dt) : a * d * decay / (d + a * -Math.expm1(-rate * d * dt));
  const x = Math.min(t.iodine, t.sulfite, Math.max(0, (a - left) * t.liters));
  return { ...t, iodine: t.iodine - x, sulfite: t.sulfite - x, sulfate: t.sulfate + x, iodide: t.iodide + 2 * x };
}

function trial(t: LandoltInventory, dt: number): LandoltInventory {
  const a = quench(t, dt / 2), rates = landoltRates(a);
  const x = Math.min(a.iodate, a.sulfite / 3, rates.initiation_M_s * a.liters * dt);
  const y = Math.min(a.iodate - x, (a.iodide + x) / 5, rates.dushman_M_s * a.liters * dt);
  return quench({ ...a, iodate: a.iodate - x - y, sulfite: a.sulfite - 3 * x,
    sulfate: a.sulfate + 3 * x, iodide: a.iodide + x - 5 * y, iodine: a.iodine + 3 * y }, dt / 2);
}

/** Positive split integration with step-doubling error control. Fast I2/S(IV)
 * loss is integrated analytically rather than by an unstable explicit k3 step.
 * Rejected proposals do not change matter or accepted time. */
export function evolveLandolt(t: LandoltInventory, dt: number): LandoltInventory {
  if (!Number.isFinite(dt) || dt <= 0) return t;
  let state = t, remaining = dt, step = Math.min(dt, 0.05), count = 0;
  const scale = t.iodate + t.iodide + 2 * t.iodine + t.sulfite + t.sulfate;
  while (remaining > 1e-12) {
    if (++count > 30000) throw new Error('Landolt integration exceeded its supported step budget.');
    step = Math.min(step, remaining);
    const full = trial(state, step), half = trial(trial(state, step / 2), step / 2);
    const error = Math.max(...(['iodate', 'iodide', 'iodine', 'sulfite'] as const)
      .map(key => Math.abs(full[key] - half[key]) / Math.max(1e-14, scale * 1e-7, Math.abs(half[key]) * 2e-4)));
    if (error > 1 && step > 1e-9) { step *= Math.max(0.1, 0.8 / Math.sqrt(error)); continue; }
    state = half; remaining -= step;
    step *= Math.min(2, error > 1e-10 ? 0.8 / Math.sqrt(error) : 2);
  }
  return state;
}

/** Stoichiometric terminal reference for planning, not an animation/time law. */
export function landoltEndpoint(t: LandoltInventory): LandoltInventory {
  const q = Math.min(t.iodine, t.sulfite);
  const s = { ...t, iodine: t.iodine - q, sulfite: t.sulfite - q,
    sulfate: t.sulfate + q, iodide: t.iodide + 2 * q };
  const x = Math.min(s.iodate, s.sulfite / 3);
  const y = Math.min(s.iodate - x, (s.iodide + x) / 5);
  return { ...s, iodate: s.iodate - x - y, sulfite: s.sulfite - 3 * x, sulfate: s.sulfate + 3 * x,
    iodide: s.iodide + x - 5 * y, iodine: s.iodine + 3 * y };
}

/** Dissociated material quantities; starch remains a spectator. The solvent
 * amount follows O balance, including water formed by Dushman/proton transfer. */
export function landoltContents(t: LandoltInventory) {
  const s = landoltSpeciation(t), L = t.liters;
  const amounts: [string, number][] = [['K(+)', t.potassium], ['Na(+)', t.sodium], ['IO3(-)', t.iodate],
    ['I(-)', s.iodide * L], ['I2', s.iodine * L], ['I3(-)', s.triiodide * L],
    ['H2SO3', s.h2so3 * L], ['HSO3(-)', s.hso3 * L], ['SO3(2-)', s.so3 * L],
    ['HSO4(-)', s.hso4 * L], ['SO4(2-)', s.so4 * L], ['H(+)', s.h * L], ['OH(-)', s.oh * L]];
  const oxygen = amounts.reduce((sum, [formula, n]) => sum + (readComposition(formula).atoms.O ?? 0) * n, 0);
  const water = t.oxygen - oxygen;
  if (!(water > 0)) return null;
  return { amounts, water, state: s };
}
