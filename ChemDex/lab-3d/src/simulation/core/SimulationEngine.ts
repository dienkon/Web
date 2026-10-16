import * as THREE from 'three';
import { stepVesselThermal, aqueousBoilingPoint } from '../../engine/thermalState';
import { sameMolecularFormula } from '../../science/speciesIdentity';
import { VesselState } from '../../types/chemistry';
import { VESSEL_PROFILES } from '../../pour/physics/profiles';
import { BoilingSystem } from '../effects/BoilingSystem';
import { EvaporationSystem } from '../effects/EvaporationSystem';
import { PrecipitationSystem } from '../effects/PrecipitationSystem';
import { determineBoilingStage, computeFluidViscosity, computeFluidDensity } from '../chemistry/PhaseEngine';
import { checkSaturation } from '../chemistry/SolubilityEngine';
import { getPrecipitateProfile } from './SimulationConfig';

export interface SimulationStepResult {
  contents: VesselState['contents'];
  evaporationRate_g_s: number;
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
import { QualityTier } from '../../vfx/quality';

export class VesselSimulationManager {
  public vesselId: string;
  public boilingSystem: BoilingSystem;
  public evaporationSystem: EvaporationSystem;
  public precipitationSystem: PrecipitationSystem;

  constructor(vesselId: string, qualityTier: QualityTier | 'high' | 'medium' | 'low' = 'high') {
    this.vesselId = vesselId;
    const isHigh = qualityTier === 'high' || qualityTier === 'ultra';
    const isMed = qualityTier === 'medium';
    const maxB = isHigh ? 90 : isMed ? 45 : 20;
    const maxP = isHigh ? 900 : isMed ? 550 : qualityTier === 'low' ? 260 : 120;
    const maxE = isHigh ? 50 : isMed ? 25 : 15;

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
      thermalStateAuthoritative?: boolean;
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

    const thermal = options.thermalStateAuthoritative ? null : stepVesselThermal(vessel, dt, heatPower_W * 8.5, ambientTemp_c);
    const newTemp = thermal?.temperature_c ?? vessel.temperature_c;
    const boilingPoint_c = thermal?.boilingPoint_c ?? aqueousBoilingPoint(vessel);
    const isBoiling = thermal ? thermal.isBoiling === true : vessel.isBoiling === true;
    const boilingIntensity = isBoiling ? (thermal?.boilingIntensity ?? vessel.boilingIntensity ?? 0) : 0;
    const boilingStage = isBoiling ? 'ACTIVE_BOIL' : determineBoilingStage(Math.min(newTemp, boilingPoint_c - 0.01), boilingPoint_c, heatPower_W).stage;
    const evaporated_ml = thermal?.evaporatedStep_g ?? 0;
    const vaporRate = thermal ? evaporated_ml / Math.max(1e-9, dt) : (vessel.evaporationRate_g_s ?? 0);

    // 3. FLUID PROPERTIES
    const soluteMass = (vessel.contents || []).filter(item => item.phase !== 's' && item.phase !== 'g'
      && !sameMolecularFormula(item.formula, 'H2O')).reduce((acc, c) => acc + (c.mass_g || 0), 0);
    const viscosity_mPa_s = computeFluidViscosity(newTemp, soluteMass / Math.max(0.01, vessel.volume_ml));
    const density_g_ml = computeFluidDensity(newTemp, soluteMass, vessel.volume_ml);

    // Geometry heights
    const volumeFrac = Math.max(0, Math.min(1.0, vessel.volume_ml / vessel.capacity_ml));
    const fillY = profile.baseY + profile.H * volumeFrac;
    const mouthY = profile.baseY + profile.H;
    const currentRadius = profile.r(fillY);
    const surfaceArea_cm2 = Math.PI * Math.pow(currentRadius * profile.sceneScale, 2);

    // 4. EVAPORATION STEP (Mass loss & solute concentration)
    this.evaporationSystem.update(dt, {
      actualRate_ml_s: vaporRate,
      temp_c: newTemp,
      surfaceArea_cm2,
      radius: currentRadius,
      surfaceY: fillY,
      mouthY,
      mouthRadius: profile.mouthR,
      isBoiling,
      airflowVector
    });

    const newVolume_ml = thermal?.volume_ml ?? vessel.volume_ml;
    const newMass_g = thermal?.mass_g ?? vessel.mass_g;

    // Chemistry/phase partition owns the amount. Persistent solids do not
    // authorize extra production, and KI/Pb salts are not assumed to be PbI2.
    const activeSubstance = reactionPrecipitateSubstance || vessel.precipitateSubstance;
    const solidEntries = activeSubstance ? vessel.contents.filter(item => item.formula === activeSubstance && item.phase === 's') : [];
    const totalPrecipitate_g = Math.max(0, vessel.precipitateAmount_g
      ?? solidEntries.reduce((sum, item) => sum + item.mass_g, 0));
    const hasPrecipitate = totalPrecipitate_g > 1e-12;
    const precipitateColor = activeSubstance
      ? getPrecipitateProfile(activeSubstance).color : vessel.precipitateColor || '#ffffff';
    // Always step, including zero mass, so dissolution clears suspended and
    // settled geometry instead of leaving the previous frame frozen in place.
    this.precipitationSystem.update(dt, {
      temp_c: newTemp,
      viscosity_mPa_s,
      density_g_ml,
      radius: currentRadius,
      liquidBottomY: profile.baseY,
      surfaceY: fillY,
      precipitateAmount_g: totalPrecipitate_g,
      substance: activeSubstance,
      agitation,
      heatPower_W,
    });

    // 7. BOILING / GAS BUBBLE SIMULATION STEP
    const hasGasGeneration = reactionGasRate > 0;
    if ((boilingStage !== 'COLD_STABLE' || hasGasGeneration) && newVolume_ml > 0.5) {
      this.boilingSystem.update(dt, {
        temp_c: newTemp,
        boilingPoint_c,
        heatPower_W,
        viscosity_mPa_s,
        radius: currentRadius,
        liquidBottomY: profile.baseY,
        surfaceY: fillY,
        boilingStage,
        boilingIntensity: hasGasGeneration ? Math.max(boilingIntensity, Math.min(1.0, reactionGasRate / 30)) : boilingIntensity,
        agitation,
        reactionGasRate
      });
    } else {
      this.boilingSystem.reset();
    }

    return {
      temperature_c: newTemp,
      contents: thermal?.contents ?? vessel.contents,
      evaporationRate_g_s: vaporRate,
      isBoiling,
      boilingIntensity,
      volume_ml: newVolume_ml,
      mass_g: newMass_g,
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

  public getManager(vesselId: string, qualityTier: QualityTier | 'high' | 'medium' | 'low' = 'high'): VesselSimulationManager {
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
