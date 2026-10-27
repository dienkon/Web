import * as THREE from 'three';
import { PhysicalPrecipitateParticle, PrecipitateProfile, SedimentBedState } from '../core/SimulationTypes';
import { getPrecipitateProfile } from '../core/SimulationConfig';
import { LiquidMotionSystem } from './LiquidMotionSystem';
import { PRNG } from '../../core/rng';
import { containParticle, type ParticleBounds } from './particleBounds';
import { sedimentLevel, cylinderSedimentThickness } from './sedimentGeometry';
import { sphereSettlingSpeed, sphereDragResponseTime, particleResponseFactors } from '../../science/particleSettling';
import { METERS_PER_SCENE_UNIT } from '../../science/sceneUnits';
import { suspensionCloudiness } from '../../science/suspensionCloudiness';
import { brownianDiffusivity } from '../../science/brownianDiffusion';
import type { ConvectionFluidModel } from '../../science/convectionForcing';
import type { SuspensionCarrierMode } from '../../science/suspensionFluid';

export interface PrecipitationSimulationParams extends ParticleBounds {
  carrierMode?: SuspensionCarrierMode;
  temp_c: number;
  /** Room boundary used by the prescribed circulation; legacy default 25 C. */
  ambientTemp_c?: number;
  convectionFluidModel?: ConvectionFluidModel;
  viscosity_mPa_s: number;
  density_g_ml: number;
  radius: number;
  liquidBottomY: number;
  surfaceY: number;
  precipitateAmount_g: number;
  volume_ml?: number;
  substance?: string;
  formation?: string;
  declaredColor?: string;
  agitation?: number;
  heatPower_W?: number;
  entryPoint?: [number, number, number];
  sharedSedimentThickness?: number;
  withdrawnSuspension_g?: number;
}

export class PrecipitationSystem {
  public particles: PhysicalPrecipitateParticle[] = [];
  public maxParticles: number;
  public profile: PrecipitateProfile;
  public sedimentBed: SedimentBedState;
  public cloudiness = 0; // 0 (clear) to 1.0 (opaque)
  public lastInputMass_g: number | null = null;
  public carrierMode: SuspensionCarrierMode | null = null;

  private spawnTimer = 0;
  private nextId = 1;
  private trackedMass_g = 0;
  private pendingMass_g = 0;
  private pendingBedMass_g = 0;
  public readonly fixedDt = 1 / 120;
  public readonly maxSubstepsPerUpdate = 240;
  public acceptedTime_s = 0;
  public integratedTime_s = 0;
  private pendingSteps: { seconds: number; totalSteps: number; done: number; params: PrecipitationSimulationParams }[] = [];
  public get pendingTime_s(): number {
    return this.pendingSteps.reduce((sum,p) => sum + Math.max(0,p.seconds-p.done*this.fixedDt),0);
  }
  public get clock() {
    return { model: 'bounded-120hz-precipitation' as const, acceptedTime_s: this.acceptedTime_s,
      integratedTime_s: this.integratedTime_s, pendingTime_s: this.pendingTime_s };
  }

  public get representedMass_g(): number {
    return this.pendingMass_g + this.sedimentBed.amount_g
      + this.particles.reduce((sum, particle) => sum + particle.mass_ug / 1e6, 0);
  }

  public get emittedCount(): number {
    return this.nextId - 1;
  }
  /** Change representative glyph count without changing physical particle
   * size or total mass. Retained parcels absorb the removed parcel weights. */
  public setParticleBudget(count: number): void {
    this.maxParticles = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
    if (this.particles.length <= this.maxParticles) return;
    const removed = this.particles.splice(this.maxParticles);
    const removedMass = removed.reduce((s, p) => s + p.mass_ug, 0);
    const retainedMass = this.particles.reduce((s, p) => s + p.mass_ug, 0);
    if (retainedMass > 0) for (const p of this.particles) p.mass_ug *= 1 + removedMass / retainedMass;
    else this.pendingMass_g += removedMass / 1e6;
  }
  private rng: PRNG;

  /** Remove representative whole particles/pending suspension for a committed
   * outflow. Bed mass and physical particle radius are untouched. */
  private withdrawSuspension(mass_g: number): void {
    if (!(mass_g > 0) || !Number.isFinite(mass_g)) return;
    const suspended = this.pendingMass_g + this.particles.reduce((sum, p) => sum + p.mass_ug / 1e6, 0);
    if (!(suspended > 0)) return;
    const removed = Math.min(mass_g, suspended), fraction = Math.max(0, 1 - removed / suspended);
    this.pendingMass_g *= fraction;
    this.pendingBedMass_g *= fraction;
    if (fraction === 0) this.particles = [];
    else for (const p of this.particles) p.mass_ug *= fraction;
    this.trackedMass_g = Math.max(0, this.trackedMass_g - removed);
  }

  constructor(maxParticles = 140, substance = 'BaSO4', rng?: PRNG) {
    this.maxParticles = maxParticles;
    this.profile = getPrecipitateProfile(substance);
    this.rng = rng || new PRNG();
    this.sedimentBed = {
      amount_g: 0,
      metalness: this.profile.metalness ?? 0,
      thickness: 0,
      roughness: this.profile.roughness,
      color: this.profile.color,
      morphology: this.profile.morphology,
      resuspensionTurbidity: 0
    };
  }

  public setSubstance(substance: string, formation?: string, declaredColor?: string): void {
    this.profile = getPrecipitateProfile(substance, formation, declaredColor);
    this.sedimentBed.color = this.profile.color;
    this.sedimentBed.metalness = this.profile.metalness ?? 0;
    this.sedimentBed.morphology = this.profile.morphology;
    this.sedimentBed.roughness = this.profile.roughness;
  }

  public reset(): void {
    this.clearParticles();
    this.pendingSteps = [];
    this.acceptedTime_s = this.integratedTime_s = 0;
    this.carrierMode = null;
    this.rng.reset();
  }

  private clearParticles(): void {
    this.particles = [];
    this.sedimentBed.amount_g = 0;
    this.sedimentBed.thickness = 0;
    this.cloudiness = 0;
    this.trackedMass_g = 0;
    this.pendingMass_g = 0;
    this.pendingBedMass_g = 0;
    this.spawnTimer = 0;
    this.nextId = 1;
    this.lastInputMass_g = null;
  }

  public update(dt: number, params: PrecipitationSimulationParams): void {
    if (![dt,params.precipitateAmount_g,params.temp_c,params.viscosity_mPa_s,params.density_g_ml,
      params.radius,params.liquidBottomY,params.surfaceY,params.ambientTemp_c ?? 25,params.agitation ?? 0,
      params.heatPower_W ?? 0,params.withdrawnSuspension_g ?? 0,params.sharedSedimentThickness ?? 0,
      params.volume_ml ?? 0,...(params.entryPoint ?? [])].every(Number.isFinite)
      || dt<=0 || params.precipitateAmount_g<0 || params.temp_c<=-273.15 || !(params.viscosity_mPa_s>0)
      || !(params.density_g_ml>0) || !(params.radius>0) || params.surfaceY<params.liquidBottomY
      || (params.agitation ?? 0)<0 || (params.agitation ?? 0)>1 || (params.heatPower_W ?? 0)<0
      || (params.withdrawnSuspension_g ?? 0)<0 || (params.sharedSedimentThickness ?? 0)<0 || (params.volume_ml ?? 0)<0
      || params.carrierMode!==undefined && !['liquid','dry-residue','frozen-matrix'].includes(params.carrierMode)
      || !Number.isFinite(this.acceptedTime_s+dt)) return;
    const ratio=dt/this.fixedDt, nearest=Math.round(ratio);
    // Consume ALL accepted seconds, including floating endpoint residue, in
    // the last step. Avoid an extra RNG tick for an ulp above an integer ratio.
    const totalSteps=Math.max(1,Math.abs(ratio-nearest)<=32*Number.EPSILON*Math.max(1,ratio)?nearest:Math.ceil(ratio));
    this.pendingSteps.push({seconds:dt,totalSteps,done:0,params:{...params,
      entryPoint:params.entryPoint?[...params.entryPoint]:undefined}});
    this.acceptedTime_s+=dt;
    for(let work=0;work<this.maxSubstepsPerUpdate && this.pendingSteps.length;work++){
      const first=this.pendingSteps[0], last=first.done+1>=first.totalSteps;
      const h=last?first.seconds-first.done*this.fixedDt:this.fixedDt;
      this.step(h,first.params);
      // This is an inventory receipt, not a per-second rate. Apply only once
      // even when its accepted interval spans many substeps/backlog updates.
      first.params.withdrawnSuspension_g=0;
      this.integratedTime_s+=h;first.done++;
      if(last)this.pendingSteps.shift();
    }
  }

  private step(dt: number, params: PrecipitationSimulationParams): void {
    this.carrierMode = params.carrierMode ?? (params.volume_ml===0?'dry-residue':'liquid');

    const {
      temp_c,
      viscosity_mPa_s,
      density_g_ml,
      radius,
      liquidBottomY,
      surfaceY,
      precipitateAmount_g,
      substance,
      agitation = 0,
      heatPower_W = 0
    } = params;

    if (substance) {
      this.setSubstance(substance, params.formation, params.declaredColor);
    }

    const height = Math.max(0, surfaceY - liquidBottomY);
    const bedThickness = params.sharedSedimentThickness ?? this.sedimentBed.thickness;
    const targetMass = Math.max(0, precipitateAmount_g);
    this.withdrawSuspension(params.withdrawnSuspension_g ?? 0);
    if (targetMass < this.trackedMass_g && this.trackedMass_g > 0) {
      // Dissolution removes represented mass from all three compartments.
      const fraction = targetMass / this.trackedMass_g;
      this.pendingMass_g *= fraction;
      this.pendingBedMass_g *= fraction;
      this.sedimentBed.amount_g *= fraction;
      const radiusFraction = Math.cbrt(fraction);
      for (const particle of this.particles) {
        particle.mass_ug *= fraction;
        particle.radius *= radiusFraction;
        if (particle.physicalRadius_m !== undefined) particle.physicalRadius_m *= radiusFraction;
        // Constant-density spherical glyph approximation. Chemistry owns the
        // dissolution amount; this visual update never consumes extra solid.
        particle.sedimentationSpeed *= radiusFraction * radiusFraction;
      }
    } else {
      this.pendingMass_g += targetMass - this.trackedMass_g;
    }
    this.trackedMass_g = targetMass;
    if (targetMass <= 1e-12) {
      this.clearParticles();
      this.lastInputMass_g = 0;
      return;
    }
    this.lastInputMass_g = targetMass;
    if(this.carrierMode==='dry-residue'){
      // Bulk dry-residue representation, not a simulated aerosol-deposition
      // trajectory. Transfer the EXISTING declared solid into its dry bed.
      this.particles=[];this.pendingMass_g=this.pendingBedMass_g=this.spawnTimer=0;
      this.sedimentBed.amount_g=targetMass;
      this.updateBedThickness(params);
      this.sedimentBed.resuspensionTurbidity=0;this.cloudiness=0;
      return;
    }
    if(this.carrierMode==='frozen-matrix'){
      // No liquid Stokes/Brownian carrier. Hold positions/inventory pending a
      // resolved interface pushing/engulfment model; do not settle through ice.
      for(const p of this.particles){p.age+=dt;p.vx=p.vy=p.vz=0;}
      this.updateBedThickness(params);
      this.sedimentBed.resuspensionTurbidity=0;this.cloudiness=0;
      return;
    }
    // Phenomenological entrainment, not a measured shear/erosion law. Transfer
    // existing bed mass into the emission reservoir; never create new solid.
    const stirring = Math.max(0, Math.min(1, agitation));
    const entrainmentRate = height > 1e-8 ? Math.max(0, stirring - 0.1) * 1.5 : 0;
    const entrainedMass = this.sedimentBed.amount_g * -Math.expm1(-entrainmentRate * dt);
    this.sedimentBed.amount_g -= entrainedMass;
    this.pendingMass_g += entrainedMass;
    this.pendingBedMass_g += entrainedMass;
    const crystalline = this.profile.morphology === 'crystalline';
    const glyphMass = Math.max(1e-12, targetMass / this.maxParticles);
    const newbornAges_s = new Map<number, number>();
    // Only newly allocated mass may nucleate. Settled glyphs never respawn
    // merely because a solid product still exists in the bottom of the vessel.
    if (this.pendingMass_g > 1e-12 && this.particles.length < this.maxParticles) {
      const glyphRate = crystalline ? 260 : 64, initialCredit = this.spawnTimer;
      let birthIndex = 0;
      this.spawnTimer = Math.min(this.maxParticles, this.spawnTimer + dt * glyphRate);
      while (this.spawnTimer >= 1 - 32 * Number.EPSILON && this.pendingMass_g > 1e-12 && this.particles.length < this.maxParticles) {
        this.spawnTimer = Math.max(0, this.spawnTimer - 1);
        const bornAt_s = Math.max(0, Math.min(dt, (++birthIndex - initialCredit) / glyphRate));
        const fromBed = this.pendingBedMass_g > 1e-12;
        const representedMass = Math.min(glyphMass, this.pendingMass_g,
          fromBed ? this.pendingBedMass_g : Infinity);
        this.pendingMass_g -= representedMass;
        if (fromBed) this.pendingBedMass_g = Math.max(0, this.pendingBedMass_g - representedMass);
        const baseRad = this.profile.displayRadius_scene ?? (crystalline
          ? 0.003 + this.rng.next() * 0.003
          : (this.profile.baseParticleRadius_mm * 1e-3) / METERS_PER_SCENE_UNIT);
        const rho_p = this.profile.particleDensity_g_cm3 * 1000; // kg/m3
        const rho_f = density_g_ml * 1000; // kg/m3
        const rPhys = this.profile.baseParticleRadius_mm * 1e-3;
        const sceneSedSpeed = sphereSettlingSpeed(rPhys, rho_p, rho_f, viscosity_mPa_s * 0.001) / METERS_PER_SCENE_UNIT;

        // Mixing front nucleation: spawn at entryPoint or upper liquid mixing zone (P4.1-lite)
        let px: number, py: number, pz: number, initVx: number, initVy: number, initVz: number;
        if (fromBed) {
          const angle = this.rng.next() * Math.PI * 2;
          const r = Math.sqrt(this.rng.next()) * radius * 0.65;
          px = Math.cos(angle) * r;
          pz = Math.sin(angle) * r;
          // Entrainment is a transfer into an illustrative finite mixing
          // layer. Do not rely on an artificial long-lived particle impulse
          // to lift material: physical drag removes that impulse rapidly.
          const mixingLayer = Math.min(height * 0.25, 0.1) * stirring;
          py = liquidBottomY + bedThickness + baseRad * 3 + 0.02 + mixingLayer;
          initVx = Math.cos(angle) * stirring * 0.05;
          initVz = Math.sin(angle) * stirring * 0.05;
          initVy = stirring * 0.15;
        } else if (params.entryPoint) {
          const ep = params.entryPoint;
          const spreadR = (this.rng.next() - 0.5) * (radius * 0.4);
          const spreadZ = (this.rng.next() - 0.5) * (radius * 0.4);
          px = THREE.MathUtils.clamp(ep[0] + spreadR, -radius * 0.7, radius * 0.7);
          pz = THREE.MathUtils.clamp(ep[2] + spreadZ, -radius * 0.7, radius * 0.7);
          py = Math.min(surfaceY - 0.01, ep[1] - this.rng.next() * 0.04);
          initVy = -(sceneSedSpeed * 1.6 + 0.05);
          initVx = spreadR * 0.4;
          initVz = spreadZ * 0.4;
        } else {
          // Fallback: spawn in top upper liquid mixing layer with downward convective plume
          const angle = this.rng.next() * Math.PI * 2;
          const rRatio = Math.sqrt(this.rng.next()) * 0.55;
          px = Math.cos(angle) * (rRatio * radius);
          pz = Math.sin(angle) * (rRatio * radius);
          py = surfaceY - this.rng.next() * height * (crystalline ? 0.85 : 0.35);
          initVy = -sceneSedSpeed;
          // No horizontal impulse without an entry stream or stirring.
          // Quiescent motion comes from Brownian diffusion and sampled fluid.
          initVx = 0;
          initVz = 0;
        }

        newbornAges_s.set(this.nextId, dt - bornAt_s);
        this.particles.push({
          id: this.nextId++,
          x: px,
          y: py,
          z: pz,
          radius: baseRad * (0.8 + this.rng.next() * 0.4),
          mass_ug: representedMass * 1e6, // representative glyph mass, not a physical single crystal
          density: rho_p,
          vx: initVx,
          vy: initVy,
          vz: initVz,
          sedimentationSpeed: sceneSedSpeed,
          physicalRadius_m: rPhys,
          aggregationLevel: 1,
          brownianSeed: this.rng.next() * 20.0,
          opacity: 0.92,
          age: 0,
          settled: false
        });
      }
      // A depleted mass reservoir/full pool cannot bank old whole sampling
      // attempts as a later burst. Retain only the fractional clock phase.
      this.spawnTimer %= 1;
    }

    // 2. SIMULATE SUSPENDED PARTICLES (Brownian motion, aggregation, convection, sedimentation)
    const activeParticles: PhysicalPrecipitateParticle[] = [];
    let newlySettledMass_g = 0;
    const settlingSpeeds = new Map<string, number>();

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      // New glyphs only experience the remainder of their actual sampling
      // step, not a full step of settling before they have been emitted.
      const particleDt = newbornAges_s.get(p.id) ?? dt;
      p.age += particleDt;
      if (p.physicalRadius_m !== undefined) {
        const key = `${p.physicalRadius_m}:${p.density}`;
        let speed = settlingSpeeds.get(key);
        if (speed === undefined) {
          speed = sphereSettlingSpeed(p.physicalRadius_m, p.density,
            density_g_ml * 1000, viscosity_mPa_s * 0.001) / METERS_PER_SCENE_UNIT;
          settlingSpeeds.set(key, speed);
        }
        p.sedimentationSpeed = speed;
      }

      // Sample fluid convection current
      const motionParams = {
        temp_c,
        ambientTemp_c: params.ambientTemp_c ?? 25,
        fluidModel: params.convectionFluidModel,
        agitation,
        heatPower_W,
        viscosity_mPa_s,
        radius,
        liquidBottomY,
        surfaceY,
        vesselProfile: params.vesselProfile
      };
      const [cvx, cvy, cvz] = LiquidMotionSystem.sampleVelocity(p.x, p.y, p.z, motionParams);

      // Overdamped Brownian POSITION increments, variance 2 D dt per axis.
      // Use physical radius, never magnified glyph size, and do not integrate
      // thermal noise through a second velocity damping filter.
      const diffusion = brownianDiffusivity(p.physicalRadius_m ?? this.profile.baseParticleRadius_mm * 1e-3,
        viscosity_mPa_s * 0.001, temp_c);
      const brownianSigma = Math.sqrt(2 * diffusion * particleDt) / METERS_PER_SCENE_UNIT;

      // Carrier advection and gravitational slip are separate. Stirring does
      // not reduce gravity or change the particle's terminal slip law.
      const initialTargetY = cvy - p.sedimentationSpeed;

      // Freeze the nonlinear drag multiplier over this step, using at least
      // the terminal slip. In the small-Re limit this is exact Stokes response.
      const slip = Math.max(Math.abs(p.sedimentationSpeed),
        Math.hypot(p.vx - cvx, p.vy - cvy, p.vz - cvz)) * METERS_PER_SCENE_UNIT;
      const tau = sphereDragResponseTime(p.physicalRadius_m ?? this.profile.baseParticleRadius_mm * 1e-3,
        p.density, density_g_ml * 1000, viscosity_mPa_s * 0.001, slip);
      // Sample spatially varying carrier motion at a deterministic midpoint.
      // Sampling only at the old position makes a short-response tracer spiral
      // outward numerically even in a purely tangential stirring field.
      const half = particleResponseFactors(particleDt / 2, tau);
      const [fluidX, fluidY, fluidZ] = LiquidMotionSystem.sampleVelocity(
        p.x + p.vx * half.initialTime_s + cvx * half.targetTime_s,
        p.y + p.vy * half.initialTime_s + initialTargetY * half.targetTime_s,
        p.z + p.vz * half.initialTime_s + cvz * half.targetTime_s, motionParams);
      const netVy = fluidY - p.sedimentationSpeed;
      const response = particleResponseFactors(particleDt, tau);

      // Integrate the deterministic velocity analytically before updating it;
      // terminal-only Euler positions would erase the finite entry impulse.
      p.x += p.vx * response.initialTime_s + fluidX * response.targetTime_s + this.rng.gaussian(0, brownianSigma);
      p.y += p.vy * response.initialTime_s + netVy * response.targetTime_s + this.rng.gaussian(0, brownianSigma);
      p.z += p.vz * response.initialTime_s + fluidZ * response.targetTime_s + this.rng.gaussian(0, brownianSigma);
      p.vx += (fluidX - p.vx) * response.relaxation;
      p.vy += (netVy - p.vy) * response.relaxation;
      p.vz += (fluidZ - p.vz) * response.relaxation;

      // Check if reached floor sediment bed
      if (p.y <= liquidBottomY + p.radius * 2.01 + bedThickness
        || !containParticle(p, params, 2.01)) {
        p.settled = true;
        // Transfer individual particle mass into the bottom sediment bed
        newlySettledMass_g += p.mass_ug / 1e6;
        continue;
      }

      activeParticles.push(p);
    }

    this.particles = activeParticles;

    // 3. ACCUMULATE MASS ONTO BOTTOM SEDIMENT BED
    if (newlySettledMass_g > 0) {
      this.sedimentBed.amount_g = Math.min(precipitateAmount_g, this.sedimentBed.amount_g + newlySettledMass_g);
    }
    this.updateBedThickness(params);

    // 4. DYNAMIC CLOUDINESS / SUPERNATANT CLARIFICATION
    // When particles settle, cloudiness decreases proportionally as supernatant clears
    const suspendedMass = Math.max(0, targetMass - this.sedimentBed.amount_g);
    // A quality-tier glyph budget must not determine whether the same sample
    // appears cloudy. Pending mass is suspended too, even before glyph emission.
    // Runtime supplies actual post-thermal liquid volume. Standalone previews
    // without inventory use a cylinder estimate in the shared scene scale.
    const volume_ml = params.volume_ml ?? Math.PI * radius ** 2 * height * METERS_PER_SCENE_UNIT ** 3 * 1e6;
    const targetCloudiness = suspensionCloudiness(suspendedMass, volume_ml, this.profile.cloudinessFactor);
    this.sedimentBed.resuspensionTurbidity = entrainmentRate > 0 ? targetCloudiness : 0;
    this.cloudiness = THREE.MathUtils.lerp(this.cloudiness, targetCloudiness, 1 - Math.exp(-dt * 1.5));
  }

  private updateBedThickness(params:PrecipitationSimulationParams):void{
    this.sedimentBed.thickness = params.vesselProfile ? sedimentLevel(params.vesselProfile.type,
      params.vesselProfile.capacity_ml,this.sedimentBed.amount_g,this.profile.particleDensity_g_cm3)-params.liquidBottomY
      : cylinderSedimentThickness(params.radius,this.sedimentBed.amount_g,this.profile.particleDensity_g_cm3);
  }
}
