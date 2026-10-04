import * as THREE from 'three';
import { VesselState } from '../../types/chemistry';
import { VESSEL_PROFILES } from '../../pour/physics/profiles';
import { BoilingSystem } from '../effects/BoilingSystem';
import { EvaporationSystem } from '../effects/EvaporationSystem';
import { PrecipitationSystem } from '../effects/PrecipitationSystem';
import { determineBoilingStage, computeFluidViscosity, computeFluidDensity } from '../chemistry/PhaseEngine';
import { checkSaturation } from '../chemistry/SolubilityEngine';
import { getPrecipitateProfile } from './SimulationConfig';

export interface SimulationStepResult {
  temperature_c: number;
  isBoiling: boolean;
  boilingIntensity: number;
  volume_ml: number;
  mass_g: number;
  evaporated_ml: number;
  hasPrecipitate: boolean;
  precipitateAmount_g: number;
  precipitateColor: string;
  cloudiness: number;
  sedimentThickness: number;
  viscosity_mPa_s: number;
  density_g_ml: number;
}

/**
 * Per-vessel physical simulation manager instance
 */
export class VesselSimulationManager {
  public vesselId: string;
  public boilingSystem: BoilingSystem;
  public evaporationSystem: EvaporationSystem;
  public precipitationSystem: PrecipitationSystem;

  constructor(vesselId: string, qualityTier: 'high' | 'medium' | 'low' = 'high') {
    this.vesselId = vesselId;
    const maxB = qualityTier === 'high' ? 90 : qualityTier === 'medium' ? 45 : 20;
    const maxP = qualityTier === 'high' ? 140 : qualityTier === 'medium' ? 70 : 30;
    const maxE = qualityTier === 'high' ? 50 : qualityTier === 'medium' ? 25 : 15;

    this.boilingSystem = new BoilingSystem(maxB);
    this.evaporationSystem = new EvaporationSystem(maxE);
    this.precipitationSystem = new PrecipitationSystem(maxP);
  }

  public reset(): void {
    this.boilingSystem.reset();
    this.evaporationSystem.reset();
    this.precipitationSystem.reset();
  }

  /**
   * Executes one deterministic physical simulation substep
   */
  public step(
    vessel: VesselState,
    dt: number,
    options: {
      heatPower_W?: number;
      agitation?: number;
      airflowVector?: [number, number, number];
      ambientTemp_c?: number;
      reactionGasRate?: number;
      reactionPrecipitateActive?: boolean;
      reactionPrecipitateSubstance?: string;
    } = {}
  ): SimulationStepResult {
    const {
      heatPower_W = 0,
      agitation = 0,
      airflowVector = [0, 0, 0],
      ambientTemp_c = 25.0,
      reactionGasRate = 0,
      reactionPrecipitateActive = false,
      reactionPrecipitateSubstance
    } = options;

    const profile = VESSEL_PROFILES[vessel.type] || VESSEL_PROFILES.beaker;

    // 1. THERMAL CONDUCTION & COOLING
    // Direct heating from burner vs Newton's law of cooling to ambient
    const coolingRate = 0.08 * (vessel.temperature_c - ambientTemp_c);
    const heatingRate = heatPower_W * 0.14;
    const dT = (heatingRate - coolingRate) * dt;
    const newTemp = Math.max(ambientTemp_c, Math.min(100.0, vessel.temperature_c + dT));

    // 2. THERMODYNAMIC PHASE DETERMINATION
    const { stage: boilingStage, intensity: rawBoilingIntensity } = determineBoilingStage(
      newTemp,
      100.0,
      heatPower_W
    );
    const isBoiling = boilingStage === 'ACTIVE_BOIL' || boilingStage === 'INTENSE_ROLLING_BOIL' || vessel.isBoiling;
    const boilingIntensity = isBoiling ? Math.max(rawBoilingIntensity, vessel.boilingIntensity || 0.6) : 0;

    // 3. FLUID PROPERTIES
    const soluteMass = (vessel.contents || []).reduce((acc, c) => acc + (c.mass_g || 0), 0);
    const viscosity_mPa_s = computeFluidViscosity(newTemp, soluteMass / Math.max(0.01, vessel.volume_ml));
    const density_g_ml = computeFluidDensity(newTemp, soluteMass, vessel.volume_ml);

    // Geometry heights
    const volumeFrac = Math.max(0, Math.min(1.0, vessel.volume_ml / vessel.capacity_ml));
    const fillY = profile.baseY + profile.H * volumeFrac;
    const mouthY = profile.baseY + profile.H;
    const currentRadius = profile.r(fillY);
    const surfaceArea_cm2 = Math.PI * Math.pow(currentRadius * profile.sceneScale, 2);

    // 4. EVAPORATION STEP (Mass loss & solute concentration)
    const { evaporated_ml } = this.evaporationSystem.update(dt, {
      temp_c: newTemp,
      surfaceArea_cm2,
      radius: currentRadius,
      surfaceY: fillY,
      mouthY,
      mouthRadius: profile.mouthR,
      isBoiling,
      airflowVector
    });

    const newVolume_ml = Math.max(0, vessel.volume_ml - evaporated_ml);
    const newMass_g = Math.max(0, vessel.mass_g - evaporated_ml * density_g_ml);

    // 5. SUPERSATURATION & PRECIPITATION CHECK
    // If solvent evaporated significantly, solutes may exceed solubility limit!
    let totalPrecipitate_g = vessel.precipitateAmount_g || 0;
    let precipitateColor = vessel.precipitateColor || '#f8fafc';
    let hasPrecipitate = vessel.hasPrecipitate;

    if (vessel.contents && vessel.contents.length > 0 && newVolume_ml > 0) {
      for (const item of vessel.contents) {
        const sat = checkSaturation(item.formula, item.mass_g, newVolume_ml, newTemp);
        if (sat.isSupersaturated && sat.excessPrecipitate_g > 0.005) {
          hasPrecipitate = true;
          totalPrecipitate_g = Math.max(totalPrecipitate_g, sat.excessPrecipitate_g);
          const pProf = getPrecipitateProfile(item.formula);
          precipitateColor = pProf.color;
        }
      }
    }

    // Reaction precipitate override
    if (reactionPrecipitateActive) {
      hasPrecipitate = true;
      totalPrecipitate_g = Math.max(totalPrecipitate_g, 0.45);
      if (reactionPrecipitateSubstance) {
        precipitateColor = reactionPrecipitateSubstance;
      }
    }

    // 6. PRECIPITATION SIMULATION STEP
    if (hasPrecipitate || totalPrecipitate_g > 0.001) {
      this.precipitationSystem.update(dt, {
        temp_c: newTemp,
        viscosity_mPa_s,
        density_g_ml,
        radius: currentRadius,
        liquidBottomY: profile.baseY,
        surfaceY: fillY,
        precipitateAmount_g: totalPrecipitate_g,
        substance: precipitateColor,
        agitation,
        heatPower_W
      });
    }

    // 7. BOILING / GAS BUBBLE SIMULATION STEP
    const hasGasGeneration = reactionGasRate > 0;
    if ((boilingStage !== 'COLD_STABLE' || hasGasGeneration) && newVolume_ml > 0.5) {
      this.boilingSystem.update(dt, {
        temp_c: newTemp,
        boilingPoint_c: 100.0,
        heatPower_W,
        viscosity_mPa_s,
        radius: currentRadius,
        liquidBottomY: profile.baseY,
        surfaceY: fillY,
        boilingStage: hasGasGeneration && boilingStage === 'COLD_STABLE' ? 'BOILING_ONSET' : boilingStage,
        boilingIntensity: hasGasGeneration ? Math.max(boilingIntensity, Math.min(1.0, reactionGasRate / 30)) : boilingIntensity,
        agitation,
        reactionGasRate
      });
    } else {
      this.boilingSystem.reset();
    }

    return {
      temperature_c: Math.round(newTemp * 10) / 10,
      isBoiling,
      boilingIntensity,
      volume_ml: Math.round(newVolume_ml * 100) / 100,
      mass_g: Math.round(newMass_g * 100) / 100,
      evaporated_ml,
      hasPrecipitate,
      precipitateAmount_g: totalPrecipitate_g,
      precipitateColor,
      cloudiness: this.precipitationSystem.cloudiness,
      sedimentThickness: this.precipitationSystem.sedimentBed.thickness,
      viscosity_mPa_s,
      density_g_ml
    };
  }
}

/**
 * Singleton repository of vessel simulation managers
 */
class SimulationEngineClass {
  private managers: Map<string, VesselSimulationManager> = new Map();

  public getManager(vesselId: string, qualityTier: 'high' | 'medium' | 'low' = 'high'): VesselSimulationManager {
    if (!this.managers.has(vesselId)) {
      this.managers.set(vesselId, new VesselSimulationManager(vesselId, qualityTier));
    }
    return this.managers.get(vesselId)!;
  }

  public removeManager(vesselId: string): void {
    const mgr = this.managers.get(vesselId);
    if (mgr) {
      mgr.reset();
      this.managers.delete(vesselId);
    }
  }

  public clearAll(): void {
    for (const mgr of this.managers.values()) {
      mgr.reset();
    }
    this.managers.clear();
  }
}

export const SimulationEngine = new SimulationEngineClass();
