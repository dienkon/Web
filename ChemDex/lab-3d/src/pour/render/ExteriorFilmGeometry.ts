import * as THREE from 'three';
import type { PourParcel } from '../../engine/pourTransport';
import type { VesselState } from '../../types/chemistry';
import { wallPointAtTime } from '../../engine/wallFilm';
import { CENTIMETERS_PER_SCENE_UNIT, METERS_PER_SCENE_UNIT } from '../../science/sceneUnits';
import { CircularSheetGeometry, simplifySheetPoints, type CircularSheet } from './CircularSheetGeometry';
import { CombinedTransportGeometry } from './CombinedTransportGeometry';

const VERTICES = 8, INDICES = 36;

/** Closed contour strips. Their volume is the actual Q*dt still supported by
 * the wall, not a clipped decorative thickness. Wet width is prescribed. */
class LegacyExteriorFilmGeometry extends THREE.BufferGeometry {
  private capacity = 0;
  private color = new THREE.Color();
  update(parcels: readonly PourParcel[], vessels: Record<string, VesselState>) {
    const strips = [];
    let segments = 0;
    for (const parcel of parcels) {
      const plan = parcel.wallFilm, vessel = parcel.targetId ? vessels[parcel.targetId] : null;
      if (parcel.stage !== 'overflow' || !plan || !vessel || vessel.isShattered) continue;
      const tail = Math.max(0, parcel.elapsed_s - parcel.duration_s);
      const front = Math.min(plan.points.at(-1)!.time_s, parcel.elapsed_s - parcel.arrivedFraction * parcel.duration_s);
      if (front <= tail + 1e-12) continue;
      const times = [tail, ...plan.points.filter(p => p.time_s > tail && p.time_s < front).map(p => p.time_s), front];
      strips.push({ parcel, vessel, times }); segments += times.length - 1;
    }
    if (segments > this.capacity) {
      if (this.capacity) this.dispose();
      this.capacity = Math.max(32, 2 ** Math.ceil(Math.log2(segments)));
      for (const name of ['position', 'normal', 'color']) this.setAttribute(name,
        new THREE.BufferAttribute(new Float32Array(this.capacity * VERTICES * 3), 3).setUsage(THREE.DynamicDrawUsage));
      const indices = new Uint32Array(this.capacity * INDICES);
      for (let s = 0; s < this.capacity; s++) {
        const base = s * VERTICES;
        for (let i = 0; i < 4; i++) {
          const a = base + i, b = base + (i + 1) % 4;
          indices.set([a, a + 4, b, b, a + 4, b + 4], s * INDICES + i * 6);
        }
        indices.set([base, base + 1, base + 2, base, base + 2, base + 3,
          base + 4, base + 6, base + 5, base + 4, base + 7, base + 6], s * INDICES + 24);
      }
      this.setIndex(new THREE.BufferAttribute(indices, 1));
    }
    this.setDrawRange(0, segments * INDICES);
    if (!segments) return;
    const positions = this.attributes.position.array as Float32Array, colors = this.attributes.color.array as Float32Array;
    let segment = 0;
    for (const { parcel, vessel, times } of strips) {
      const plan = parcel.wallFilm!; this.color.set(parcel.sample.color);
      const angle = plan.angle_rad - (vessel.rotationY ?? 0);
      for (let j = 1; j < times.length; j++) {
        const a = wallPointAtTime(plan, times[j - 1]), b = wallPointAtTime(plan, times[j]);
        const height = a.y - b.y;
        const halfAngle = Math.min(Math.PI / 4, Math.max(1e-6,
          Math.min(a.width_m, b.width_m) / (2 * Math.max(a.radius, b.radius, 1e-9) * METERS_PER_SCENE_UNIT)));
        const ra = a.radius + 0.0001, rb = b.radius + 0.0001;
        const da = Math.max(1e-9, a.thickness_m / METERS_PER_SCENE_UNIT), db = Math.max(1e-9, b.thickness_m / METERS_PER_SCENE_UNIT);
        const volume = parcel.releasedVolume_ml / parcel.duration_s * (times[j] - times[j - 1]) / CENTIMETERS_PER_SCENE_UNIT ** 3;
        // Exact integral of the quadrilateral cross section over this linear
        // contour strip: V = A*lambda² + B*lambda. Stable positive root.
        const factor = height * Math.sin(2 * halfAngle) / 6;
        const quadratic = factor * (da * da + da * db + db * db);
        const linear = factor * (2 * ra * da + ra * db + rb * da + 2 * rb * db);
        const scale = 2 * volume / (linear + Math.sqrt(linear * linear + 4 * quadratic * volume));
        for (let end = 0; end < 2; end++) {
          const point = end ? b : a, inner = end ? rb : ra, outer = inner + scale * (end ? db : da);
          for (let i = 0; i < 4; i++) {
            const theta = angle + (i === 0 || i === 3 ? -halfAngle : halfAngle), radius = i >= 2 ? outer : inner;
            const k = (segment * VERTICES + end * 4 + i) * 3;
            positions[k] = vessel.position[0] + radius * Math.cos(theta); positions[k + 1] = vessel.position[1] + point.y;
            positions[k + 2] = vessel.position[2] + radius * Math.sin(theta);
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

export class ExteriorFilmGeometry extends CombinedTransportGeometry {
  private legacy = new LegacyExteriorFilmGeometry();
  private circular = new CircularSheetGeometry();
  update(parcels: readonly PourParcel[], vessels: Record<string, VesselState>) {
    this.legacy.update(parcels.filter(p => !p.wallFilm?.azimuthSpan_rad), vessels);
    const sheets: CircularSheet[] = [];
    for (const p of parcels) {
      const plan = p.wallFilm, v = p.targetId ? vessels[p.targetId] : null;
      if (p.stage !== 'overflow' || !plan?.azimuthSpan_rad || !v || v.isShattered) continue;
      const tail = Math.max(0, p.elapsed_s - p.duration_s);
      const front = Math.min(plan.points.at(-1)!.time_s, p.elapsed_s - p.arrivedFraction * p.duration_s);
      if (front <= tail + 1e-12) continue;
      const times = [tail, ...plan.points.filter(p => p.time_s > tail && p.time_s < front).map(p => p.time_s), front];
      sheets.push({ center: [v.position[0], v.position[2]], volume_ml: p.releasedVolume_ml / p.duration_s * (front - tail),
        color: p.sample.color, supported: true, points: simplifySheetPoints(times.map(t => {
          const point = wallPointAtTime(plan, t);
          return { y: v.position[1] + point.y, radius: point.radius, thickness: point.thickness_m / METERS_PER_SCENE_UNIT };
        })) });
    }
    this.circular.update(sheets); this.combine([this.legacy, this.circular]);
  }
  override dispose() { this.legacy.dispose(); this.circular.dispose(); super.dispose(); }
}
