/**
 * Continuous Simulation Tick Engine for ChemDex 2D
 *
 * Unlike the discrete event-driven model, this engine advances the laboratory
 * forward in fixed time increments (dt_seconds). Every open vessel:
 *   - cools toward ambient temperature (Newton's law of cooling)
 *   - boils off water when heated past the boiling point
 *   - dissolves solutes and homogenizes over time (stirring accelerates it)
 *   - accepts energy from burners and hot plates based on geometry
 *   - drains continuously during an active pour with realistic flow rate
 *
 * Pure TypeScript, no DOM/React dependencies — fully unit-testable.
 */

import { EquipmentState, ActivePour, SpillPuddle } from '../types/equipment';
import { SubstanceQuantity } from '../types/chemistry';
import { normalizeFormula, computeMolarMass } from '../chemistry/core/formula';
import { runSimulationCycle } from '../chemistry/reactions/engine';

// ─── Physical Constants ────────────────────────────────────────────
export const WATER_CP_J_G_K = 4.184;
export const WATER_LATENT_HEAT_J_G = 2256; // J/g at 100 °C
export const GLASS_HEAT_CAPACITY_J_K = 33.2;
export const AMBIENT_TEMP_C = 25;

// Bunsen burner: ~600–900 W total flame output; ~35 % couples into a vessel held overhead
export const BURNER_PEAK_POWER_W = 350;
export const BURNER_HEAT_RADIUS_PX = 110; // px distance within which heat couples
export const BURNER_FUEL_CAPACITY_ML = 120;
export const BURNER_FUEL_RATE_ML_S = 0.012; // conservative wick consumption

// Hot plate: resistive plate ~400 J/K, 600 W element
export const PLATE_HEAT_CAPACITY_J_K = 400;
export const PLATE_POWER_W = 600;
export const PLATE_CONTACT_W_K = 4; // conduction coefficient plate → vessel base
export const HOT_PLATE_RECEIVERS: ReadonlyArray<string> = [
  'beaker', 'erlenmeyer_flask', 'evaporating_dish', 'watch_glass',
];

// Realistic manual pour ≈ 10–15 mL/s for a beaker tilted ~60°
export const DEFAULT_POUR_RATE_ML_S = 12;
export const BURETTE_DROP_RATE_ML_S = 0.4; // ~8 drops/s ≈ 0.4 mL/s
export const DROPPER_DROP_ML = 0.05;

/** Boiling-point elevation via van't Hoff factor-weighted molality. */
export function aqueousBoilingPoint(contents: SubstanceQuantity[], volume_ml: number): number {
  const waterMass = contents
    .filter(c => normalizeFormula(c.formula) === 'H2O' && c.state !== 'g')
    .reduce((s, c) => s + Math.max(0, c.mass_g), 0);
  const solventKg = Math.max(0.001, (waterMass || volume_ml * 0.95) / 1000);
  let osmoles = 0;
  const factors: Record<string, number> = {
    'NACL': 1.8, 'KI': 1.8, 'NAOH': 1.8, 'HCL': 1.8,
    'BACL2': 2.5, 'NA2SO4': 2.5, 'CACL2': 2.5, 'H2SO4': 2.5, 'PB(NO3)2': 2.5,
    'FECL3': 3.2, 'AL2(SO4)3': 3.2,
  };
  for (const item of contents) {
    if (item.state === 's' || item.state === 'g' || normalizeFormula(item.formula) === 'H2O') continue;
    osmoles += Math.max(0, item.moles) * (factors[item.formula.toUpperCase()] ?? 1);
  }
  return 100 + Math.min(18, 0.512 * osmoles / solventKg);
}

export interface ThermalTickResult {
  temperature_c: number;
  volume_ml: number;
  mass_g: number;
  contents: SubstanceQuantity[];
  isBoiling: boolean;
  boilingIntensity: number;
  evaporatedStep_g: number;
}

/**
 * Advance one vessel's thermal state by dt seconds given absorbed heating power.
 * Implements Newton cooling to ambient plus latent-heat boiling at the elevated
 * boiling point of the aqueous mixture.
 */
export function stepVesselThermal(
  eq: EquipmentState,
  dt: number,
  absorbedPower_W = 0,
  ambient_c = AMBIENT_TEMP_C,
): ThermalTickResult {
  const base: ThermalTickResult = {
    temperature_c: eq.temperature_c,
    volume_ml: eq.volume_ml,
    mass_g: eq.mass_g,
    contents: eq.contents,
    isBoiling: false,
    boilingIntensity: 0,
    evaporatedStep_g: 0,
  };
  if (dt <= 0 || !eq.isContainer) return base;

  const waterMass = eq.contents
    .filter(c => normalizeFormula(c.formula) === 'H2O' && c.state !== 'g')
    .reduce((s, c) => s + Math.max(0, c.mass_g), 0);
  const liquidMass = eq.volume_ml > 0.05 ? Math.max(0, eq.mass_g - (eq.tare_g ?? 0)) : 0;
  const heatCap = GLASS_HEAT_CAPACITY_J_K + liquidMass * WATER_CP_J_G_K;
  const coolingCoef = eq.volume_ml > 1 ? 0.35 : 0.18;
  const steady = ambient_c + Math.max(0, absorbedPower_W) / coolingCoef;
  const unconstrained = steady + (eq.temperature_c - steady) * Math.exp((-coolingCoef * dt) / heatCap);
  const netEnergy = (unconstrained - eq.temperature_c) * heatCap;

  const boilingPoint = aqueousBoilingPoint(eq.contents, eq.volume_ml);
  let temperature = unconstrained;
  let vaporized = 0;
  if (!eq.isSealed && waterMass > 0 && unconstrained > boilingPoint) {
    const sensibleToBoil = Math.max(0, boilingPoint - eq.temperature_c) * heatCap;
    const latentAvailable = Math.max(0, netEnergy - sensibleToBoil);
    vaporized = Math.min(waterMass, eq.volume_ml, latentAvailable / WATER_LATENT_HEAT_J_G);
    temperature = boilingPoint;
  }
  const isBoiling = !eq.isSealed && vaporized > 1e-9;
  const boilingIntensity = isBoiling ? Math.min(1, (vaporized / dt) / 0.15) : 0;

  let contents = eq.contents;
  if (vaporized > 0) {
    const keep = Math.max(0, 1 - vaporized / waterMass);
    const newVolume = Math.max(0, eq.volume_ml - vaporized);
    contents = eq.contents.map(item => {
      if (normalizeFormula(item.formula) === 'H2O' && item.state !== 'g') {
        return { ...item, mass_g: item.mass_g * keep, moles: item.moles * keep };
      }
      if (item.state === 'aq' && newVolume > 0) {
        return { ...item, concentration_M: item.moles / (newVolume / 1000) };
      }
      return { ...item };
    });
  }
  return {
    temperature_c: temperature,
    volume_ml: Math.max(0, eq.volume_ml - vaporized),
    mass_g: Math.max(0, eq.mass_g - vaporized),
    contents,
    isBoiling,
    boilingIntensity,
    evaporatedStep_g: vaporized,
  };
}

/** Compute the heating power delivered to `eq` by a Bunsen burner `burner`.
 * Coupling is based on the 2D scene geometry (y grows downward): the vessel's
 * bottom must hover just above the burner's barrel top, roughly centered. */
export function burnerHeatToVessel(burner: EquipmentState, eq: EquipmentState): number {
  if (burner.type !== 'bunsen_burner' || !burner.isOn) return 0;
  if ((burner.fuelLevel_ml ?? BURNER_FUEL_CAPACITY_ML) <= 0) return 0;
  const burnerTop = burner.y + 40; // barrel mouth in SVG coords
  const vesselBottom = eq.y + eq.height;
  const gap = burnerTop - vesselBottom; // >0 means vessel hovers above flame
  if (gap < -30 || gap > 160) return 0; // too low (overlapping) or too high
  const dx = eq.x + eq.width / 2 - (burner.x + burner.width / 2);
  const dist = Math.hypot(dx, Math.max(0, gap - 40));
  if (dist > BURNER_HEAT_RADIUS_PX) return 0;
  const falloff = Math.max(0, 1 - dist / BURNER_HEAT_RADIUS_PX);
  const intensity = Math.max(0.2, Math.min(1, burner.heatIntensity ?? 0.7));
  return BURNER_PEAK_POWER_W * intensity * falloff;
}

/** Hot plate conductive coupling: plate must physically touch the vessel. */
export function hotPlateHeatToVessel(plate: EquipmentState, eq: EquipmentState): number {
  if (plate.type !== 'hot_plate' || !plate.isOn) return 0;
  if (!HOT_PLATE_RECEIVERS.includes(eq.type)) return 0;
  const dx = Math.abs(eq.x + eq.width / 2 - (plate.x + plate.width / 2));
  const dy = Math.abs(eq.y + eq.height - plate.y);
  if (dx > plate.width * 0.55 || dy > 24) return 0;
  const diff = (plate.setPoint_c ?? 100) - eq.temperature_c;
  if (diff <= 0) return 0;
  return PLATE_CONTACT_W_K * diff; // watts proportional to ΔT
}

/** Compute mixing / dissolution progress for a vessel. */
export function stepMixing(eq: EquipmentState, dt: number): Partial<EquipmentState> {
  const speed = eq.stirringSpeed ?? 0;
  const rate = 0.08 + speed * 0.9; // s^-1 — stirring dramatically accelerates
  const nextMixed = Math.min(1, (eq.mixedness ?? 1) + rate * dt * (1 - (eq.mixedness ?? 1)));
  const solidPresent = eq.contents.some(c => c.state === 's' && c.moles > 1e-4);
  const dissolvingRate = solidPresent ? Math.min(1, rate * 0.5) : 0;
  return {
    mixedness: nextMixed,
    dissolvingRate,
  };
}

/**
 * Advance a continuous pour by dt seconds. Returns the actual volume moved,
 * the spill fraction (when target is misaligned), and whether the pour is done.
 */
export function stepPour(
  source: EquipmentState,
  target: EquipmentState,
  dt: number,
  rate_ml_s = DEFAULT_POUR_RATE_ML_S,
): { moved_ml: number; spill_ml: number; done: boolean } {
  if (source.volume_ml <= 0) return { moved_ml: 0, spill_ml: 0, done: true };
  // Spill when horizontally misaligned beyond target mouth width
  const srcMouth = source.x + source.width * 0.8; // pours from spout edge
  const tgtMouthLeft = target.x + target.width * 0.15;
  const tgtMouthRight = target.x + target.width * 0.85;
  const spillFrac = srcMouth < tgtMouthLeft || srcMouth > tgtMouthRight ? 0.15 : 0;
  const capSpace = Math.max(0, target.capacity_ml - target.volume_ml);
  const requested = Math.min(source.volume_ml, rate_ml_s * dt);
  const accepted = Math.min(requested, capSpace);
  const overflow = requested - accepted;
  const spill = overflow + spillFrac * accepted;
  const moved = accepted * (1 - spillFrac);
  return { moved_ml: moved, spill_ml: spill, done: source.volume_ml - requested <= 1e-6 };
}
