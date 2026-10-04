import * as THREE from 'three';
import { PhysicalPrecipitateParticle, PrecipitateProfile, SedimentBedState } from '../core/SimulationTypes';
import { getPrecipitateProfile } from '../core/SimulationConfig';
import { ConvectionSystem } from './ConvectionSystem';

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
}

export class PrecipitationSystem {
  public particles: PhysicalPrecipitateParticle[] = [];
  public maxParticles: number;
  public profile: PrecipitateProfile;
  public sedimentBed: SedimentBedState;
  public cloudiness = 0; // 0 (clear) to 1.0 (opaque)

  private spawnTimer = 0;
  private nextId = 1;

  constructor(maxParticles = 140, substance = 'BaSO4') {
    this.maxParticles = maxParticles;
    this.profile = getPrecipitateProfile(substance);
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
  }

  public update(dt: number, params: PrecipitationSimulationParams): void {
    if (dt <= 0) return;

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
    const suspendedMassTarget_g = Math.max(0, precipitateAmount_g - this.sedimentBed.amount_g);

    // 1. SPAWN SUSPENDED NUCLEI & PARTICLES IF TARGET MASS EXCEEDS CURRENT PARTICLE POPULATION
    const targetParticleCount = suspendedMassTarget_g > 0.001 
      ? Math.min(this.maxParticles, Math.floor(18 + Math.min(1.0, suspendedMassTarget_g / 0.5) * (this.maxParticles - 18)))
      : 0;

    if (this.particles.length < targetParticleCount) {
      this.spawnTimer += dt * 32;
      while (this.spawnTimer >= 1.0 && this.particles.length < targetParticleCount) {
        this.spawnTimer -= 1.0;

        const angle = Math.random() * Math.PI * 2;
        const rRatio = Math.sqrt(Math.random()) * 0.82;
        const px = Math.cos(angle) * (rRatio * radius);
        const pz = Math.sin(angle) * (rRatio * radius);
        // Nucleate throughout the liquid volume or around mixing zone
        const py = liquidBottomY + 0.04 + Math.random() * (height * 0.92);

        const baseRad = (this.profile.baseParticleRadius_mm / 1000) * 8.5; // scene scale
        const rho_p = this.profile.particleDensity_g_cm3 * 1000; // kg/m3
        const rho_f = density_g_ml * 1000; // kg/m3
        const eta = Math.max(0.0003, viscosity_mPa_s * 0.001); // Pa*s

        // Stokes terminal sedimentation speed: v = 2/9 * (rho_p - rho_f) * g * r^2 / eta
        const deltaRho = Math.max(100, rho_p - rho_f);
        const rPhys = this.profile.baseParticleRadius_mm * 1e-3;
        const stokesV = (2 / 9) * (deltaRho * 9.81 * (rPhys * rPhys)) / eta;
        const sceneSedSpeed = Math.min(0.35, Math.max(0.015, stokesV * 12.0));

        this.particles.push({
          id: this.nextId++,
          x: px,
          y: py,
          z: pz,
          radius: baseRad * (0.8 + Math.random() * 0.4),
          mass_ug: (4 / 3) * Math.PI * Math.pow(rPhys, 3) * rho_p * 1e9,
          density: rho_p,
          vx: (Math.random() - 0.5) * 0.02,
          vy: -sceneSedSpeed,
          vz: (Math.random() - 0.5) * 0.02,
          sedimentationSpeed: sceneSedSpeed,
          aggregationLevel: 1,
          brownianSeed: Math.random() * 20.0,
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
        newlySettledMass_g += (precipitateAmount_g / Math.max(1, this.maxParticles));
        continue;
      }

      activeParticles.push(p);
    }

    this.particles = activeParticles;

    // 3. ACCUMULATE MASS ONTO BOTTOM SEDIMENT BED
    if (newlySettledMass_g > 0) {
      this.sedimentBed.amount_g = Math.min(precipitateAmount_g, this.sedimentBed.amount_g + newlySettledMass_g);
      const floorArea_m2 = Math.PI * (radius * radius);
      const bulkDensity_g_m3 = (this.profile.particleDensity_g_cm3 * 1e6) * 0.65;
      this.sedimentBed.thickness = Math.min(0.25, this.sedimentBed.amount_g / Math.max(0.001, floorArea_m2 * bulkDensity_g_m3));
    }

    // 4. DYNAMIC CLOUDINESS / SUPERNATANT CLARIFICATION
    // When particles settle, cloudiness decreases proportionally as supernatant clears
    const suspendedRatio = suspendedMassTarget_g / Math.max(0.001, precipitateAmount_g);
    const rawCloudiness = (this.particles.length / Math.max(1, this.maxParticles)) * this.profile.cloudinessFactor;
    this.cloudiness = THREE.MathUtils.lerp(this.cloudiness, Math.min(1.0, rawCloudiness * suspendedRatio + this.sedimentBed.resuspensionTurbidity), dt * 1.5);
  }
}
