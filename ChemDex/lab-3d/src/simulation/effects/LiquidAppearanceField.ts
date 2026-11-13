import { Color } from 'three';
import type { VortexSurface } from '../../science/liquidVortex';

export interface LiquidAppearanceInput {
  color: string;
  turbidity: number;
  radius: number;
  baseY: number;
  fillY: number;
  contact?: readonly number[];
  contactColor?: string;
  reactionRate_s1?: number;
  agitation?: number;
  vortex?: VortexSurface;
}
const N = 12, CHANNELS = 4;
const clamp = (x: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, x));

/** Transient optical transport, not a second chemistry/concentration ledger.
 * Chemistry supplies the endpoint. A contact jet, shared vortex and coarse
 * dispersion carry the appearance there continuously at a fixed 30 Hz.
 * The small RGBA atlas is linear RGB plus suspended-solid optical density. */
export class LiquidAppearanceField {
  readonly size = N;
  readonly pixels = new Uint8Array(N * N * N * CHANNELS);
  private values = new Float32Array(this.pixels.length);
  private next = new Float32Array(this.pixels.length);
  private target = new Color();
  private feed = new Color();
  private ready = false;
  private accumulator = 0;
  private lastContact?: number[];
  private idle_s = 0;
  private age_s = 0;
  private endpointKey = '';
  private settled = true;
  revision = 0;
  radius = 1;
  baseY = 0;
  depth = 1;
  reset() { this.ready = false; this.accumulator = this.age_s = this.idle_s = 0; this.lastContact = undefined; this.settled = true; this.endpointKey = ''; }
  advance(dt: number, input: LiquidAppearanceInput) {
    if (![dt, input.radius, input.baseY, input.fillY, input.turbidity].every(Number.isFinite)
      || dt < 0 || input.radius <= 0 || input.fillY <= input.baseY) return;
    this.radius = input.radius; this.baseY = input.baseY; this.depth = input.fillY - input.baseY;
    this.target.set(input.color);
    const key = `${input.color}:${Math.round(clamp(input.turbidity) * 255)}:${input.contact ? input.contactColor ?? '' : ''}`;
    this.feed.set(input.contactColor ?? input.color);
    if (!this.ready) {
      for (let i = 0; i < this.values.length; i += 4) this.values.set([this.target.r, this.target.g, this.target.b, clamp(input.turbidity)], i);
      this.ready = true; this.publish();
      this.endpointKey = key;
    }
    if (!(dt > 0)) return;
    if (input.contact?.length === 3 && input.contact.every(Number.isFinite)) {
      this.lastContact = [...input.contact]; this.idle_s = 0;
    } else this.idle_s += dt;
    if (key !== this.endpointKey) { if (this.settled) this.age_s = 0; this.settled = false; this.endpointKey = key; }
    if (this.settled) return;
    this.accumulator += dt;
    while (this.accumulator >= 1 / 30 - 1e-10) {
      this.step(1 / 30, input); this.accumulator = Math.max(0, this.accumulator - 1 / 30);
    }
  }
  /** Normalized coordinates, also used by the shader atlas sampler. */
  sample(x: number, y: number, z: number, channel = 0) {
    const gx = clamp(x) * (N - 1), gy = clamp(y) * (N - 1), gz = clamp(z) * (N - 1);
    const ix = Math.min(N - 2, Math.floor(gx)), iy = Math.min(N - 2, Math.floor(gy)), iz = Math.min(N - 2, Math.floor(gz));
    const fx = gx - ix, fy = gy - iy, fz = gz - iz;
    let value = 0;
    for (let dz = 0; dz < 2; dz++) for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++)
      value += this.values[((iy + dy) * N * N + (iz + dz) * N + ix + dx) * 4 + channel]
        * (dx ? fx : 1 - fx) * (dy ? fy : 1 - fy) * (dz ? fz : 1 - fz);
    return value;
  }
  private step(dt: number, input: LiquidAppearanceInput) {
    this.age_s += dt;
    const stir = clamp(input.agitation ?? 0), vortex = input.vortex;
    const source = this.lastContact ?? [0, input.fillY, 0];
    const sx = clamp(source[0] / this.radius, -0.8, 0.8) * this.radius;
    const sz = clamp(source[2] / this.radius, -0.8, 0.8) * this.radius;
    const sy = clamp((source[1] - this.baseY) / this.depth);
    // A submerged jet broadens as it entrains liquid. Unresolved recirculation
    // relaxes the bulk only after the local front has had time to establish.
    const recirculation = this.lastContact && this.age_s > 0.65 ? 0.28 + stir * 0.65 : this.lastContact ? 0 : 0.8;
    const diffusion = 0.09 + stir * 0.18 + (input.contact ? 0.07 : 0);
    const endpoint = [this.target.r, this.target.g, this.target.b, clamp(input.turbidity)];
    const fresh = [this.feed.r, this.feed.g, this.feed.b];
    let changed = false, maximumError = 0;
    for (let y = 0; y < N; y++) for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
      const nx = x / (N - 1), ny = y / (N - 1), nz = z / (N - 1);
      const px = (nx * 2 - 1) * this.radius, pz = (nz * 2 - 1) * this.radius;
      const omega = vortex ? vortex.angularSpeed_rad_s / (1 + (px * px + pz * pz) / vortex.coreRadius ** 2) : 0;
      const a = -omega * dt, cs = Math.cos(a), sn = Math.sin(a);
      const bx = ((px * cs - pz * sn) / this.radius + 1) / 2, bz = ((px * sn + pz * cs) / this.radius + 1) / 2;
      const below = Math.max(0, sy - ny), width = this.radius * (0.13 + below * 0.18);
      const jet = ny <= sy + 0.08 ? Math.exp(-((px - sx) ** 2 + (pz - sz) ** 2) / (2 * width ** 2)) * Math.exp(-below * 1.8) : 0;
      const sourceRate = jet * (input.contact ? 18 : 5 * Math.exp(-this.idle_s / 1.5));
      // Incoming colored stock is visible in the fresh jet even when its bulk
      // reaction product is colorless. Reaction removes that color downstream;
      // it never paints the whole receiver with the feed's stock color.
      const feedFraction = input.contact && input.contactColor
        ? Math.exp(-below * (7 + Math.max(0, input.reactionRate_s1 ?? 0) * 1.5)) * sourceRate / Math.max(1e-12, sourceRate + recirculation) : 0;
      const blend = -Math.expm1(-(sourceRate + recirculation) * dt);
      const i = (y * N * N + z * N + x) * 4;
      for (let c = 0; c < 4; c++) {
        const carried = this.sample(bx, ny, bz, c);
        const neighbors = (this.values[i + c + (x < N - 1 ? 4 : 0)] + this.values[i + c - (x > 0 ? 4 : 0)]
          + this.values[i + c + (y < N - 1 ? N * N * 4 : 0)] + this.values[i + c - (y > 0 ? N * N * 4 : 0)]
          + this.values[i + c + (z < N - 1 ? N * 4 : 0)] + this.values[i + c - (z > 0 ? N * 4 : 0)]) / 6;
        const dispersed = carried + (neighbors - carried) * diffusion;
        const localTarget = c < 3 ? endpoint[c] + (fresh[c] - endpoint[c]) * feedFraction : endpoint[c];
        this.next[i + c] = clamp(dispersed + (localTarget - dispersed) * blend);
        changed ||= Math.abs(this.next[i + c] - this.values[i + c]) > 1 / 1024;
        maximumError = Math.max(maximumError, Math.abs(this.next[i + c] - endpoint[c]));
      }
    }
    [this.values, this.next] = [this.next, this.values];
    if (changed) this.publish();
    if (maximumError < 1 / 512) this.settled = true;
  }
  private publish() { for (let i = 0; i < this.pixels.length; i++) this.pixels[i] = Math.round(clamp(this.values[i]) * 255); this.revision++; }
}
