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
import { calculateMixturePhysicalProperties, solubilityAtTemperature_g_100ml } from '../chemistry/physical/substanceProps';
import {
  DEFAULT_LAB_ENVIRONMENT,
  LabEnvironment,
  convectiveCoolingCoefW_K,
  isOxygenSupportingAtmosphere,
  waterBoilingPointAtPressure,
  waterMassFluxG_M2_S,
} from '../chemistry/physical/environmentPhysics';

// ─── Physical Constants ────────────────────────────────────────────
export const WATER_CP_J_G_K = 4.184;
export const WATER_LATENT_HEAT_J_G = 2256; // J/g at 100 °C
export const ICE_LATENT_HEAT_J_G = 334; // J/g at 0 °C (H2O(s) <-> H2O(l))
export const GLASS_HEAT_CAPACITY_J_K = 33.2;
export const AMBIENT_TEMP_C = 25;

// Bunsen burner: ~600–900 W total flame output; ~35 % couples into a vessel held overhead
export const BURNER_PEAK_POWER_W = 350;
export const BURNER_HEAT_RADIUS_PX = 36; // max lateral px offset for flame plume coupling
export const BURNER_MIN_GAP_PX = -12;
export const BURNER_MAX_GAP_PX = 105;
export const BURNER_OPTIMAL_GAP_PX = 36;
export const BURNER_MIN_EFFECTIVE_W = 25;
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

/** Boiling-point combining IAPWS saturation T_sat(P) with van't Hoff colligative elevation. */
export function aqueousBoilingPoint(
  contents: SubstanceQuantity[],
  volume_ml: number,
  pressure_atm = 1.0
): number {
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
  const pureWaterBp = pressure_atm === 1.0 ? 100.0 : waterBoilingPointAtPressure(pressure_atm);
  return pureWaterBp + Math.min(18, 0.512 * osmoles / solventKg);
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
 * Couples pressure-dependent IAPWS boiling point, mixture heat capacity Cp,
 * fume-hood airspeed convective cooling, and RH-driven surface evaporation.
 */
export function stepVesselThermal(
  eq: EquipmentState,
  dt: number,
  absorbedPower_W = 0,
  ambient_c?: number,
  env: LabEnvironment = DEFAULT_LAB_ENVIRONMENT
): ThermalTickResult {
  const effectiveAmbient = ambient_c ?? env.temperature_c ?? AMBIENT_TEMP_C;
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

  const iceMass = eq.contents
    .filter(c => normalizeFormula(c.formula) === 'H2O' && c.state === 's')
    .reduce((s, c) => s + Math.max(0, c.mass_g), 0);
  const liquidWaterMass = eq.contents
    .filter(c => normalizeFormula(c.formula) === 'H2O' && (c.state === 'l' || c.state === 'aq'))
    .reduce((s, c) => s + Math.max(0, c.mass_g), 0);
  const waterMass = liquidWaterMass;
  const liquidMass = eq.volume_ml > 0.05 ? Math.max(0, eq.mass_g - (eq.tare_g ?? 0)) : 0;
  const phys = calculateMixturePhysicalProperties(eq.contents, eq.volume_ml, eq.temperature_c);
  const cp_J_gK = phys.cp_J_kgK / 1000;
  const heatCap = GLASS_HEAT_CAPACITY_J_K + (liquidMass > 0 ? liquidMass * cp_J_gK : iceMass * 2.09);
  const coolingCoef = convectiveCoolingCoefW_K(Math.max(eq.volume_ml, iceMass), env.airSpeed_m_s);
  const steady = effectiveAmbient + Math.max(0, absorbedPower_W) / coolingCoef;
  const unconstrained = steady + (eq.temperature_c - steady) * Math.exp((-coolingCoef * dt) / heatCap);
  const netEnergy = (unconstrained - eq.temperature_c) * heatCap;

  const boilingPoint = aqueousBoilingPoint(eq.contents, eq.volume_ml, env.pressure_atm);
  let temperature = unconstrained;
  let vaporized = 0;
  let meltedIce = 0;
  let frozeWater = 0;

  if (iceMass > 1e-5 && unconstrained > 0) {
    const sensibleToZero = Math.max(0, 0 - eq.temperature_c) * heatCap;
    const meltEnergy = Math.max(0, netEnergy - sensibleToZero);
    meltedIce = Math.min(iceMass, meltEnergy / ICE_LATENT_HEAT_J_G);
    if (iceMass - meltedIce > 1e-5) {
      temperature = 0;
    } else {
      const excessEnergy = Math.max(0, meltEnergy - meltedIce * ICE_LATENT_HEAT_J_G);
      temperature = excessEnergy / heatCap;
    }
  } else if (liquidWaterMass > 1e-5 && unconstrained < 0) {
    const sensibleToZero = Math.max(0, eq.temperature_c - 0) * heatCap;
    const freezeEnergy = Math.max(0, -netEnergy - sensibleToZero);
    frozeWater = Math.min(liquidWaterMass, freezeEnergy / ICE_LATENT_HEAT_J_G);
    if (liquidWaterMass - frozeWater > 1e-5) {
      temperature = 0;
    } else {
      const excessCooling = Math.max(0, freezeEnergy - frozeWater * ICE_LATENT_HEAT_J_G);
      temperature = -excessCooling / heatCap;
    }
  }

  const availLiquidWater = Math.max(0, waterMass + meltedIce - frozeWater);
  const postPhaseTemp = temperature;
  if (!eq.isSealed && availLiquidWater > 0 && postPhaseTemp > boilingPoint) {
    const sensibleBase = meltedIce > 0 ? 0 : eq.temperature_c;
    const sensibleToBoil = Math.max(0, boilingPoint - sensibleBase) * heatCap;
    const availableHeat = meltedIce > 0
      ? Math.max(0, netEnergy - Math.max(0, 0 - eq.temperature_c) * heatCap - meltedIce * ICE_LATENT_HEAT_J_G)
      : netEnergy;
    const latentAvailable = Math.max(0, availableHeat - sensibleToBoil);
    vaporized = Math.min(availLiquidWater, Math.max(0, eq.volume_ml + meltedIce - frozeWater), latentAvailable / WATER_LATENT_HEAT_J_G);
    temperature = boilingPoint;
  } else if (!eq.isSealed && availLiquidWater > 0 && postPhaseTemp > effectiveAmbient + 12) {
    // Sub-boiling convective surface evaporation (m^2 mouth area ~0.0028 m2 for beaker, narrower for tubes)
    const mouthAreaM2 = eq.type === 'evaporating_dish' ? 0.0045 : eq.type === 'test_tube' ? 0.00035 : 0.0024;
    const flux_g_m2_s = waterMassFluxG_M2_S(postPhaseTemp, effectiveAmbient, env.relativeHumidity, env.airSpeed_m_s);
    const subBoilEvap = Math.min(availLiquidWater * 0.25, flux_g_m2_s * mouthAreaM2 * dt);
    if (subBoilEvap > 1e-6) {
      vaporized += subBoilEvap;
    }
  }
  const isBoiling = !eq.isSealed && postPhaseTemp > boilingPoint && vaporized > 1e-9;
  const boilingIntensity = isBoiling ? Math.min(1, (vaporized / dt) / 0.15) : 0;

  const newVolume = Math.max(0, eq.volume_ml + meltedIce - frozeWater - vaporized);
  let contents = eq.contents;
  if (meltedIce > 1e-7 || frozeWater > 1e-7 || vaporized > 0) {
    const mapped: SubstanceQuantity[] = [];
    let liquidAdded = false;
    let iceAdded = false;
    const netLiquidWater = Math.max(0, liquidWaterMass + meltedIce - frozeWater - vaporized);
    const netIce = Math.max(0, iceMass - meltedIce + frozeWater);

    for (const item of eq.contents) {
      if (normalizeFormula(item.formula) === 'H2O' && item.state !== 'g') {
        if (item.state === 's') {
          if (!iceAdded && netIce > 1e-5) {
            mapped.push({ ...item, mass_g: netIce, moles: netIce / 18.015 });
            iceAdded = true;
          }
        } else {
          if (!liquidAdded && netLiquidWater > 1e-5) {
            mapped.push({ ...item, mass_g: netLiquidWater, moles: netLiquidWater / 18.015, state: 'l' });
            liquidAdded = true;
          }
        }
      } else if (item.state === 'aq') {
        if (newVolume <= 0.05) {
          mapped.push({ ...item, state: 's' as const, concentration_M: undefined });
        } else {
          mapped.push({ ...item, concentration_M: item.moles / (newVolume / 1000) });
        }
      } else {
        mapped.push({ ...item });
      }
    }
    if (!liquidAdded && netLiquidWater > 1e-5) {
      mapped.push({ formula: 'H2O', moles: netLiquidWater / 18.015, mass_g: netLiquidWater, state: 'l' });
    }
    if (!iceAdded && netIce > 1e-5) {
      mapped.push({ formula: 'H2O', moles: netIce / 18.015, mass_g: netIce, state: 's' });
    }
    contents = mapped;
  }
  return {
    temperature_c: temperature,
    volume_ml: newVolume,
    mass_g: Math.max(0, eq.mass_g - vaporized),
    contents,
    isBoiling,
    boilingIntensity,
    evaporatedStep_g: vaporized,
  };
}

/** Effective lateral half-width (px) of the upright flame-plume overlap zone for a vessel */
export function getBurnerMaxDx(eq: EquipmentState): number {
  return Math.min(BURNER_HEAT_RADIUS_PX, Math.max(18, eq.width * 0.28));
}

/** True only when the burner flame column actually reaches the bottom of the vessel */
export function isVesselAlignedOverBurner(
  burner: EquipmentState,
  eq: EquipmentState,
  env: LabEnvironment = DEFAULT_LAB_ENVIRONMENT
): boolean {
  return burnerHeatToVessel(burner, eq, env) >= BURNER_MIN_EFFECTIVE_W;
}

/** Compute the heating power delivered to `eq` by a Bunsen burner `burner` using narrow upright flame plume.
 * Combustion extinguishes in inert atmospheres (oxygenFraction < 0.12). */
export function burnerHeatToVessel(
  burner: EquipmentState,
  eq: EquipmentState,
  env: LabEnvironment = DEFAULT_LAB_ENVIRONMENT
): number {
  if (burner.type !== 'bunsen_burner' || !burner.isOn) return 0;
  if (!isOxygenSupportingAtmosphere(env)) return 0;
  if ((burner.fuelLevel_ml ?? BURNER_FUEL_CAPACITY_ML) <= 0) return 0;
  const burnerTop = burner.y + 42; // barrel mouth in SVG coords
  const vesselBottom = eq.y + eq.height;
  const gap = burnerTop - vesselBottom; // >0 means vessel hovers above flame nozzle
  if (gap < BURNER_MIN_GAP_PX || gap > BURNER_MAX_GAP_PX) return 0;

  const dx = Math.abs((eq.x + eq.width / 2) - (burner.x + burner.width / 2));
  const maxDx = getBurnerMaxDx(eq);
  if (dx > maxDx) return 0; // flame column completely misses the vessel bottom

  const normDx = dx / maxDx;
  const normDy =
    gap < BURNER_OPTIMAL_GAP_PX
      ? (BURNER_OPTIMAL_GAP_PX - gap) / (BURNER_OPTIMAL_GAP_PX - BURNER_MIN_GAP_PX)
      : (gap - BURNER_OPTIMAL_GAP_PX) / (BURNER_MAX_GAP_PX - BURNER_OPTIMAL_GAP_PX);

  const radial = Math.hypot(normDx, Math.max(0, normDy - 0.12));
  if (radial >= 1) return 0;
  const falloff = 1 - radial;
  const intensity = Math.max(0.2, Math.min(1, burner.heatIntensity ?? 0.8));
  return BURNER_PEAK_POWER_W * intensity * (falloff * falloff * (3 - 2 * falloff)); // smooth hermite falloff
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
  const rawMixed = Math.min(1, (eq.mixedness ?? 1) + rate * dt * (1 - (eq.mixedness ?? 1)));
  const nextMixed = rawMixed >= 0.995 ? 1 : rawMixed;
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
 * High viscosity fluids (e.g. conc. H2SO4, glycerol) pour appreciably slower.
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
  const visc = Math.max(0.35, source.viscosity_mPa_s ?? 0.9);
  const viscFactor = Math.min(1.15, Math.max(0.28, Math.pow(0.9 / visc, 0.35)));
  const capSpace = Math.max(0, target.capacity_ml - target.volume_ml);
  const requested = Math.min(source.volume_ml, rate_ml_s * viscFactor * dt);
  const accepted = Math.min(requested, capSpace);
  const overflow = requested - accepted;
  const spill = overflow + spillFrac * accepted;
  const moved = accepted * (1 - spillFrac);
  return { moved_ml: moved, spill_ml: spill, done: source.volume_ml - requested <= 1e-6 };
}

/**
 * Temperature-dependent dissolution / recrystallization equilibrium for all salts
 * with temperature-solubility curves (PbI2 Golden Rain, KNO3, CuSO4, NH4Cl, Ca(OH)2, etc.).
 */
export function stepTemperatureSolubility(
  contents: SubstanceQuantity[],
  volume_ml: number,
  temp_c: number,
  dt: number
): { contents: SubstanceQuantity[]; recrystallizedFormula?: string; redissolvedFormula?: string } {
  if (volume_ml <= 0.5 || dt <= 0) return { contents };
  let recrystallizedFormula: string | undefined;
  let redissolvedFormula: string | undefined;
  let changed = false;

  const saltGroups = new Map<string, { canonicalFormula: string; solidMass: number; dissolvedMass: number }>();
  for (const item of contents) {
    if (item.state !== 's' && item.state !== 'aq') continue;
    const norm = normalizeFormula(item.formula);
    if (norm === 'H2O') continue;
    const entry = saltGroups.get(norm) ?? {
      canonicalFormula: norm === 'PBI2' ? 'PbI2' : item.formula,
      solidMass: 0,
      dissolvedMass: 0,
    };
    if (item.state === 's') entry.solidMass += Math.max(0, item.mass_g);
    else entry.dissolvedMass += Math.max(0, item.mass_g);
    saltGroups.set(norm, entry);
  }

  let working = contents;
  const rate = Math.min(1, dt * 0.45);

  for (const [normKey, entry] of saltGroups.entries()) {
    const sol_g_100ml = solubilityAtTemperature_g_100ml(entry.canonicalFormula, temp_c);
    if (sol_g_100ml === null) continue;

    const totalMass = entry.solidMass + entry.dissolvedMass;
    if (totalMass <= 0.005) continue;

    const maxDissolvedMass = (sol_g_100ml * volume_ml) / 100;
    // Act when solid crystal coexists with solvent or when solution is supersaturated
    if (entry.solidMass <= 1e-4 && entry.dissolvedMass <= maxDissolvedMass + 1e-4) continue;

    const targetDissolved = Math.min(totalMass, maxDissolvedMass);
    const delta = (targetDissolved - entry.dissolvedMass) * rate;
    if (Math.abs(delta) <= 0.0005) continue;

    changed = true;
    const molarMass = Math.max(1e-3, computeMolarMass(entry.canonicalFormula));
    const nextDissolved = Math.max(0, Math.min(totalMass, entry.dissolvedMass + delta));
    const nextSolid = Math.max(0, totalMass - nextDissolved);

    working = working.filter(c => normalizeFormula(c.formula) !== normKey || (c.state !== 's' && c.state !== 'aq'));
    if (nextSolid > 1e-4) {
      working.push({
        formula: entry.canonicalFormula,
        mass_g: Math.round(nextSolid * 10000) / 10000,
        moles: Math.round((nextSolid / molarMass) * 1e6) / 1e6,
        state: 's',
      });
    }
    if (nextDissolved > 1e-4) {
      working.push({
        formula: entry.canonicalFormula,
        mass_g: Math.round(nextDissolved * 10000) / 10000,
        moles: Math.round((nextDissolved / molarMass) * 1e6) / 1000000,
        concentration_M: Math.round(((nextDissolved / molarMass) / (volume_ml / 1000)) * 1e5) / 1e5,
        state: 'aq',
      });
    }

    if (delta < -0.001) {
      if (normKey === 'PBI2' || !recrystallizedFormula) {
        recrystallizedFormula = entry.canonicalFormula;
      }
    } else if (delta > 0.001) {
      if (normKey === 'PBI2' || !redissolvedFormula) {
        redissolvedFormula = entry.canonicalFormula;
      }
    }
  }

  return changed ? { contents: working, recrystallizedFormula, redissolvedFormula } : { contents };
}

export interface ProbeDipResult {
  isSubmerged: boolean;
  submergedInVesselId?: string;
  measuredPh?: number;
  measuredTemp_c?: number;
  triggerStir?: boolean;
}

/**
 * Detect physical immersion of measurement probes (pH meter, thermometer, stirring rod, pH paper)
 * into a vessel containing liquid on the workbench.
 */
export function probeDipCoupling(
  probe: EquipmentState,
  vessels: EquipmentState[],
  dt: number,
): ProbeDipResult {
  const probeTipX = probe.x + probe.width / 2;
  const probeTipY = probe.y + probe.height - 12;

  // Find a container vessel whose bounding box encloses the probe tip
  const vessel = vessels.find(v => {
    if (!v.isContainer || v.id === probe.id) return false;
    const insideX = probeTipX >= v.x + 5 && probeTipX <= v.x + v.width - 5;
    const insideY = probeTipY >= v.y + 15 && probeTipY <= v.y + v.height + 5;
    return insideX && insideY;
  });

  if (!vessel || vessel.volume_ml <= 0) {
    const curTemp = probe.temperature_c ?? AMBIENT_TEMP_C;
    return {
      isSubmerged: false,
      measuredPh: 7.00,
      measuredTemp_c: Math.round((curTemp + (AMBIENT_TEMP_C - curTemp) * Math.min(1.0, dt * 0.8)) * 10) / 10,
      triggerStir: false,
    };
  }

  // Probe is submerged in liquid!
  const targetTemp = vessel.temperature_c;
  const currentTemp = probe.temperature_c ?? AMBIENT_TEMP_C;
  const newTemp = currentTemp + (targetTemp - currentTemp) * Math.min(1.0, dt * 2.5);

  return {
    isSubmerged: true,
    submergedInVesselId: vessel.id,
    measuredPh: vessel.ph,
    measuredTemp_c: Math.round(newTemp * 10) / 10,
    triggerStir: probe.type === 'stirring_rod',
  };
}

/**
 * Continuous liquid drainage through separatory funnel stopcock.
 * Drains the denser lower aqueous phase first, stopping cleanly at the phase boundary.
 */
export function separatoryFunnelDrain(
  funnel: EquipmentState,
  dt: number,
  drainRate_ml_s = 2.0,
): { drainedAqueous_ml: number; closedAfterDrain: boolean } {
  if (funnel.type !== 'separatory_funnel' || !funnel.stopcockOpen || funnel.volume_ml <= 0) {
    return { drainedAqueous_ml: 0, closedAfterDrain: false };
  }

  const organicVol = funnel.hasPhaseSeparation ? (funnel.organicLayerVolume_ml || 0) : 0;
  const maxDrainableAqueous = Math.max(0, funnel.volume_ml - organicVol);

  if (maxDrainableAqueous <= 1e-4) {
    return { drainedAqueous_ml: 0, closedAfterDrain: true };
  }

  const drainAmount = Math.min(maxDrainableAqueous, drainRate_ml_s * dt);
  const remainingAqueous = maxDrainableAqueous - drainAmount;
  const closedAfterDrain = remainingAqueous <= 1e-3;

  return { drainedAqueous_ml: drainAmount, closedAfterDrain };
}
