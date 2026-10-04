import * as THREE from 'three';
import { PhysicalEvaporationParticle, EvaporationRegime } from '../core/SimulationTypes';
import { determineEvaporationRegime } from '../chemistry/PhaseEngine';

export interface EvaporationSimulationParams {
  temp_c: number;
  surfaceArea_cm2: number;
  radius: number;
  surfaceY: number;
  mouthY: number;
  mouthRadius: number;
  isBoiling: boolean;
  airflowVector?: [number, number, number];
}

export class EvaporationSystem {
  public particles: PhysicalEvaporationParticle[] = [];
  public maxParticles: number;
  public regime: EvaporationRegime = 'AMBIENT_DORMANT';
  public currentRate_ml_s = 0;

  private spawnTimer = 0;
  private nextId = 1;

  constructor(maxParticles = 60) {
    this.maxParticles = maxParticles;
    this.particles = [];
  }

  public reset(): void {
    this.particles = [];
    this.spawnTimer = 0;
  }

  public update(dt: number, params: EvaporationSimulationParams): { evaporated_ml: number } {
    if (dt <= 0) return { evaporated_ml: 0 };

    const {
      temp_c,
      surfaceArea_cm2,
      radius,
      surfaceY,
      mouthY,
      mouthRadius,
      isBoiling,
      airflowVector = [0, 0, 0]
    } = params;

    // 1. CALCULATE EVAPORATION REGIME AND PHYSICAL VAPORIZATION RATE
    const { regime, rate_ml_s } = determineEvaporationRegime(temp_c, surfaceArea_cm2, isBoiling);
    this.regime = regime;
    this.currentRate_ml_s = rate_ml_s;
    const evaporated_ml = rate_ml_s * dt;

    // 2. DETERMINE VISUAL VAPOR PUFF SPAWN RATE
    let visualSpawnRate = 0;
    let baseParticleSize = 0.035;

    switch (regime) {
      case 'AMBIENT_DORMANT':
        visualSpawnRate = temp_c >= 25 ? 0.8 : 0; // Very sparse wisps at room temp
        baseParticleSize = 0.025;
        break;
      case 'LOW_EVAPORATION':
        visualSpawnRate = 3.5;
        baseParticleSize = 0.030;
        break;
      case 'MODERATE_EVAPORATION':
        visualSpawnRate = 9.0;
        baseParticleSize = 0.038;
        break;
      case 'HIGH_THERMAL_EVAPORATION':
        visualSpawnRate = 18.0;
        baseParticleSize = 0.045;
        break;
      case 'VAPOR_PLUME':
        visualSpawnRate = 32.0;
        baseParticleSize = 0.052;
        break;
    }

    // 3. SPAWN PARTICLES AT MENISCUS SURFACE OR MOUTH
    if (visualSpawnRate > 0 && this.particles.length < this.maxParticles) {
      this.spawnTimer += dt * visualSpawnRate;
      while (this.spawnTimer >= 1.0 && this.particles.length < this.maxParticles) {
        this.spawnTimer -= 1.0;

        const angle = Math.random() * Math.PI * 2;
        // Disperse across the full exposed surface radius of the vessel
        const effectiveR = Math.max(0.12, radius * 0.88);
        const r = Math.sqrt(Math.random() * 0.9 + 0.1) * effectiveR;

        const px = Math.cos(angle) * r;
        const pz = Math.sin(angle) * r;
        // Spawns directly on the liquid surface
        const py = surfaceY + (Math.random() - 0.5) * 0.015;

        const baseSize = baseParticleSize * (0.9 + Math.random() * 0.35);
        const verticalSpeed = 0.42 + (temp_c / 100) * 0.65;
        // Gentle outward radial drift
        const outwardSpeed = 0.04 + Math.random() * 0.04;
        const vx = Math.cos(angle) * outwardSpeed + (Math.random() - 0.5) * 0.03;
        const vz = Math.sin(angle) * outwardSpeed + (Math.random() - 0.5) * 0.03;

        this.particles.push({
          id: this.nextId++,
          x: px,
          y: py,
          z: pz,
          vx,
          vy: verticalSpeed + (Math.random() - 0.5) * 0.1,
          vz,
          size: baseSize,
          baseSize,
          age: 0,
          life: 1.2 + Math.random() * 0.8,
          opacity: 0.35 * Math.min(1.0, 0.2 + (temp_c / 100) * 0.8),
          curlSeed: Math.random() * 20.0
        });
      }
    }

    // 4. STEP SIMULATION OF VAPOR PUFFS (Airflow drift, convection lift, atmospheric diffusion)
    const activeParticles: PhysicalEvaporationParticle[] = [];

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.age += dt;

      if (p.age >= p.life) {
        continue;
      }

      // Convective thermal upward acceleration
      p.vy += 0.28 * dt;

      // Atmospheric draft curl with natural 3D curl turbulence
      const curlX = Math.sin(p.y * 3.8 + p.curlSeed) * 0.06;
      const curlZ = Math.cos(p.y * 3.2 + p.curlSeed) * 0.06;

      // Influence by external airflow vector (e.g. ambient breeze / fume hood draft)
      const airDriftX = airflowVector[0] * 0.6;
      const airDriftY = airflowVector[1] * 0.6;
      const airDriftZ = airflowVector[2] * 0.6;

      p.vx = THREE.MathUtils.lerp(p.vx, curlX + airDriftX, dt * 2.5);
      p.vy = THREE.MathUtils.lerp(p.vy, p.vy + airDriftY, dt * 2.0);
      p.vz = THREE.MathUtils.lerp(p.vz, curlZ + airDriftZ, dt * 2.5);

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;

      // Expansion and soft opacity decay into air
      const progress = p.age / p.life;
      p.size = p.baseSize * (1.0 + progress * 2.6);
      p.opacity = THREE.MathUtils.lerp(p.opacity, 0.0, dt * 1.5);

      activeParticles.push(p);
    }

    this.particles = activeParticles;
    return { evaporated_ml };
  }
}
