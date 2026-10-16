import * as THREE from 'three';
import { PhysicalPrecipitateParticle, PrecipitateProfile, SedimentBedState } from '../core/SimulationTypes';
import { getPrecipitateProfile } from '../core/SimulationConfig';
import { ConvectionSystem } from './ConvectionSystem';
import { PRNG } from '../../core/rng';

export interface PrecipitationSimulationParams {
  temp_c: number;
  viscosity_mPa_s: number;
  density_g_ml: number;
  radius: number;
  liquidBottomY: number;
  surfaceY: number;
  precipitateAmount_g: number;
  substance?: string;
  agitation?: number;
  heatPower_W?: number;
  entryPoint?: [number, number, number];
}

export class PrecipitationSystem {
  public particles: PhysicalPrecipitateParticle[] = [];
  public maxParticles: number;
  public profile: PrecipitateProfile;
  public sedimentBed: SedimentBedState;
  public cloudiness = 0; // 0 (clear) to 1.0 (opaque)

  private spawnTimer = 0;
  private nextId = 1;
  private trackedMass_g = 0;
  private pendingMass_g = 0;

  public get representedMass_g(): number {
    return this.pendingMass_g + this.sedimentBed.amount_g
      + this.particles.reduce((sum, particle) => sum + particle.mass_ug / 1e6, 0);
  }

  public get emittedCount(): number {
    return this.nextId - 1;
  }
  private rng: PRNG;

  constructor(maxParticles = 140, substance = 'BaSO4', rng?: PRNG) {
    this.maxParticles = maxParticles;
    this.profile = getPrecipitateProfile(substance);
    this.rng = rng || new PRNG();
    this.sedimentBed = {
      amount_g: 0,
      thickness: 0,
      roughness: this.profile.roughness,
      color: this.profile.color,
      morphology: this.profile.morphology,
      resuspensionTurbidity: 0
    };
  }

  public setSubstance(substance: string): void {
    this.profile = getPrecipitateProfile(substance);
    this.sedimentBed.color = this.profile.color;
    this.sedimentBed.morphology = this.profile.morphology;
    this.sedimentBed.roughness = this.profile.roughness;
  }

  public reset(): void {
    this.particles = [];
    this.sedimentBed.amount_g = 0;
    this.sedimentBed.thickness = 0;
    this.cloudiness = 0;
    this.trackedMass_g = 0;
    this.pendingMass_g = 0;
    this.spawnTimer = 0;
    this.nextId = 1;
  }

  public update(dt: number, params: PrecipitationSimulationParams): void {
    if (!Number.isFinite(dt) || dt <= 0 || !Number.isFinite(params.precipitateAmount_g)) return;
    dt = Math.min(dt, 0.2);

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

    if (substance && this.profile.id !== substance) {
      this.setSubstance(substance);
    }

    const height = Math.max(0.05, surfaceY - liquidBottomY);
    const targetMass = Math.max(0, precipitateAmount_g);
    if (targetMass < this.trackedMass_g && this.trackedMass_g > 0) {
      // Dissolution removes represented mass from all three compartments.
      const fraction = targetMass / this.trackedMass_g;
      this.pendingMass_g *= fraction;
      this.sedimentBed.amount_g *= fraction;
      for (const particle of this.particles) particle.mass_ug *= fraction;
    } else {
      this.pendingMass_g += targetMass - this.trackedMass_g;
    }
    this.trackedMass_g = targetMass;
    if (targetMass <= 1e-12) {
      this.reset();
      return;
    }
    const suspendedMassTarget_g = Math.max(0, targetMass - this.sedimentBed.amount_g);
    const crystalline = this.profile.morphology === 'crystalline';
    const glyphMass = Math.max(1e-12, targetMass / this.maxParticles);
    // Only newly allocated mass may nucleate. Settled glyphs never respawn
    // merely because a solid product still exists in the bottom of the vessel.
    if (this.pendingMass_g > 1e-12 && this.particles.length < this.maxParticles) {
      this.spawnTimer = Math.min(this.maxParticles, this.spawnTimer + dt * (crystalline ? 260 : 64));
      while (this.spawnTimer >= 1 && this.pendingMass_g > 1e-12 && this.particles.length < this.maxParticles) {
        this.spawnTimer -= 1;
        const representedMass = Math.min(glyphMass, this.pendingMass_g);
        this.pendingMass_g -= representedMass;
        const baseRad = crystalline
          ? 0.003 + this.rng.next() * 0.003
          : (this.profile.baseParticleRadius_mm / 1000) * 8.5;
        const rho_p = this.profile.particleDensity_g_cm3 * 1000; // kg/m3
        const rho_f = density_g_ml * 1000; // kg/m3
        const eta = Math.max(0.0003, viscosity_mPa_s * 0.001); // Pa*s

        // Stokes terminal sedimentation speed: v = 2/9 * (rho_p - rho_f) * g * r^2 / eta
        const deltaRho = Math.max(100, rho_p - rho_f);
        const rPhys = this.profile.baseParticleRadius_mm * 1e-3;
        const stokesV = (2 / 9) * (deltaRho * 9.81 * (rPhys * rPhys)) / eta;
        const sceneSedSpeed = crystalline ? 0.035 + this.rng.next() * 0.045
          : Math.min(0.35, Math.max(0.015, stokesV * 12.0));

        // Mixing front nucleation: spawn at entryPoint or upper liquid mixing zone (P4.1-lite)
        let px: number, py: number, pz: number, initVx: number, initVy: number, initVz: number;
        if (params.entryPoint) {
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
          initVy = -(sceneSedSpeed * 1.4 + 0.04);
          initVx = Math.cos(angle) * 0.025;
          initVz = Math.sin(angle) * 0.025;
        }

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
          aggregationLevel: 1,
          brownianSeed: this.rng.next() * 20.0,
          opacity: 0.92,
          age: 0,
          settled: false
        });
      }
    }

    // 2. SIMULATE SUSPENDED PARTICLES (Brownian motion, aggregation, convection, sedimentation)
    const activeParticles: PhysicalPrecipitateParticle[] = [];
    let newlySettledMass_g = 0;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.age += dt;

      // Sample fluid convection current
      const [cvx, cvy, cvz] = ConvectionSystem.sampleVelocity(p.x, p.y, p.z, {
        temp_c,
        ambientTemp_c: 25.0,
        heatPower_W,
        viscosity_mPa_s,
        radius,
        liquidBottomY,
        surfaceY
      });

      // Brownian micro-motion (stronger for fine powder like BaSO4, weaker for heavy PbI2 crystals)
      const brownianAmp = this.profile.morphology === 'fine_powder' ? 0.008 : 0.002;
      const bx = Math.sin(p.age * 6.0 + p.brownianSeed) * brownianAmp;
      const bz = Math.cos(p.age * 5.5 + p.brownianSeed) * brownianAmp;

      // Stokes downward gravitational drift (hindered when agitated)
      const agitationSuspension = agitation > 0.1 ? (1.0 - Math.min(0.9, agitation * 0.85)) : 1.0;
      const netVy = -p.sedimentationSpeed * agitationSuspension + cvy * 0.4;

      p.vx = THREE.MathUtils.lerp(p.vx, cvx + bx, dt * 4.0);
      p.vy = THREE.MathUtils.lerp(p.vy, netVy, dt * 5.0);
      p.vz = THREE.MathUtils.lerp(p.vz, cvz + bz, dt * 4.0);

      // Position step
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;

      // Wall boundary clamping
      const rDist = Math.hypot(p.x, p.z);
      const maxR = radius * 0.82;
      if (rDist > maxR) {
        p.x = (p.x / rDist) * maxR;
        p.z = (p.z / rDist) * maxR;
        p.vx = -p.vx * 0.4;
        p.vz = -p.vz * 0.4;
      }

      // Check if reached floor sediment bed
      if (p.y <= liquidBottomY + 0.015 + this.sedimentBed.thickness) {
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
    // Convert scene lengths to centimetres before deriving a bed thickness.
    const sceneToCm = 8.5;
    const floorArea_cm2 = Math.PI * Math.pow(radius * sceneToCm, 2);
    const packedDensity = this.profile.particleDensity_g_cm3 * 0.65;
    this.sedimentBed.thickness = this.sedimentBed.amount_g > 1e-12
      ? Math.min(0.15, Math.max(0.0015, this.sedimentBed.amount_g / (floorArea_cm2 * packedDensity * sceneToCm)))
      : 0;

    // 4. DYNAMIC CLOUDINESS / SUPERNATANT CLARIFICATION
    // When particles settle, cloudiness decreases proportionally as supernatant clears
    const suspendedRatio = suspendedMassTarget_g / Math.max(1e-12, targetMass);
    const rawCloudiness = (this.particles.length / Math.max(1, this.maxParticles)) * this.profile.cloudinessFactor;
    this.cloudiness = THREE.MathUtils.lerp(this.cloudiness, Math.min(1.0, rawCloudiness * suspendedRatio + this.sedimentBed.resuspensionTurbidity), dt * 1.5);
  }
}
