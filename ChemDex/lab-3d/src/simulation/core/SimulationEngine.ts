import * as THREE from 'three';
import { stepVesselThermal, aqueousBoilingPoint } from '../../engine/thermalState';
import { PRNG, seedForLabel } from '../../core/rng';
import { sameMolecularFormula, identifySpecies } from '../../science/speciesIdentity';
import { VesselState } from '../../types/chemistry';
import { getVesselProfile } from '../../pour/physics/profiles';
import { vesselLiquidSurfaceY } from '../../science/vesselGeometry';
import { precipitateComponents } from '../../science/precipitateInventory';
import { suspensionFluidProperties } from '../../science/suspensionFluid';
import { metalSurfaceAppearance } from '../../science/metalSurfaceAppearance';
import { BoilingSystem } from '../effects/BoilingSystem';
import { EvaporationSystem } from '../effects/EvaporationSystem';
import { PrecipitationSystem } from '../effects/PrecipitationSystem';
import { determineBoilingStage } from '../chemistry/PhaseEngine';
import { checkSaturation } from '../chemistry/SolubilityEngine';
import { getPrecipitateProfile } from './SimulationConfig';
import type { SedimentBedState } from './SimulationTypes';
import { sedimentLevel } from '../effects/sedimentGeometry';
import { DEFAULT_LAB_ENVIRONMENT, waterBoilingPointAtPressure } from '../../science/labEnvironment';
import { waterSaturationPressurePa } from '../../science/waterSaturation';
import { WATER_CP_J_G_K } from '../../engine/waterProperties';

export interface SimulationStepResult extends Partial<VesselState> {
  /** Water lost during THIS step; evaporated_ml is the cumulative vessel counter. */
  evaporatedStep_g: number;
  thermalModelLimit?: string;
  thermalEnergyOutsideModel_J?: number;
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
  viscosityModel: ReturnType<typeof suspensionFluidProperties>['viscosityModel'];
  densityModel: ReturnType<typeof suspensionFluidProperties>['densityModel'];
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
  public precipitationSystems = new Map<string, PrecipitationSystem>();
  public maxPrecipitateParticles: number;
  public sedimentBed: SedimentBedState;
  public cloudiness = 0;
  public suspensionColor = '#ffffff';
  public hasPrecipitationSnapshot = false;
  public suspensionOutflowApplied_g = new Map<string, number>();
  private initialSystemAssigned = false;

  constructor(vesselId: string, qualityTier: QualityTier | 'high' | 'medium' | 'low' = 'high') {
    this.vesselId = vesselId;
    const isHigh = qualityTier === 'high' || qualityTier === 'ultra';
    const isMed = qualityTier === 'medium';
    const maxB = isHigh ? 90 : isMed ? 45 : 20;
    const maxP = isHigh ? 900 : isMed ? 550 : qualityTier === 'low' ? 260 : 120;
    const maxE = isHigh ? 50 : isMed ? 25 : 15;

    this.boilingSystem = new BoilingSystem(maxB, new PRNG(seedForLabel(`${vesselId}:bubbles`)));
    this.evaporationSystem = new EvaporationSystem(maxE, new PRNG(seedForLabel(`${vesselId}:mist`)));
    this.precipitationSystem = new PrecipitationSystem(maxP);
    this.maxPrecipitateParticles = maxP;
    this.sedimentBed = { ...this.precipitationSystem.sedimentBed };
  }

  public getPrecipitationSystem(formula: string): PrecipitationSystem {
    const key = identifySpecies(formula).formula;
    let system = this.precipitationSystems.get(key);
    if (!system) {
      system = !this.initialSystemAssigned ? this.precipitationSystem : new PrecipitationSystem(this.maxPrecipitateParticles, key);
      this.initialSystemAssigned = true;
      system.setSubstance(key);
      this.precipitationSystems.set(key, system);
    }
    return system;
  }

  public reset(): void {
    this.boilingSystem.reset();
    this.evaporationSystem.reset();
    this.precipitationSystem.reset();
    for (const system of this.precipitationSystems.values()) system.reset();
    // Keep species objects stable for mounted render layers. step() removes
    // those no longer present; a physical reset must not orphan their refs.
    this.sedimentBed.amount_g = 0;
    this.sedimentBed.thickness = 0;
    this.cloudiness = 0;
    this.hasPrecipitationSnapshot = false;
    this.suspensionOutflowApplied_g.clear();
  }

  /**
   * Executes one deterministic physical simulation substep
   */
  public step(
    vessel: VesselState,
    dt: number,
    options: {
      /** Already absorbed sample heating power, W (J/s), not flame temperature. */
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
      reactionGasRate = 0,
      reactionPrecipitateActive = false,
      reactionPrecipitateSubstance
    } = options;

    const profile = getVesselProfile(vessel.type, vessel.capacity_ml);
    const environment = { ...DEFAULT_LAB_ENVIRONMENT, ...vessel.environment, ...vessel.effectsEnvironment };
    // One boundary for heat exchange, mist optics and both immersed particle
    // systems. A direct caller's explicit room override takes precedence.
    const ambientTemp_c = options.ambientTemp_c ?? environment.temperature_c;
    environment.temperature_c = ambientTemp_c;

    const thermal = options.thermalStateAuthoritative ? null : stepVesselThermal(vessel, dt, heatPower_W, ambientTemp_c);
    const newTemp = thermal?.temperature_c ?? vessel.temperature_c;
    const boilingPoint_c = thermal?.boilingPoint_c ?? aqueousBoilingPoint(vessel);
    const transportBoilingPoint = Number.isFinite(boilingPoint_c) ? boilingPoint_c : waterBoilingPointAtPressure(environment.pressure_atm);
    const isBoiling = Number.isFinite(boilingPoint_c) && (thermal ? thermal.isBoiling === true : vessel.isBoiling === true);
    const boilingIntensity = isBoiling ? (thermal?.boilingIntensity ?? vessel.boilingIntensity ?? 0) : 0;
    const boilingStage = isBoiling ? 'ACTIVE_BOIL' : Number.isFinite(boilingPoint_c)
      ? determineBoilingStage(Math.min(newTemp, boilingPoint_c - 0.01), boilingPoint_c, heatPower_W).stage : 'COLD_STABLE';
    const evaporated_ml = thermal?.evaporatedStep_g ?? 0;
    const vaporRate = thermal ? evaporated_ml / Math.max(1e-9, dt)
      : (vessel.waterVaporOutflow_g_s ?? vessel.evaporationRate_g_s ?? 0);
    const vaporTemperature = thermal && evaporated_ml > 0
      ? thermal.vaporSensibleEnergy_J / (WATER_CP_J_G_K * evaporated_ml)
      : vessel.waterVaporTemperature_c ?? newTemp;
    const vaporEnthalpy = thermal && evaporated_ml > 0
      ? ((thermal.thermalVaporEnthalpy_J ?? 0) - (vessel.thermalVaporEnthalpy_J ?? 0)) / evaporated_ml
      : vessel.waterVaporSpecificEnthalpy_J_g;

    // 3. FLUID PROPERTIES
    const fluid = suspensionFluidProperties(thermal?.contents ?? vessel.contents,
      thermal?.volume_ml ?? vessel.volume_ml, newTemp);
    const { viscosity_mPa_s, density_g_ml } = fluid;

    // Geometry heights
    const fillY = vesselLiquidSurfaceY({ ...vessel,
      volume_ml: thermal?.volume_ml ?? vessel.volume_ml,
      contents: thermal?.contents ?? vessel.contents });
    const mouthY = profile.baseY + profile.H;
    const currentRadius = profile.r(fillY);
    const surfaceArea_cm2 = Math.PI * Math.pow(currentRadius * profile.sceneScale, 2);

    // 4. EVAPORATION STEP (Mass loss & solute concentration)
    this.evaporationSystem.update(dt, {
      actualRate_g_s: vessel.isSealed || vessel.isShattered ? 0 : vaporRate,
      ambient_c: environment.temperature_c,
      relativeHumidity: environment.relativeHumidity,
      pressure_atm: environment.pressure_atm,
      sourceWaterPressure_Pa: thermal && evaporated_ml > 0
        ? Math.min(environment.pressure_atm * 101325, waterSaturationPressurePa(vaporTemperature)) : vessel.waterVaporPartialPressure_Pa,
      sourceWaterEnthalpy_J_g: vaporRate > 0 ? vaporEnthalpy : undefined,
      temp_c: vaporRate > 0 ? vaporTemperature : environment.temperature_c,
      surfaceArea_cm2,
      radius: vaporRate > 0 && (thermal?.volume_ml ?? vessel.volume_ml) <= 0 ? profile.mouthR : currentRadius,
      surfaceY: fillY,
      mouthY,
      mouthRadius: profile.mouthR,
      isBoiling,
      airflowVector: options.airflowVector ?? [environment.airSpeed_m_s, 0, 0]
    });

    const newVolume_ml = thermal?.volume_ml ?? vessel.volume_ml;
    const newMass_g = thermal?.mass_g ?? vessel.mass_g;

    // Chemistry/phase partition owns the amount. Persistent solids do not
    // authorize extra production, and KI/Pb salts are not assumed to be PbI2.
    const activeSubstance = reactionPrecipitateSubstance || vessel.precipitateSubstance;
    const inventory = thermal?.contents ?? vessel.contents;
    const coating = metalSurfaceAppearance({ ...vessel, contents: inventory });
    const components = precipitateComponents(inventory, activeSubstance).map(c => ({ ...c,
      mass_g: Math.max(0, c.mass_g - (coating && sameMolecularFormula(coating.product, c.formula) ? coating.attachedMass_g : 0)) }));
    const totalPrecipitate_g = components.reduce((s, c) => s + c.mass_g, 0);
    const hasPrecipitate = totalPrecipitate_g > 1e-12;
    const precipitateColor = activeSubstance
      ? getPrecipitateProfile(activeSubstance, vessel.precipitateMorphology, vessel.precipitateColor).color : vessel.precipitateColor || '#ffffff';
    // Always step, including zero mass, so dissolution clears suspended and
    // settled geometry instead of leaving the previous frame frozen in place.
    const present = new Set(components.map(c => c.formula));
    for (const [formula, system] of this.precipitationSystems) if (!present.has(formula)) {
      system.reset();
      this.precipitationSystems.delete(formula);
    }
    let transmission = 1, suspendedTotal = 0, bedVolume = 0, bedMass = 0;
    let sr = 0, sg = 0, sb = 0, br = 0, bg = 0, bb = 0, roughness = 0, metalness = 0;
    const sampleColor = new THREE.Color();
    for (let index = 0; index < components.length; index++) {
      const component = components[index];
      const system = this.getPrecipitationSystem(component.formula);
      const rawOutflow = vessel.precipitateOutflow_g?.[component.formula] ?? 0;
      const outflow = Number.isFinite(rawOutflow) ? Math.max(0, rawOutflow) : 0;
      const previouslyApplied = this.suspensionOutflowApplied_g.get(component.formula) ?? outflow;
      const isActive = !!activeSubstance && sameMolecularFormula(component.formula, activeSubstance);
      system.setParticleBudget(Math.floor(this.maxPrecipitateParticles / components.length)
        + (index < this.maxPrecipitateParticles % components.length ? 1 : 0));
      system.update(dt, {
      temp_c: newTemp,
      ambientTemp_c,
      convectionFluidModel: fluid.convectionFluidModel,
      carrierMode: fluid.carrierMode,
      viscosity_mPa_s,
      density_g_ml,
      radius: currentRadius,
      liquidBottomY: profile.baseY,
      surfaceY: fillY,
      precipitateAmount_g: component.mass_g,
      volume_ml: newVolume_ml,
      vesselProfile: profile,
      substance: component.formula,
      formation: component.formation ?? (isActive ? vessel.precipitateMorphology : undefined),
      declaredColor: isActive ? vessel.precipitateColor : undefined,
      sharedSedimentThickness: this.sedimentBed.thickness,
      withdrawnSuspension_g: Math.max(0, outflow - previouslyApplied),
      entryPoint: vessel.recentPourContact && vessel.recentPourContact.expiresAt_ms > Date.now()
        && vessel.recentPourContact.point.every(Number.isFinite) ? vessel.recentPourContact.point : undefined,
      agitation,
      heatPower_W,
      });
      this.suspensionOutflowApplied_g.set(component.formula, outflow);
      transmission *= 1 - system.cloudiness;
      const suspended = Math.max(0, component.mass_g - system.sedimentBed.amount_g);
      sampleColor.set(system.profile.color);
      sr += sampleColor.r * suspended; sg += sampleColor.g * suspended; sb += sampleColor.b * suspended;
      suspendedTotal += suspended;
      const settled = system.sedimentBed.amount_g;
      bedMass += settled;
      bedVolume += settled / system.profile.particleDensity_g_cm3;
      br += sampleColor.r * settled; bg += sampleColor.g * settled; bb += sampleColor.b * settled;
      roughness += system.profile.roughness * settled;
      metalness += (system.profile.metalness ?? 0) * settled;
    }
    this.cloudiness = 1 - transmission;
    this.suspensionColor = suspendedTotal > 0 ? '#' + sampleColor.setRGB(sr / suspendedTotal, sg / suspendedTotal, sb / suspendedTotal).getHexString() : precipitateColor;
    this.sedimentBed.amount_g = bedMass;
    this.sedimentBed.thickness = bedVolume > 0 ? sedimentLevel(vessel.type, vessel.capacity_ml, bedMass, bedMass / bedVolume) - profile.baseY : 0;
    if (bedMass > 0) {
      this.sedimentBed.color = '#' + sampleColor.setRGB(br / bedMass, bg / bedMass, bb / bedMass).getHexString();
      this.sedimentBed.roughness = roughness / bedMass;
      this.sedimentBed.metalness = metalness / bedMass;
    }
    this.precipitationSystem = (activeSubstance ? this.precipitationSystems.get(identifySpecies(activeSubstance).formula) : undefined)
      ?? this.precipitationSystems.values().next().value ?? this.precipitationSystem;
    if (!components.length) {
      this.precipitationSystem.reset();
      if (activeSubstance) this.precipitationSystem.setSubstance(activeSubstance);
      this.precipitationSystem.lastInputMass_g = 0;
    }
    this.hasPrecipitationSnapshot = true;

    // 7. BOILING / GAS BUBBLE SIMULATION STEP
    const hasGasGeneration = reactionGasRate > 0;
    if (fluid.carrierMode==='liquid' && Number.isFinite(transportBoilingPoint)
      && (boilingStage !== 'COLD_STABLE' || hasGasGeneration || this.boilingSystem.bubbles.length > 0) && newVolume_ml > 0.5) {
      this.boilingSystem.update(dt, {
        interfaceMobility: vessel.bubbleInterfaceMobility ?? 'immobile',
        vesselId: vessel.id,
        worldPosition: vessel.position,
        vaporRate_g_s: Number.isFinite(boilingPoint_c) ? thermal?.evaporationRate_g_s ?? vessel.evaporationRate_g_s ?? 0 : 0,
        pressure_atm: environment.pressure_atm,
        liquidDensity_kg_m3: density_g_ml * 1000,
        temp_c: newTemp,
        ambientTemp_c,
        convectionFluidModel: fluid.convectionFluidModel,
        boilingPoint_c: transportBoilingPoint,
        heatPower_W,
        viscosity_mPa_s,
        radius: currentRadius,
        liquidBottomY: profile.baseY,
        surfaceY: fillY,
        boilingStage,
        vesselProfile: profile,
        boilingIntensity: hasGasGeneration ? Math.max(boilingIntensity, Math.min(1.0, reactionGasRate / 30)) : boilingIntensity,
        agitation,
        reactionGasRate
      });
    } else {
      this.boilingSystem.reset();
    }

    return {
      ...thermal,
      thermalModelLimit: thermal ? thermal.thermalModelLimit : vessel.thermalModelLimit,
      thermalEnergyOutsideModel_J: thermal ? thermal.thermalEnergyOutsideModel_J : vessel.thermalEnergyOutsideModel_J,
      thermalHeatingPower_W: thermal ? thermal.thermalHeatingPower_W : vessel.thermalHeatingPower_W,
      thermalHeatingEnergy_J: thermal ? thermal.thermalHeatingEnergy_J : vessel.thermalHeatingEnergy_J,
      thermalVaporEnthalpy_J: thermal ? thermal.thermalVaporEnthalpy_J : vessel.thermalVaporEnthalpy_J,
      thermalVaporSensibleEnthalpy_J: thermal ? thermal.thermalVaporSensibleEnthalpy_J : vessel.thermalVaporSensibleEnthalpy_J,
      temperature_c: newTemp,
      contents: thermal?.contents ?? vessel.contents,
      evaporationRate_g_s: vaporRate,
      isBoiling,
      boilingIntensity,
      volume_ml: newVolume_ml,
      mass_g: newMass_g,
      evaporated_ml: thermal?.evaporated_ml ?? vessel.evaporated_ml ?? 0,
      evaporatedStep_g: evaporated_ml,
      hasPrecipitate,
      precipitateAmount_g: totalPrecipitate_g,
      precipitateColor,
      cloudiness: this.cloudiness,
      sedimentThickness: this.sedimentBed.thickness,
      viscosity_mPa_s,
      density_g_ml,
      viscosityModel: fluid.viscosityModel,
      densityModel: fluid.densityModel,
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

  public findManager(vesselId: string): VesselSimulationManager | undefined {
    return this.managers.get(vesselId);
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
