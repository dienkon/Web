import * as THREE from 'three';
import { PhysicalBubble, BoilingStage } from '../core/SimulationTypes';
import { advanceBubbleMotion, type BubbleInterfaceMobility } from '../../science/bubbleRise';
import { waterSurfaceTension } from '../../science/wallDropletGeometry';
import { LiquidMotionSystem } from './LiquidMotionSystem';
import { vfxBus } from '../../vfx/bus';
import { labSound } from '../../utils/audio';
import { containParticle, type ParticleBounds } from './particleBounds';
import { PRNG } from '../../core/rng';
import { metersPerModelUnit } from '../../science/sceneUnits';
import { bubbleMechanicalRadius, condenseBubbleVapor } from '../../science/bubblePhase';
import { mergeBubbleGas, synchronizeBubbleGas, updateBubbleSource } from './bubbleGasInventory';
import type { ConvectionFluidModel } from '../../science/convectionForcing';
import { pointPlaneDepth, projectToLiquidPlane } from './liquidParticleFrame';

function advanceGlyphCredit(credit: number, rate: number, dt: number) {
  const total = credit + rate * dt;
  if (!Number.isFinite(total)) return { count: Infinity, credit: 0 };
  const whole = Math.floor(total), fraction = total - whole;
  // A threshold rounded a few ulps below one is not a missing source pulse.
  return 1 - fraction <= 32 * Number.EPSILON ? { count: whole + 1, credit: 0 } : { count: whole, credit: fraction };
}

export interface BoilingSimulationParams extends ParticleBounds {
  localToWorld?: (point: [number, number, number]) => [number, number, number];
  interfaceMobility?: BubbleInterfaceMobility;
  vesselId?: string;
  worldPosition?: [number, number, number];
  vaporRate_g_s?: number;
  pressure_atm?: number;
  liquidDensity_kg_m3?: number;
  temp_c: number;
  /** Room boundary used by the prescribed circulation; legacy default 25 C. */
  ambientTemp_c?: number;
  convectionFluidModel?: ConvectionFluidModel;
  boilingPoint_c: number;
  heatPower_W: number;
  viscosity_mPa_s: number;
  radius: number;
  liquidBottomY: number;
  surfaceY: number;
  boilingStage: BoilingStage;
  boilingIntensity: number;
  agitation?: number;
  reactionGasRate?: number;
}

export class BoilingSystem {
  public bubbles: PhysicalBubble[] = [];
  public maxBubbles: number;
  private thermalSpawnCredit = 0;
  private reactionSpawnCredit = 0;
  private vaporGlyphsBorn = 0;
  private reactionGlyphsBorn = 0;
  public get sourceSampling() {
    return { model: 'source-separated-visual-glyphs' as const, vaporGlyphsBorn: this.vaporGlyphsBorn,
      reactionGlyphsBorn: this.reactionGlyphsBorn, vaporFractionalCredit: this.thermalSpawnCredit,
      reactionFractionalCredit: this.reactionSpawnCredit,
      activeGlyphs: this.bubbles.length, activeMixedGlyphs: this.bubbles.filter(b => b.source === 'mixed').length };
  }
  private nextId = 1;
  private lastAudioPopTime = -Infinity;
  private accumulator = 0;
  private pending: { seconds: number; params: BoilingSimulationParams }[] = [];
  public acceptedTime_s = 0;
  public integratedTime_s = 0;
  public get pendingTime_s() { return this.accumulator; }
  public readonly fixedDt = 1 / 120;

  constructor(maxBubbles = 90, private rng = new PRNG()) {
    this.maxBubbles = maxBubbles;
    this.bubbles = [];
  }

  public reset(): void {
    this.bubbles = [];
    this.thermalSpawnCredit = this.reactionSpawnCredit = 0;
    this.vaporGlyphsBorn = this.reactionGlyphsBorn = 0;
    this.accumulator = 0;
    this.pending = [];
    this.acceptedTime_s = this.integratedTime_s = 0;
    this.nextId = 1;
    this.lastAudioPopTime = -Infinity;
    this.rng.reset();
  }

  public update(dt: number, params: BoilingSimulationParams): void {
    if (![dt, params.temp_c, params.boilingPoint_c, params.heatPower_W, params.viscosity_mPa_s,
      params.radius, params.liquidBottomY, params.surfaceY, params.boilingIntensity,
      params.pressure_atm ?? 1, params.liquidDensity_kg_m3 ?? 1000,
      params.vaporRate_g_s ?? 0, params.reactionGasRate ?? 0, params.agitation ?? 0,
      params.ambientTemp_c ?? 25].every(Number.isFinite) || dt <= 0
      || params.radius <= 0 || params.viscosity_mPa_s <= 0 || (params.pressure_atm ?? 1) <= 0
      || (params.liquidDensity_kg_m3 ?? 1000) <= 0 || params.temp_c <= -273.15
      || (params.vaporRate_g_s ?? 0) < 0 || (params.reactionGasRate ?? 0) < 0
      || (params.agitation ?? 0) < 0 || (params.agitation ?? 0) > 1
      || params.boilingIntensity < 0 || params.boilingIntensity > 1
      || !Number.isFinite(this.accumulator + dt) || !Number.isFinite(this.acceptedTime_s + dt)) return;
    if (!(params.surfaceY - params.liquidBottomY > 1e-8)) { this.reset(); return; }
    this.accumulator += dt;
    this.acceptedTime_s += dt;
    this.pending.push({ seconds: dt, params: { ...params,
      surfacePlane: params.surfacePlane ? { offset: params.surfacePlane.offset, normal: [...params.surfacePlane.normal] } : undefined,
      worldPosition: params.worldPosition ? [...params.worldPosition] : undefined } });
    let steps = 0;
    while (this.accumulator + 1e-12 >= this.fixedDt && steps++ < 240) {
      let remaining = this.fixedDt;
      while (remaining > 1e-12 && this.pending.length) {
        const first = this.pending[0], h = Math.min(remaining, first.seconds);
        this.step(h, first.params);
        this.integratedTime_s += h;
        remaining -= h; first.seconds -= h;
        if (first.seconds < 1e-12) this.pending.shift();
      }
      this.accumulator = Math.max(0, this.accumulator - this.fixedDt);
    }
  }

  private step(dt: number, params: BoilingSimulationParams): void {
    const METERS_PER_SCENE_UNIT = metersPerModelUnit(params.vesselProfile);

    const {
      temp_c,
      boilingPoint_c,
      heatPower_W,
      viscosity_mPa_s,
      radius,
      liquidBottomY,
      surfaceY,
      boilingStage,
      boilingIntensity
    } = params;

    const height = surfaceY - liquidBottomY;
    const sigma = Math.max(0, waterSurfaceTension(temp_c));
    const scale3 = METERS_PER_SCENE_UNIT ** 3;
    if (!(height > 1e-8)) { this.reset(); return; }

    // 1. DETERMINE SPAWN RATE ACCORDING TO BOILING STAGE
    let spawnRate = 0;
    let baseBubbleSize = 0.012;

    switch (boilingStage) {
      case 'COLD_STABLE':
      case 'WARMING_CONVECTION':
        spawnRate = 0; // Absolute stillness, no fake boiling!
        break;

      case 'MICROBUBBLE_NUCLEATION':
        // Rare tiny microbubbles forming at bottom hotspots (1 to 4/sec)
        spawnRate = 1.5 + (temp_c - 80) * 0.35;
        baseBubbleSize = 0.008 + this.rng.next() * 0.005; // tiny micro-nuclei
        break;

      case 'BOILING_ONSET':
        spawnRate = 8 + boilingIntensity * 12;
        baseBubbleSize = 0.012 + this.rng.next() * 0.008;
        break;

      case 'ACTIVE_BOIL':
        spawnRate = 22 + boilingIntensity * 28;
        baseBubbleSize = 0.015 + this.rng.next() * 0.012;
        break;

      case 'INTENSE_ROLLING_BOIL':
        spawnRate = 45 + boilingIntensity * 40;
        baseBubbleSize = 0.018 + this.rng.next() * 0.016;
        break;
    }

    // The lumped thermal model has no bottom superheat/dissolved-air reservoir.
    // Only an actual boiling source authorizes vapor bubbles. Chemical bubbles
    // remain a distinct source and must not be treated as condensing steam.
    const vaporRate = params.vaporRate_g_s ?? 0;
    const thermalRate = Number.isFinite(vaporRate) && vaporRate > 0
      && ['ACTIVE_BOIL', 'INTENSE_ROLLING_BOIL'].includes(boilingStage)
      ? Math.min(spawnRate, 300 * vaporRate) : 0; // visual packets/s, not molecular bubble count

    // Independent visual sampling channels. A fractional vapor pulse cannot
    // become noncondensable gas when a later reaction pulse crosses one glyph.
    const reactionRate = params.reactionGasRate ?? 0;
    const oldThermalCredit = this.thermalSpawnCredit, oldReactionCredit = this.reactionSpawnCredit;
    const thermalCredit = advanceGlyphCredit(oldThermalCredit, thermalRate, dt);
    const reactionCredit = advanceGlyphCredit(oldReactionCredit, reactionRate, dt);
    const thermalCount = thermalCredit.count, reactionCount = reactionCredit.count;
    this.thermalSpawnCredit = thermalCredit.credit;
    this.reactionSpawnCredit = reactionCredit.credit;
    // Discard only unsampled glyph attempts at the quality limit; gas mass is
    // owned by the vessel ledger. Work stays bounded even at extreme rates.
    const slots = Number.isSafeInteger(this.maxBubbles) ? Math.max(0, this.maxBubbles - this.bubbles.length) : 0;
    let thermalIndex = 0, reactionIndex = 0;
    for (let created = 0; created < slots && (thermalIndex < thermalCount || reactionIndex < reactionCount); created++) {
        const nextThermal = thermalIndex < thermalCount ? (thermalIndex + 1 - oldThermalCredit) / thermalRate : Infinity;
        const nextReaction = reactionIndex < reactionCount ? (reactionIndex + 1 - oldReactionCredit) / reactionRate : Infinity;
        const source = nextThermal <= nextReaction ? 'vapor' : 'reaction';
        if (source === 'vapor') { thermalIndex++; this.vaporGlyphsBorn++; }
        else { reactionIndex++; this.reactionGlyphsBorn++; }

        // Nucleate at bottom heated zone with controlled stochastic distribution
        const angle = this.rng.next() * Math.PI * 2;
        // Biased toward center where heat concentration is highest
        const rRatio = Math.pow(this.rng.next(), 0.75) * 0.78;
        const r = rRatio * radius;

        const bx = Math.cos(angle) * r;
        const bz = Math.sin(angle) * r;
        const by = liquidBottomY + this.rng.next() * (height * 0.08); // Right at heated floor!

        const baseRad = baseBubbleSize * (0.8 + this.rng.next() * 0.4);
        const birth = { x: bx, y: by, z: bz, radius: baseRad };
        if (params.surfacePlane && !containParticle(birth, params, 1.6)) continue;
        const pressure = (params.pressure_atm ?? 1) * 101325
          + (params.liquidDensity_kg_m3 ?? 1000) * 9.80665 * Math.max(0, pointPlaneDepth(birth, surfaceY, params.surfacePlane)) * METERS_PER_SCENE_UNIT
          + 2 * sigma / (baseRad * METERS_PER_SCENE_UNIT);

        this.bubbles.push({
          id: this.nextId++,
          source,
          gasPV_scene3_Pa: pressure * baseRad ** 3,
          nucleationPressure_Pa: pressure,
          x: birth.x,
          y: birth.y,
          z: birth.z,
          baseRadius: baseRad,
          radius: baseRad,
          vx: (this.rng.next() - 0.5) * 0.04,
          vy: 0,
          vz: (this.rng.next() - 0.5) * 0.04,
          buoyancy: 1.2 + this.rng.next() * 0.6,
          growthRate: 0.45 + this.rng.next() * 0.4,
          wobblePhase: this.rng.next() * Math.PI * 2,
          wobbleSpeed: 8.0 + this.rng.next() * 4.0,
          wobbleAmp: 0.002 + this.rng.next() * 0.003,
          aspectRatio: 1.0,
          life: 0,
          maxLife: 4.5,
          opacity: 0.88,
          temperature: temp_c,
          isPopping: false,
          popProgress: 0,
          merged: false
        });
    }

    // 3. STEP PHYSICAL SIMULATION FOR ALL BUBBLES
    const activeBubbles: PhysicalBubble[] = [];
    const movingBubbles: PhysicalBubble[] = [];
    const count = this.bubbles.length;
    // Establish one temperature and two component inventories before any pair
    // merges, including the neighbour that has not reached its motion update.
    // Phase relaxation uses water partial pressure at the local hydrostatic
    // and capillary pressure. Ambient Tb alone cannot identify subcooling at
    // depth. This representative VFX inventory never debits bulk liquid.
    for (const b of this.bubbles) if (!b.isPopping && !b.merged) {
      synchronizeBubbleGas(b, temp_c);
      if ((b.vaporPV_scene3_Pa ?? 0) > 0) {
        const pressure = (params.pressure_atm ?? 1) * 101325 + (params.liquidDensity_kg_m3 ?? 1000)
          * 9.80665 * Math.max(0, pointPlaneDepth(b, surfaceY, params.surfacePlane)) * METERS_PER_SCENE_UNIT;
        const phase = condenseBubbleVapor({ vapor_Pa_m3: b.vaporPV_scene3_Pa! * scale3,
          noncondensable_Pa_m3: b.noncondensablePV_scene3_Pa! * scale3, temperature_c: temp_c }, pressure, sigma, temp_c, dt);
        b.vaporPV_scene3_Pa = phase.vapor_Pa_m3 / scale3;
        updateBubbleSource(b);
      }
    }

    for (let i = 0; i < count; i++) {
      const b = this.bubbles[i];
      if (b.merged) continue;

      // 1. Handling surface arrival dome, thin-film drainage and burst
      if (b.isPopping) {
        b.popProgress += dt * 6.5; // Realistic drainage & burst sequence (~0.15s)
        b.radius = b.baseRadius * (1.15 + b.popProgress * 0.45);
        b.opacity = Math.max(0, 0.88 * (1.0 - b.popProgress));
        if (!containParticle(b, params, 1.6, true)) continue;

        if (b.popProgress >= 1.0) {
          // Finished burst
          continue;
        }
        activeBubbles.push(b);
        continue;
      }

      b.life += dt;
      // No arbitrary underwater expiry. Gas leaves through surface arrival,
      // condensation or geometry removal; dissolution needs a separate model.

      const rho = params.liquidDensity_kg_m3 ?? 1000;
      const pressureBefore = (params.pressure_atm ?? 1) * 101325
        + rho * 9.80665 * Math.max(0, pointPlaneDepth(b, surfaceY, params.surfacePlane)) * METERS_PER_SCENE_UNIT;
      if (!(b.gasPV_scene3_Pa! > 0)) continue;

      // Sample convective circulation current
      const [cvx, cvy, cvz] = LiquidMotionSystem.sampleVelocity(b.x, b.y, b.z, {
        temp_c,
        ambientTemp_c: params.ambientTemp_c ?? 25,
        fluidModel: params.convectionFluidModel,
        agitation: params.agitation,
        heatPower_W,
        viscosity_mPa_s,
        radius,
        liquidBottomY,
        surfaceY,
        vesselProfile: params.vesselProfile
      });

      const pvBefore = b.gasPV_scene3_Pa ?? (b.nucleationPressure_Pa ?? (params.pressure_atm ?? 1) * 101325) * b.baseRadius ** 3;
      const physicalRadius_m = bubbleMechanicalRadius(pvBefore * scale3, pressureBefore, sigma);
      const motion = advanceBubbleMotion([b.x * METERS_PER_SCENE_UNIT, b.y * METERS_PER_SCENE_UNIT, b.z * METERS_PER_SCENE_UNIT],
        [b.vx * METERS_PER_SCENE_UNIT, b.vy * METERS_PER_SCENE_UNIT, b.vz * METERS_PER_SCENE_UNIT],
        [cvx * METERS_PER_SCENE_UNIT, cvy * METERS_PER_SCENE_UNIT, cvz * METERS_PER_SCENE_UNIT],
        physicalRadius_m, rho, viscosity_mPa_s * 0.001, dt, params.interfaceMobility, params.surfacePlane?.normal);
      [b.x, b.y, b.z] = motion.position.map(x => x / METERS_PER_SCENE_UNIT);
      [b.vx, b.vy, b.vz] = motion.velocity.map(u => u / METERS_PER_SCENE_UNIT);
      b.physicalRadius_m = physicalRadius_m;
      b.terminalSpeed_m_s = motion.terminal_m_s;

      // Illustrative path perturbation: displacement differences, not an
      // offset in metres mistakenly added as a velocity. Small spherical
      // bubbles have vanishing amplitude; the 30-Hz cap is numerical only.
      const diameter_m = 2 * physicalRadius_m;
      const eo = sigma > 0 ? 9.80665 * rho * diameter_m ** 2 / sigma : 0;
      const oldPhase = b.wobblePhase;
      const angularRate = 2 * Math.PI * Math.min(30, 0.22 * motion.terminal_m_s / diameter_m);
      b.wobblePhase += dt * angularRate;
      const amplitude = physicalRadius_m / METERS_PER_SCENE_UNIT * Math.min(0.12, 0.02 * eo);
      const wobbleX = amplitude * (Math.sin(b.wobblePhase) - Math.sin(oldPhase));
      const wobbleZ = amplitude * (Math.cos(b.wobblePhase * 0.85) - Math.cos(oldPhase * 0.85));
      if (params.surfacePlane) {
        const [ux, uy, uz] = params.surfacePlane.normal, planar = Math.hypot(ux, uy);
        const ax = planar > 1e-8 ? uy / planar : 1, ay = planar > 1e-8 ? -ux / planar : 0;
        b.x += ax * wobbleX + ay * uz * wobbleZ;
        b.y += ay * wobbleX - ax * uz * wobbleZ;
        b.z += (ax * uy - ay * ux) * wobbleZ;
      } else { b.x += wobbleX; b.z += wobbleZ; }

      // 3. Oblate spheroidal deformation (Eötvös & Weber numbers)
      // Eo = g * Δρ * d² / σ ; We = ρ * U² * d / σ
      const speed_m_s = Math.hypot(b.vx - cvx, b.vy - cvy, b.vz - cvz) * METERS_PER_SCENE_UNIT;
      const we = sigma > 0 ? (rho * speed_m_s ** 2 * diameter_m) / sigma : 0;
      const targetAspect = Math.max(0.62, Math.min(1.0, 1.0 / (1.0 + 0.163 * Math.pow(Math.max(0.01, eo), 0.75) * Math.pow(we + 0.1, 0.1))));
      b.aspectRatio = THREE.MathUtils.lerp(b.aspectRatio, targetAspect, 1 - Math.exp(-dt * 6.0));

      // Hydrostatic exterior plus the single-interface Laplace pressure.
      const atmosphericPressure = (params.pressure_atm ?? 1) * 101325;
      const localPressure = atmosphericPressure + (params.liquidDensity_kg_m3 ?? 1000)
        * 9.80665 * Math.max(0, pointPlaneDepth(b, surfaceY, params.surfacePlane)) * METERS_PER_SCENE_UNIT;
      const gasPV = b.gasPV_scene3_Pa ?? (b.nucleationPressure_Pa ?? atmosphericPressure) * b.baseRadius ** 3;
      b.radius = bubbleMechanicalRadius(gasPV * scale3, localPressure, sigma) / METERS_PER_SCENE_UNIT;
      b.physicalRadius_m = b.radius * METERS_PER_SCENE_UNIT;
      movingBubbles.push(b);
    }

    // All phases and positions now refer to the same substep boundary. A
    // neighbour cannot skip its condensation/motion just because it merges.
    for (let i = 0; i < movingBubbles.length; i++) {
      const b = movingBubbles[i];
      if (b.merged) continue;
      const atmosphericPressure = (params.pressure_atm ?? 1) * 101325;
      const rho = params.liquidDensity_kg_m3 ?? 1000;
      for (let j = i + 1; j < movingBubbles.length; j++) {
        const b2 = movingBubbles[j];
        if (b2.isPopping || b2.merged) continue;
        const distSq = (b.x - b2.x) ** 2 + (b.y - b2.y) ** 2 + (b.z - b2.z) ** 2;
        const mergeDist = b.radius + b2.radius;
        if (distSq < mergeDist * mergeDist) {
          mergeBubbleGas(b, b2);
          const mergedPressure = atmosphericPressure + rho * 9.80665 * Math.max(0, pointPlaneDepth(b, surfaceY, params.surfacePlane)) * METERS_PER_SCENE_UNIT;
          b.radius = bubbleMechanicalRadius(b.gasPV_scene3_Pa! * scale3, mergedPressure, sigma) / METERS_PER_SCENE_UNIT;
          b.baseRadius = b.radius;
          b.nucleationPressure_Pa = mergedPressure + 2 * sigma / (b.radius * METERS_PER_SCENE_UNIT);
          break;
        }
      }
    }

    for (const b of movingBubbles) {
      if (b.merged) continue;
      b.physicalRadius_m = b.radius * METERS_PER_SCENE_UNIT;

      // 5. CHECK MENISCUS SURFACE IMPACT & BURST
      if (pointPlaneDepth(b, surfaceY, params.surfacePlane) <= b.radius * 1.6) {
        // Trigger surface pop!
        b.isPopping = true;
        b.popProgress = 0.05;
        projectToLiquidPlane(b, surfaceY, params.surfacePlane);
        if (!containParticle(b, params, 1.6, true)) continue;

        // Deterministic per-vessel event budget. Pure vapor and mixed packets
        // require phase-transfer acoustics; do not assign them an air tone.
        const now = this.integratedTime_s + dt;
        if (b.source === 'reaction' && now - this.lastAudioPopTime >= 0.045) {
          this.lastAudioPopTime = now;
          // Use mechanical radius before containment modifies the glyph.
          const r_mm = b.physicalRadius_m! * 1000;
          labSound.playMinnaertBubble(r_mm, true, Math.min(0.24, 0.08 + boilingIntensity * 0.12), {
            pressure_Pa: (params.pressure_atm ?? 1) * 101325,
            density_kg_m3: params.liquidDensity_kg_m3 ?? 1000,
            surfaceTension_N_m: sigma,
          });
        }

        // Worthington micro-jet and droplet ejecta
        if (boilingIntensity > 0.25 || this.rng.next() < 0.45) {
          const origin = params.worldPosition ?? [0, 0, 0];
          const up = params.surfacePlane?.normal ?? [0, 1, 0];
          const burstPoint: [number, number, number] = [b.x + up[0] * 0.006, b.y + up[1] * 0.006, b.z + up[2] * 0.006];
          if (params.vesselId) vfxBus.emit('particle:burst', {
            vesselId: params.vesselId,
            position: params.localToWorld?.(burstPoint) ?? [origin[0] + burstPoint[0], origin[1] + burstPoint[1], origin[2] + burstPoint[2]],
            count: Math.floor(2 + this.rng.next() * 3),
            color: '#f8fafc',
            speed: 0.85
          });
        }

        // Capillary surface ripple
        if (params.vesselId) vfxBus.emit('surface:ripple', {
          vesselId: params.vesselId,
          x: b.x / radius,
          z: b.z / radius,
          intensity: b.radius * 2.2
        });
      }

      if (!b.isPopping && !containParticle(b, params, 1.6)) continue;
      activeBubbles.push(b);
    }

    this.bubbles = activeBubbles;
  }
}
