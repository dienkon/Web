import * as THREE from 'three';
import { PhysicalEvaporationParticle, EvaporationRegime } from '../core/SimulationTypes';
import { determineEvaporationRegime } from '../chemistry/PhaseEngine';
import { waterPlumeVisibility } from '../../science/waterSurface';
import { PRNG } from '../../core/rng';
import { METERS_PER_SCENE_UNIT } from '../../science/sceneUnits';

export interface EvaporationSimulationParams {
  temp_c: number;
  surfaceArea_cm2: number;
  radius: number;
  surfaceY: number;
  mouthY: number;
  mouthRadius: number;
  isBoiling: boolean;
  /** Legacy display proxy at 1 g/mL, not a second solvent sink. */
  actualRate_ml_s?: number;
  /** Authoritative water mass crossing the external vessel boundary. */
  actualRate_g_s?: number;
  ambient_c?: number;
  relativeHumidity?: number;
  pressure_atm?: number;
  sourceWaterPressure_Pa?: number;
  sourceWaterEnthalpy_J_g?: number;
  airflowVector?: [number, number, number];
}

export class EvaporationSystem {
  public particles: PhysicalEvaporationParticle[] = [];
  public maxParticles: number;
  public regime: EvaporationRegime = 'AMBIENT_DORMANT';
  public currentRate_ml_s = 0;
  public currentRate_g_s = 0;

  private spawnTimer = 0;
  private nextId = 1;
  private accumulator = 0;
  private pending: { seconds: number; params: EvaporationSimulationParams & { mistVisibility: number } }[] = [];
  private optics?: { key: string; visibility: number };
  public readonly fixedDt = 1 / 120;
  public acceptedSeconds = 0;
  public integratedSeconds = 0;
  public acceptedVapor_g = 0;
  public integratedVapor_g = 0;
  public get pendingSeconds(): number { return this.accumulator; }

  constructor(maxParticles = 60, private rng = new PRNG()) {
    this.maxParticles = maxParticles;
    this.particles = [];
  }

  public reset(): void {
    this.particles = [];
    this.spawnTimer = 0;
    this.nextId = 1;
    this.accumulator = 0;
    this.pending = [];
    this.optics = undefined;
    this.acceptedSeconds = this.integratedSeconds = this.acceptedVapor_g = this.integratedVapor_g = 0;
    this.currentRate_ml_s = this.currentRate_g_s = 0;
    this.regime = 'AMBIENT_DORMANT';
    this.rng.reset();
  }

  public update(dt: number, params: EvaporationSimulationParams): { evaporated_ml: number } {
    const rate = params.actualRate_g_s ?? params.actualRate_ml_s ?? 0;
    if (![dt, rate, params.temp_c, params.radius, params.surfaceY, params.mouthY, params.mouthRadius,
      params.surfaceArea_cm2, params.ambient_c ?? 25, params.relativeHumidity ?? 0.5, params.pressure_atm ?? 1,
      params.sourceWaterPressure_Pa ?? 0, params.sourceWaterEnthalpy_J_g ?? 0,
      ...(params.airflowVector ?? [0, 0, 0])].every(Number.isFinite) || dt <= 0 || rate < 0
      || (params.sourceWaterPressure_Pa ?? 0) < 0
      || params.radius < 0 || params.mouthRadius < 0 || params.surfaceArea_cm2 < 0 || (params.pressure_atm ?? 1) <= 0
      || (params.relativeHumidity ?? 0.5) < 0 || (params.relativeHumidity ?? 0.5) > 1
      || (params.sourceWaterEnthalpy_J_g ?? 0) < 0
      || params.temp_c < 0 || (params.ambient_c ?? 25) < 0 || (params.ambient_c ?? 25) > 100) {
      return { evaporated_ml: 0 };
    }
    // Preserve source history even when dt is below a substep or work is
    // deferred. A later zero-source frame must not erase or replay that vapor.
    const key = [params.temp_c, params.ambient_c ?? 25, params.relativeHumidity ?? 0.5,
      params.pressure_atm ?? 1, params.sourceWaterPressure_Pa, params.sourceWaterEnthalpy_J_g].join('|');
    if (rate > 0 && this.optics?.key !== key) this.optics = { key, visibility: waterPlumeVisibility(params.temp_c,
      params.ambient_c ?? 25, params.relativeHumidity ?? 0.5, params.pressure_atm ?? 1,
      params.sourceWaterPressure_Pa, params.sourceWaterEnthalpy_J_g) };
    const snapshot = { ...params, actualRate_g_s: rate, mistVisibility: rate > 0 ? this.optics!.visibility : 0,
      airflowVector: [...(params.airflowVector ?? [0, 0, 0])] as [number, number, number] };
    this.pending.push({ seconds: dt, params: snapshot });
    this.accumulator += dt;
    this.acceptedSeconds += dt;
    this.acceptedVapor_g += rate * dt;
    this.currentRate_ml_s = rate; // legacy readout assumes 1 g/mL; never a mass sink
    this.currentRate_g_s = rate;
    let steps = 0;
    while (this.accumulator + 1e-12 >= this.fixedDt && steps++ < 240) {
      let remaining = this.fixedDt;
      while (remaining > 1e-12 && this.pending.length) {
        const first = this.pending[0];
        const seconds = Math.min(remaining, first.seconds);
        this.step(seconds, first.params);
        this.integratedSeconds += seconds;
        this.integratedVapor_g += first.params.actualRate_g_s! * seconds;
        remaining -= seconds;
        first.seconds -= seconds;
        if (first.seconds < 1e-12) this.pending.shift();
      }
      this.accumulator = Math.max(0, this.accumulator - this.fixedDt);
    }
    // Compatibility receipt only: the thermal engine already removed this mass.
    return { evaporated_ml: rate * dt };
  }

  private step(dt: number, params: EvaporationSimulationParams & { mistVisibility: number }): void {

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

    // Regime is a descriptive label. Temperature never authorizes a mass source.
    const { regime } = determineEvaporationRegime(temp_c, surfaceArea_cm2, isBoiling);
    this.regime = regime;
    const sourceRate_g_s = params.actualRate_g_s ?? 0;

    // 2. DETERMINE VISUAL VAPOR PUFF SPAWN RATE
    let baseParticleSize = 0.035;

    switch (regime) {
      case 'AMBIENT_DORMANT':
        baseParticleSize = 0.025;
        break;
      case 'LOW_EVAPORATION':
        baseParticleSize = 0.030;
        break;
      case 'MODERATE_EVAPORATION':
        baseParticleSize = 0.038;
        break;
      case 'HIGH_THERMAL_EVAPORATION':
        baseParticleSize = 0.045;
        break;
      case 'VAPOR_PLUME':
        baseParticleSize = 0.052;
        break;
    }

    const visibility = params.mistVisibility;
    const visualSpawnRate = radius > 0 && mouthRadius > 0 ? Math.min(32, sourceRate_g_s * 180) * visibility : 0;
    // 3. SPAWN PARTICLES AT MENISCUS SURFACE OR MOUTH
    if (visualSpawnRate > 0) {
      this.spawnTimer += dt * visualSpawnRate;
      while (this.spawnTimer >= 1.0) {
        this.spawnTimer -= 1.0;
        // Drop display packets when full; do not bank an artificial later burst.
        if (this.particles.length >= this.maxParticles) continue;

        const angle = this.rng.next() * Math.PI * 2;
        // Disperse across the full exposed surface radius of the vessel
        const effectiveR = Math.max(0, Math.min(radius, mouthRadius) * 0.88);
        const r = Math.sqrt(this.rng.next()) * effectiveR;

        const px = Math.cos(angle) * r;
        const pz = Math.sin(angle) * r;
        // Mist is drawn outside the mouth; the vapor travelling through the
        // headspace remains transparent and cannot clip the glass shoulders.
        const py = Math.max(surfaceY, mouthY) + 0.015;

        const baseSize = baseParticleSize * (0.9 + this.rng.next() * 0.35);
        const verticalSpeed = 0.42 + (temp_c / 100) * 0.65;
        // Gentle outward radial drift
        const outwardSpeed = 0.04 + this.rng.next() * 0.04;
        const vx = Math.cos(angle) * outwardSpeed + (this.rng.next() - 0.5) * 0.03;
        const vz = Math.sin(angle) * outwardSpeed + (this.rng.next() - 0.5) * 0.03;

        this.particles.push({
          id: this.nextId++,
          x: px,
          y: py,
          z: pz,
          vx,
          vy: verticalSpeed + (this.rng.next() - 0.5) * 0.1,
          vz,
          size: baseSize,
          baseSize,
          age: 0,
          life: 1.2 + this.rng.next() * 0.8,
          opacity: 0.35 * Math.min(1.0, 0.2 + (temp_c / 100) * 0.8),
          curlSeed: this.rng.next() * 20.0
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

      // Atmospheric draft curl with natural 3D curl turbulence
      const curlX = Math.sin(p.y * 3.8 + p.curlSeed) * 0.06;
      const curlZ = Math.cos(p.y * 3.2 + p.curlSeed) * 0.06;

      // Influence by external airflow vector (e.g. ambient breeze / fume hood draft)
      // Input wind is m/s; particle coordinates use scene units. Entrainment
      // fraction is an illustrative plume closure, not a calibrated CFD model.
      const airDriftX = airflowVector[0] * 0.6 / METERS_PER_SCENE_UNIT;
      const airDriftY = airflowVector[1] * 0.6 / METERS_PER_SCENE_UNIT;
      const airDriftZ = airflowVector[2] * 0.6 / METERS_PER_SCENE_UNIT;

      p.vx = THREE.MathUtils.lerp(p.vx, curlX + airDriftX, 1 - Math.exp(-dt * 2.5));
      p.vy = THREE.MathUtils.lerp(p.vy, 0.42 + (temp_c / 100) * 0.65 + airDriftY, 1 - Math.exp(-dt * 2.5));
      p.vz = THREE.MathUtils.lerp(p.vz, curlZ + airDriftZ, 1 - Math.exp(-dt * 2.5));

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;

      // Expansion and soft opacity decay into air
      const progress = p.age / p.life;
      p.size = p.baseSize * (1.0 + progress * 2.6);
      p.opacity *= Math.exp(-dt * 1.5);

      activeParticles.push(p);
    }

    this.particles = activeParticles;
  }
}
