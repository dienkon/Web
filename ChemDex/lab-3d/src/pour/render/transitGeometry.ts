import * as THREE from 'three';
import { pourFlightInterval, pourPositionAt, type PourParcel } from '../../engine/pourTransport';
import { SCENE_GRAVITY, streamRadiusForFlow, CENTIMETERS_PER_SCENE_UNIT } from '../../science/sceneUnits';
import { overflowWallTime } from '../../engine/overflowTransport';
import { CircularSheetGeometry, type CircularSheet } from './CircularSheetGeometry';
import { CombinedTransportGeometry } from './CombinedTransportGeometry';

const RINGS = 4, SIDES = 12;
const VERTICES = (RINGS + 1) * (SIDES + 1);
const SIDE_INDICES = RINGS * SIDES * 6;
const INDICES = SIDE_INDICES + 2 * (SIDES - 2) * 3;

/** One batched mesh of released intervals; no curve is drawn ahead of its liquid front. */
class RoundTransitStreamGeometry extends THREE.BufferGeometry {
  private capacity = 0;
  private color = new THREE.Color();
  private centers = new Float64Array((RINGS + 1) * 3);

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
      for (let p = 0; p < this.capacity; p++) for (let i = 1; i < SIDES - 1; i++) {
        const base = p * VERTICES, front = base + RINGS * (SIDES + 1);
        indices.set([base, base + i + 1, base + i], p * INDICES + SIDE_INDICES + (i - 1) * 3);
        indices.set([front, front + i, front + i + 1], p * INDICES + SIDE_INDICES + (SIDES - 2) * 3 + (i - 1) * 3);
      }
      this.setIndex(new THREE.BufferAttribute(indices, 1));
    }
    if (!this.capacity) return;
    const positions = this.attributes.position.array as Float32Array;
    const normals = this.attributes.normal.array as Float32Array;
    const colors = this.attributes.color.array as Float32Array;
    let visible = 0;
    for (const original of parcels) {
      if (original.stage === 'wall') continue;
      const parcel = original.stage === 'overflow' ? { ...original, elapsed_s: original.elapsed_s - overflowWallTime(original) } : original;
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
        this.centers.set([x, y, z], j * 3);
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
      // Close the released interval and correct polygon/time tessellation so
      // the visible liquid volume is Q*(front-tail), rather than inheriting
      // the area deficit of a twelve-sided circle approximation.
      const baseVertex = visible * VERTICES, anchor = baseVertex * 3;
      const ox = positions[anchor], oy = positions[anchor + 1], oz = positions[anchor + 2];
      const indices = this.index!.array;
      let volume = 0;
      for (let i = visible * INDICES; i < (visible + 1) * INDICES; i += 3) {
        const a = indices[i] * 3, b = indices[i + 1] * 3, c = indices[i + 2] * 3;
        const ax = positions[a] - ox, ay = positions[a + 1] - oy, az = positions[a + 2] - oz;
        const bx = positions[b] - ox, by = positions[b + 1] - oy, bz = positions[b + 2] - oz;
        const cx = positions[c] - ox, cy = positions[c + 1] - oy, cz = positions[c + 2] - oz;
        volume += (ax * (by * cz - bz * cy) + ay * (bz * cx - bx * cz) + az * (bx * cy - by * cx)) / 6;
      }
      const target = flow * (front - tail) / CENTIMETERS_PER_SCENE_UNIT ** 3;
      const scale = volume !== 0 ? Math.sqrt(target / Math.abs(volume)) : 1;
      if (Number.isFinite(scale)) for (let j = 0; j <= RINGS; j++) for (let i = 0; i <= SIDES; i++) {
        const k = (baseVertex + j * (SIDES + 1) + i) * 3;
        for (let axis = 0; axis < 3; axis++) positions[k + axis] = this.centers[j * 3 + axis]
          + (positions[k + axis] - this.centers[j * 3 + axis]) * scale;
      }
      visible++;
    }
    for (const name of ['position', 'normal', 'color']) this.attributes[name].needsUpdate = true;
    this.setDrawRange(0, visible * INDICES);
  }
}

export class TransitStreamGeometry extends CombinedTransportGeometry {
  private round = new RoundTransitStreamGeometry();
  private circular = new CircularSheetGeometry();
  update(parcels: readonly PourParcel[]) {
    this.round.update(parcels.filter(p => !p.circularSheet));
    const sheets: CircularSheet[] = [];
    for (const original of parcels) {
      if (!original.circularSheet || original.stage === 'wall' || original.sample.volume_ml <= 0) continue;
      const p = original.stage === 'overflow' ? { ...original, elapsed_s: original.elapsed_s - overflowWallTime(original) } : original;
      const [tail, front] = pourFlightInterval(p);
      if (front <= tail + 1e-12) continue;
      const sheet = p.circularSheet!, flow = p.releasedVolume_ml / p.duration_s;
      const points = Array.from({ length: RINGS + 1 }, (_, i) => {
        const t = tail + (front - tail) * i / RINGS;
        const y = pourPositionAt(p.trajectory, t)[1];
        const radius = Math.max(1e-9, Math.abs(sheet.radius + (sheet.radialVelocity_scene_s ?? 0) * t));
        const verticalSpeed = Math.max(1e-9, Math.abs(p.trajectory.exitVel[1] - SCENE_GRAVITY * t));
        const thickness = flow / (2 * Math.PI * radius * verticalSpeed * CENTIMETERS_PER_SCENE_UNIT ** 3);
        return { y, radius: Math.max(1e-9, radius - thickness / 2), thickness };
      });
      sheets.push({ center: sheet.center, color: p.sample.color, points, volume_ml: flow * (front - tail) });
    }
    this.circular.update(sheets); this.combine([this.round, this.circular]);
  }
  override dispose() { this.round.dispose(); this.circular.dispose(); super.dispose(); }
}
