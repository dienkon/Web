import * as THREE from 'three';
import { pourFlightInterval, pourPositionAt, type PourParcel } from '../../engine/pourTransport';
import { SCENE_GRAVITY, streamRadiusForFlow } from '../../science/sceneUnits';

const RINGS = 4, SIDES = 12;
const VERTICES = (RINGS + 1) * (SIDES + 1);
const INDICES = RINGS * SIDES * 6;

/** One batched mesh of released intervals; no curve is drawn ahead of its liquid front. */
export class TransitStreamGeometry extends THREE.BufferGeometry {
  private capacity = 0;
  private color = new THREE.Color();

  update(parcels: readonly PourParcel[]): void {
    if (parcels.length > this.capacity) {
      if (this.capacity) this.dispose();
      this.capacity = Math.max(32, 2 ** Math.ceil(Math.log2(parcels.length)));
      for (const name of ['position', 'normal', 'color']) this.setAttribute(name,
        new THREE.BufferAttribute(new Float32Array(this.capacity * VERTICES * 3), 3).setUsage(THREE.DynamicDrawUsage));
      const indices = new Uint32Array(this.capacity * INDICES);
      for (let p = 0; p < this.capacity; p++) for (let j = 0; j < RINGS; j++) for (let i = 0; i < SIDES; i++) {
        const a = p * VERTICES + j * (SIDES + 1) + i, b = a + SIDES + 1;
        indices.set([a, a + 1, b, a + 1, b + 1, b], p * INDICES + (j * SIDES + i) * 6);
      }
      this.setIndex(new THREE.BufferAttribute(indices, 1));
    }
    if (!this.capacity) return;
    const positions = this.attributes.position.array as Float32Array;
    const normals = this.attributes.normal.array as Float32Array;
    const colors = this.attributes.color.array as Float32Array;
    let visible = 0;
    for (const parcel of parcels) {
      if (parcel.stage === 'wall') continue;
      const [tail, front] = pourFlightInterval(parcel);
      if (front <= tail + 1e-12 || parcel.sample.volume_ml <= 0) continue;
      this.color.set(parcel.sample.color);
      const [vx, vy0, vz] = parcel.trajectory.exitVel;
      const horizontal = Math.hypot(vx, vz);
      const ux = horizontal > 1e-9 ? -vz / horizontal : 1;
      const uz = horizontal > 1e-9 ? vx / horizontal : 0;
      const flow = parcel.releasedVolume_ml / parcel.duration_s;
      for (let j = 0; j <= RINGS; j++) {
        const t = tail + (front - tail) * j / RINGS;
        const [x, y, z] = pourPositionAt(parcel.trajectory, t);
        const vy = vy0 - SCENE_GRAVITY * t, speed = Math.max(1e-9, Math.hypot(vx, vy, vz));
        const radius = streamRadiusForFlow(flow, speed);
        const bx = vy / speed * uz, by = (vz * ux - vx * uz) / speed, bz = -vy / speed * ux;
        for (let i = 0; i <= SIDES; i++) {
          const theta = 2 * Math.PI * i / SIDES, c = Math.cos(theta), s = Math.sin(theta);
          const nx = c * ux + s * bx, ny = s * by, nz = c * uz + s * bz;
          const k = (visible * VERTICES + j * (SIDES + 1) + i) * 3;
          positions[k] = x + nx * radius; positions[k + 1] = y + ny * radius; positions[k + 2] = z + nz * radius;
          normals[k] = nx; normals[k + 1] = ny; normals[k + 2] = nz;
          colors[k] = this.color.r; colors[k + 1] = this.color.g; colors[k + 2] = this.color.b;
        }
      }
      visible++;
    }
    for (const name of ['position', 'normal', 'color']) this.attributes[name].needsUpdate = true;
    this.setDrawRange(0, visible * INDICES);
  }
}
