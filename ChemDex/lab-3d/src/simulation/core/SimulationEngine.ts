import * as THREE from 'three';
import { stepVesselThermal, aqueousBoilingPoint } from '../../engine/thermalState';
import { PRNG, seedForLabel } from '../../core/rng';
import { sameMolecularFormula, identifySpecies } from '../../science/speciesIdentity';
import { VesselState } from '../../types/chemistry';
import { getVesselProfile } from '../../pour/physics/profiles';
import { vesselLiquidSurfaceY } from '../../science/vesselGeometry';
import { vesselLocalToWorld } from '../../science/vesselScale';
import { liquidSurfaceVolume } from '../../engine/waterPhase';
import { liquidInventoryMass } from '../../handling/solidOccupancy';
import { stockImmersion } from '../../science/stockImmersion';
import { solveStockLiquidSurface } from '../../science/stockLiquidSurface';
import { liquidParticlePlane, type LiquidPlane } from '../effects/liquidParticleFrame';
import { SedimentSurface } from '../../science/sedimentSurface';
import { sedimentPlane } from '../effects/sedimentPlane';
import { vesselInterior } from '../../science/vesselDimensions';
import { metersPerModelUnit } from '../../science/sceneUnits';
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
import { precipitatePackingFraction } from '../../science/precipitatePacking';
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
  private surfaceFrameCache?: { profile: object; volume: number; up: number[]; plane?: LiquidPlane; stock?: object | null };
  private bedSurface = new SedimentSurface();
  private bedPlaneCache?: { profile: object; volume: number; normal: readonly number[]; plane: LiquidPlane };
  private bedPlane(profile: ReturnType<typeof getVesselProfile>, volume: number) {
    if (!(volume > 0)) return undefined;
    const normal = this.bedSurface.normal, old = this.bedPlaneCache;
    if (!old || old.profile !== profile || old.volume !== volume || old.normal.some((n, i) => n !== normal[i]))
      this.bedPlaneCache = { profile, volume, normal: [...normal], plane: sedimentPlane(profile, volume, normal) };
    return this.bedPlaneCache!.plane;
  }

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

  public setPrecipitateBudget(count: number): void {
    if (!Number.isInteger(count) || count < 0 || count === this.maxPrecipitateParticles) return;
    this.maxPrecipitateParticles = count;
    const systems = [...this.precipitationSystems.values()];
    systems.forEach((system, index) => system.setParticleBudget(Math.floor(count / systems.length)
      + (index < count % systems.length ? 1 : 0)));
  }

  public reset(): void {
    this.bedSurface.reset(); this.bedPlaneCache = undefined;
    this.sedimentBed.surfacePlane = undefined; this.sedimentBed.packedVolume_ml = 0; this.sedimentBed.surfaceStatus = 'empty';
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
      /** Immutable model-to-world snapshot from the actual rendered glass. */
      bodyMatrixWorld?: readonly number[];
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
    const bodyMatrix = options.bodyMatrixWorld ? new THREE.Matrix4().fromArray(options.bodyMatrixWorld) : undefined;
    const localUp = bodyMatrix ? new THREE.Vector3(0, 1, 0).transformDirection(bodyMatrix.clone().invert())
      : new THREE.Vector3(Math.sin(vessel.rotationZ ?? 0), Math.cos(vessel.rotationZ ?? 0), 0);
    const localToWorld = bodyMatrix ? (point: [number, number, number]) => new THREE.Vector3(...point).applyMatrix4(bodyMatrix).toArray() as [number, number, number]
      : (point: [number, number, number]) => vesselLocalToWorld(vessel, point);
    const surfaceVolume = liquidSurfaceVolume({ ...vessel, volume_ml: thermal?.volume_ml ?? vessel.volume_ml,
      contents: thermal?.contents ?? vessel.contents });
    const surfaceVessel = { ...vessel, volume_ml: thermal?.volume_ml ?? vessel.volume_ml, contents: thermal?.contents ?? vessel.contents };
    const stockDensity = surfaceVessel.volume_ml > 0 ? liquidInventoryMass(surfaceVessel) / surfaceVessel.volume_ml : 1;
    const stock = stockImmersion(surfaceVessel, stockDensity);
    const cached = this.surfaceFrameCache;
    if (!cached || cached.profile !== profile || cached.volume !== surfaceVolume
      || cached.stock !== stock
      || cached.up[0] !== localUp.x || cached.up[1] !== localUp.y || cached.up[2] !== localUp.z) {
      const solved = stock ? solveStockLiquidSurface(surfaceVessel, localUp.toArray(), stockDensity) : null;
      this.surfaceFrameCache = { profile, volume: surfaceVolume, up: localUp.toArray(), stock,
        plane: solved ? { normal: localUp.toArray(), offset: solved.c } : liquidParticlePlane(profile, surfaceVolume, localUp.toArray()) };
    }
    const surfacePlane = this.surfaceFrameCache!.plane;
    const mouthY = profile.baseY + profile.H;
    const currentRadius = profile.r(fillY);
    const surfaceArea_cm2 = Math.PI * Math.pow(currentRadius * profile.sceneScale, 2);

    // 4. EVAPORATION STEP (Mass loss & solute concentration)
    this.evaporationSystem.update(dt, {
      sourceToWorld: bodyMatrix ? localToWorld : undefined,
      metersPerLocalUnit: profile.sceneScale / 100,
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
    const support = components.map(c => {
      const system = this.getPrecipitationSystem(c.formula);
      return { mass_g: Math.min(c.mass_g, system.sedimentBed.amount_g), profile: system.profile };
    });
    const priorBedVolume = support.reduce((sum, c) => sum + c.mass_g / (c.profile.particleDensity_g_cm3 * precipitatePackingFraction(c.profile)), 0);
    this.bedSurface.advance(dt, localUp.toArray(), 2 * vesselInterior(vessel.type).maximumRadius * metersPerModelUnit(profile),
      density_g_ml * 1000, viscosity_mPa_s * 0.001, support, fluid.carrierMode === 'liquid');
    const sharedSedimentPlane = this.bedPlane(profile, priorBedVolume);
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
      surfacePlane,
      substance: component.formula,
      formation: component.formation ?? (isActive ? vessel.precipitateMorphology : undefined),
      declaredColor: isActive ? vessel.precipitateColor : undefined,
      sharedSedimentThickness: this.sedimentBed.thickness,
      sharedSedimentPlane,
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
      bedVolume += settled / (system.profile.particleDensity_g_cm3 * precipitatePackingFraction(system.profile));
      br += sampleColor.r * settled; bg += sampleColor.g * settled; bb += sampleColor.b * settled;
      roughness += system.profile.roughness * settled;
      metalness += (system.profile.metalness ?? 0) * settled;
    }
    this.cloudiness = 1 - transmission;
    this.suspensionColor = suspendedTotal > 0 ? '#' + sampleColor.setRGB(sr / suspendedTotal, sg / suspendedTotal, sb / suspendedTotal).getHexString() : precipitateColor;
    this.sedimentBed.amount_g = bedMass;
    this.sedimentBed.packedVolume_ml = bedVolume;
    this.sedimentBed.surfacePlane = this.bedPlane(profile, bedVolume);
    this.sedimentBed.surfaceStatus = this.bedSurface.status;
    this.sedimentBed.relaxationTime_s = this.bedSurface.relaxationTime_s;
    const bedPlane = this.sedimentBed.surfacePlane;
    if (bedPlane && bedPlane.normal[1] * (profile.baseY + profile.H)
      - Math.hypot(bedPlane.normal[0], bedPlane.normal[2]) * profile.mouthR <= bedPlane.offset)
      this.sedimentBed.surfaceStatus = 'outlet-unresolved';
    // bedVolume already includes each species' pore volume; do not apply a
    // second, global packing factor to a mixed hydroxide/powder bed.
    this.sedimentBed.thickness = bedVolume > 0 ? sedimentLevel(vessel.type, vessel.capacity_ml, bedMass, bedMass / bedVolume, 1) - profile.baseY : 0;
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
        localToWorld,
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
        surfacePlane,
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

  public pruneManagers(liveIds: ReadonlySet<string>): void {
    for (const id of this.managers.keys()) if (!liveIds.has(id)) this.removeManager(id);
  }
}

export const SimulationEngine = new SimulationEngineClass();
