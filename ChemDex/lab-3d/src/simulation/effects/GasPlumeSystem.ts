import { PRNG } from '../../core/rng';
import { METERS_PER_SCENE_UNIT } from '../../science/sceneUnits';
import type { PhysicalEvaporationParticle } from '../core/SimulationTypes';
import type { VesselProfile } from '../../pour/physics/profiles';

export interface GasChamber {
  profile: VesselProfile;
  bottomY: number;
  sourcePoint?: readonly number[];
  sealed: boolean;
  /** Downward delivery from the tip of an actual gas inlet tube. */
  inletJet?: boolean;
  /** An explicitly drawn outlet; a stopper alone does not authorize escape. */
  vent?: readonly [number, number, number];
}
export function validGasChamber(chamber?: GasChamber) {
  return !chamber || ([chamber.bottomY, chamber.profile.baseY, chamber.profile.H].every(Number.isFinite)
    && chamber.profile.H > 0 && (!chamber.sourcePoint || chamber.sourcePoint.length === 3 && chamber.sourcePoint.every(Number.isFinite))
    && (!chamber.vent || chamber.vent.every(Number.isFinite)));
}

export interface GasPlumeInput {
  chamber?: GasChamber;
  sourceToWorld?: (point: [number, number, number]) => [number, number, number];
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
  chamber?: GasChamber;
  local?: [number, number, number];
  toWorld?: GasPlumeInput['sourceToWorld'];
  releaseAt?: number;
  released?: boolean;
  releaseFrom?: [number, number, number];
  releasedAt?: number;
  chamberClosed?: boolean;
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
  public get pendingGas_mol() { return this.queue.reduce((sum, q) => sum + q.seconds * q.input.mol_s, 0); }
  constructor(public maxParticles = 140, private rng = new PRNG()) {}
  public reset() {
    this.particles = []; this.queue = []; this.accumulator = this.credit = 0;
    this.acceptedSeconds = this.integratedSeconds = this.acceptedGas_mol = this.integratedGas_mol = 0;
    this.nextId = 1; this.rng.reset();
  }
  public update(dt: number, input: GasPlumeInput) {
    if (![dt, input.rate, input.mol_s, input.temperature_c, input.ambient_c, input.molarMass,
      input.mouthY, input.mouthRadius, input.floorY, input.wind_m_s].every(Number.isFinite) || dt <= 0 || input.rate < 0 || input.mol_s < 0
      || input.molarMass <= 0 || input.temperature_c <= -273.15 || input.ambient_c <= -273.15 || input.mouthRadius < 0 || !validGasChamber(input.chamber)) return;
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
      const r = sinking ? input.mouthRadius * (0.88 + this.rng.next() * 0.22) : Math.sqrt(this.rng.next()) * input.mouthRadius * 0.88;
      const chamber = input.chamber;
      const baseSize = chamber ? Math.min(0.085, chamber.profile.H * 0.045) * (0.8 + this.rng.next() * 0.4) : 0.12 + this.rng.next() * 0.06;
      const local: [number, number, number] = chamber ? [chamber.sourcePoint?.[0] ?? 0,
        chamber.sourcePoint?.[1] ?? chamber.bottomY + 0.08, chamber.sourcePoint?.[2] ?? 0]
        : [Math.cos(angle) * r, input.mouthY + 0.04, Math.sin(angle) * r];
      if (chamber) this.boundLocal(local, chamber, baseSize);
      const birth = input.sourceToWorld?.(local) ?? local;
      this.particles.push({ id: this.nextId++, x: birth[0], y: birth[1], z: birth[2],
        vx: Math.cos(angle) * 0.08, vy: 0, vz: Math.sin(angle) * 0.08, age: 0,
        life: chamber ? 11 + this.rng.next() * 3 : 3.4 + this.rng.next() * 1.2, size: baseSize, baseSize, opacity: 0.64,
        curlSeed: this.rng.next() * 20, sourceTemperature: input.temperature_c, ambient: input.ambient_c, molarMass: input.molarMass,
        ...(chamber ? { chamber, local, toWorld: input.sourceToWorld,
          chamberClosed: chamber.sealed && !chamber.vent,
          releaseAt: 0.8 - Math.log(Math.max(1e-6, this.rng.next())) * (chamber.vent ? 2.5 : 1.2) } : {}) });
    }
    for (const p of this.particles) {
      p.age += dt;
      if (p.chamber && !p.released) {
        // Keep the interior attached to the current vessel; all packet clocks
        // remain on the fixed simulation timeline, including after dosing ends.
        const chamber = input.chamber ?? p.chamber;
        p.chamber = chamber; p.toWorld = input.sourceToWorld ?? p.toWorld;
        const local = p.local!;
        const canEscape = !chamber.sealed || !!chamber.vent;
        if (canEscape && p.chamberClosed) { p.releaseAt = p.age + 0.8; p.chamberClosed = false; }
        if (!canEscape) { p.chamberClosed = true; p.releaseFrom = undefined; }
        if (canEscape && p.age >= p.releaseAt!) {
          p.releaseFrom ??= [...local];
          const top = chamber.profile.baseY + chamber.profile.H;
          const outlet = chamber.vent ?? [local[0] * 0.6, top + 0.05, local[2] * 0.6];
          const f = Math.min(1, (p.age - p.releaseAt!) / 0.8);
          // Reach the hole below the stopper first, then travel vertically
          // through its outlet. No diagonal path may cut through the cap.
          const port = [outlet[0], top - p.size, outlet[2]];
          const a = f < 0.65 ? p.releaseFrom : port, b = f < 0.65 ? port : outlet;
          const u = f < 0.65 ? f / 0.65 : (f - 0.65) / 0.35, t = u * u * (3 - 2 * u);
          for (let i = 0; i < 3; i++) local[i] = a[i] + (b[i] - a[i]) * t;
          if (f === 1) { p.released = true; p.releasedAt = p.age; p.life = p.age + 3.8; p.baseSize = p.size; }
        } else {
          local[0] += Math.sin(p.age * 1.4 + p.curlSeed) * chamber.profile.H * 0.18 * dt;
          local[2] += Math.cos(p.age * 1.1 + p.curlSeed) * chamber.profile.H * 0.18 * dt;
          local[1] += (0.055 + Math.sin(p.age + p.curlSeed) * 0.025
            - (chamber.inletJet ? 0.3 * Math.exp(-p.age / 1.1) : 0)) * chamber.profile.H * dt;
          p.size = Math.min(p.baseSize * (1 + p.age * 0.45), chamber.profile.H * 0.09);
          this.boundLocal(local, chamber, p.size);
        }
        const world = p.toWorld?.(local) ?? local;
        [p.x, p.y, p.z] = world;
        p.opacity = 0.64 * -Math.expm1(-p.age / 0.3) * Math.exp(-p.age * 0.035);
        continue;
      }
      const contrast = 1 - gasDensityRatio(p.molarMass, p.sourceTemperature, p.ambient, p.age);
      const targetY = 0.6 * Math.sign(contrast) * Math.sqrt(Math.abs(contrast));
      const smoothing = 1 - Math.exp(-2.5 * dt);
      p.vx += (input.wind_m_s * 0.6 / METERS_PER_SCENE_UNIT + Math.sin(p.y * 3.2 + p.curlSeed) * 0.05 - p.vx) * smoothing;
      p.vz += (Math.cos(p.y * 2.8 + p.curlSeed) * 0.05 - p.vz) * smoothing;
      p.vy += (targetY - p.vy) * smoothing;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (p.y < input.floorY) { p.y = input.floorY; p.vy = Math.max(0, p.vy); }
      p.size = p.baseSize * (1 + 2.6 * (p.age - (p.releasedAt ?? 0)) / (p.life - (p.releasedAt ?? 0)));
      p.opacity *= Math.exp(-dt * 0.55);
    }
    this.particles = this.particles.filter(p => p.age < p.life);
  }
  private boundLocal(point: [number, number, number], chamber: GasChamber, size: number) {
    const top = chamber.profile.baseY + chamber.profile.H;
    const bottom = Math.min(top - size * 2, Math.max(chamber.profile.baseY, chamber.bottomY));
    point[1] = Math.max(bottom + size, Math.min(top - size, point[1]));
    const radius = Math.max(0, chamber.profile.r(point[1]) - size * 1.15), r = Math.hypot(point[0], point[2]);
    if (r > radius) { point[0] *= radius / r; point[2] *= radius / r; }
  }
}
