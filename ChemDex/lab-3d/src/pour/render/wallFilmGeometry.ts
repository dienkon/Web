import * as THREE from 'three';
import type { PourParcel } from '../../engine/pourTransport';
import { wallPointAtTime, wallTimeAtHeight } from '../../engine/wallFilm';
import { METERS_PER_SCENE_UNIT } from '../../science/sceneUnits';
import { vesselLiquidSurfaceY } from '../../science/vesselGeometry';
import type { VesselState } from '../../types/chemistry';

const VERTICES = 8, INDICES = 24;

/** Each strip ends at every contour knot: triangles cannot cut across a neck/shoulder. */
export class WallFilmGeometry extends THREE.BufferGeometry {
  private capacity = 0;
  private color = new THREE.Color();

  update(parcels: readonly PourParcel[], vessels: Record<string, VesselState>): void {
    const strips: { parcel: PourParcel; target: VesselState; times: number[] }[] = [];
    let segments = 0;
    for (const parcel of parcels) {
      const plan = parcel.wallFilm, target = parcel.targetId ? vessels[parcel.targetId] : null;
      if (parcel.stage !== 'wall' || !plan || !target || target.isShattered) continue;
      const tail = Math.max(0, parcel.elapsed_s - parcel.duration_s);
      const front = Math.min(wallTimeAtHeight(plan, vesselLiquidSurfaceY(target)), parcel.elapsed_s - parcel.arrivedFraction * parcel.duration_s);
      if (front <= tail + 1e-12) continue;
      const times = [tail, ...plan.points.filter(p => p.time_s > tail && p.time_s < front).map(p => p.time_s), front];
      strips.push({ parcel, target, times }); segments += times.length - 1;
    }
    if (segments > this.capacity) {
      if (this.capacity) this.dispose();
      this.capacity = Math.max(32, 2 ** Math.ceil(Math.log2(segments)));
      for (const name of ['position', 'normal', 'color']) this.setAttribute(name,
        new THREE.BufferAttribute(new Float32Array(this.capacity * VERTICES * 3), 3).setUsage(THREE.DynamicDrawUsage));
      const indices = new Uint32Array(this.capacity * INDICES);
      for (let p = 0; p < this.capacity; p++) for (let i = 0; i < 4; i++) {
        const a = p * VERTICES + i, b = p * VERTICES + (i + 1) % 4;
        indices.set([a, b, a + 4, b, b + 4, a + 4], p * INDICES + i * 6);
      }
      this.setIndex(new THREE.BufferAttribute(indices, 1));
    }
    this.setDrawRange(0, segments * INDICES);
    if (!segments) return;
    const positions = this.attributes.position.array as Float32Array;
    const colors = this.attributes.color.array as Float32Array;
    let segment = 0;
    for (const { parcel, target, times } of strips) {
      const plan = parcel.wallFilm!;
      this.color.set(parcel.sample.color);
      for (let j = 1; j < times.length; j++) {
        for (let end = 0; end < 2; end++) {
          const point = wallPointAtTime(plan, times[j - 1 + end]);
          const angle = plan.angle_rad - target.rotationY;
          const halfAngle = Math.min(Math.PI, point.width_m / (2 * Math.max(1e-9, point.radius) * METERS_PER_SCENE_UNIT));
          // Radial display of thickness; the contact-angle cross section remains approximate.
          const thickness = Math.min(point.radius, point.thickness_m / METERS_PER_SCENE_UNIT);
          for (let i = 0; i < 4; i++) {
            const a = angle + (i === 0 || i === 3 ? -halfAngle : halfAngle);
            const radius = Math.max(0, point.radius - (i >= 2 ? thickness : 0.0002));
            const k = (segment * VERTICES + end * 4 + i) * 3;
            positions[k] = target.position[0] + radius * Math.cos(a);
            positions[k + 1] = target.position[1] + point.y;
            positions[k + 2] = target.position[2] + radius * Math.sin(a);
            colors[k] = this.color.r; colors[k + 1] = this.color.g; colors[k + 2] = this.color.b;
          }
        }
        segment++;
      }
    }
    this.computeVertexNormals();
    for (const name of ['position', 'normal', 'color']) {
      const attribute = this.attributes[name] as THREE.BufferAttribute;
      attribute.clearUpdateRanges(); attribute.addUpdateRange(0, segments * VERTICES * 3); attribute.needsUpdate = true;
    }
  }
}
