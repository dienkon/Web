import { PRNG } from '../../core/rng';
import { METERS_PER_SCENE_UNIT } from '../../science/sceneUnits';
import type { PhysicalEvaporationParticle } from '../core/SimulationTypes';

export interface GasPlumeInput {
  rate: number; // display packets/s, already authorized by measured species exhaust
  mol_s: number;
  temperature_c: number;
  ambient_c: number;
  molarMass: number;
  mouthY: number;
  mouthRadius: number;
  floorY: number;
  wind_m_s: number;
}
interface GasPacket extends PhysicalEvaporationParticle {
  sourceTemperature: number;
  ambient: number;
  molarMass: number;
}

/** Ideal-gas density contrast relative to air at the same pressure.
 * Mixing/temperature relaxation are illustrative, not measured entrainment. */
export function gasDensityRatio(molarMass: number, temperature_c: number, ambient_c: number, age = 0) {
  const fraction = Math.exp(-Math.max(0, age));
  const mixtureMass = 28.96 + (molarMass - 28.96) * fraction;
  const mixtureT = ambient_c + (temperature_c - ambient_c) * Math.exp(-Math.max(0, age) / 0.8);
  return mixtureMass / 28.96 * (ambient_c + 273.15) / (mixtureT + 273.15);
}

export class GasPlumeSystem {
  public particles: GasPacket[] = [];
  public readonly fixedDt = 1 / 120;
  public acceptedSeconds = 0;
  public integratedSeconds = 0;
  public acceptedGas_mol = 0;
  public integratedGas_mol = 0;
  private accumulator = 0;
  private queue: { seconds: number; input: GasPlumeInput }[] = [];
  private credit = 0;
  private nextId = 1;
  public get pendingSeconds() { return this.accumulator; }
  constructor(public maxParticles = 140, private rng = new PRNG()) {}
  public reset() {
    this.particles = []; this.queue = []; this.accumulator = this.credit = 0;
    this.acceptedSeconds = this.integratedSeconds = this.acceptedGas_mol = this.integratedGas_mol = 0;
    this.nextId = 1; this.rng.reset();
  }
  public update(dt: number, input: GasPlumeInput) {
    if (![dt, ...Object.values(input)].every(Number.isFinite) || dt <= 0 || input.rate < 0 || input.mol_s < 0
      || input.molarMass <= 0 || input.temperature_c <= -273.15 || input.ambient_c <= -273.15 || input.mouthRadius < 0) return;
    this.queue.push({ seconds: dt, input: { ...input } });
    this.accumulator += dt; this.acceptedSeconds += dt; this.acceptedGas_mol += dt * input.mol_s;
    let steps = 0;
    while (this.accumulator + 1e-12 >= this.fixedDt && steps++ < 240) {
      let remaining = this.fixedDt;
      while (remaining > 1e-12 && this.queue.length) {
        const first = this.queue[0], h = Math.min(remaining, first.seconds);
        this.step(h, first.input);
        this.integratedSeconds += h; this.integratedGas_mol += h * first.input.mol_s;
        remaining -= h; first.seconds -= h;
        if (first.seconds < 1e-12) this.queue.shift();
      }
      this.accumulator = Math.max(0, this.accumulator - this.fixedDt);
    }
  }
  private step(dt: number, input: GasPlumeInput) {
    const validRate = input.mol_s > 0 ? input.rate : 0;
    this.credit += dt * validRate;
    while (this.credit >= 1) {
      this.credit -= 1;
      if (this.particles.length >= this.maxParticles) continue;
      const angle = this.rng.next() * Math.PI * 2;
      const sinking = gasDensityRatio(input.molarMass, input.temperature_c, input.ambient_c) > 1;
      const r = sinking ? input.mouthRadius + 0.04 : Math.sqrt(this.rng.next()) * input.mouthRadius * 0.88;
      const baseSize = 0.045 + this.rng.next() * 0.025;
      this.particles.push({ id: this.nextId++, x: Math.cos(angle) * r, y: input.mouthY + 0.04, z: Math.sin(angle) * r,
        vx: Math.cos(angle) * 0.08, vy: 0, vz: Math.sin(angle) * 0.08, age: 0,
        life: 2.4 + this.rng.next() * 0.6, size: baseSize, baseSize, opacity: 0.4,
        curlSeed: this.rng.next() * 20, sourceTemperature: input.temperature_c, ambient: input.ambient_c, molarMass: input.molarMass });
    }
    for (const p of this.particles) {
      p.age += dt;
      const contrast = 1 - gasDensityRatio(p.molarMass, p.sourceTemperature, p.ambient, p.age);
      const targetY = 0.6 * Math.sign(contrast) * Math.sqrt(Math.abs(contrast));
      const smoothing = 1 - Math.exp(-2.5 * dt);
      p.vx += (input.wind_m_s * 0.6 / METERS_PER_SCENE_UNIT + Math.sin(p.y * 3.2 + p.curlSeed) * 0.05 - p.vx) * smoothing;
      p.vz += (Math.cos(p.y * 2.8 + p.curlSeed) * 0.05 - p.vz) * smoothing;
      p.vy += (targetY - p.vy) * smoothing;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (p.y < input.floorY) { p.y = input.floorY; p.vy = Math.max(0, p.vy); }
      p.size = p.baseSize * (1 + 2.6 * p.age / p.life);
      p.opacity *= Math.exp(-dt * 1.2);
    }
    this.particles = this.particles.filter(p => p.age < p.life);
  }
}
