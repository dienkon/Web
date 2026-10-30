import type { VesselState } from '../types/chemistry';
import { vesselInterior } from './vesselDimensions';
import { vesselOuterDimensions, vesselContours } from './vesselContours';
import { CENTIMETERS_PER_SCENE_UNIT, METERS_PER_SCENE_UNIT } from './sceneUnits';

type SizedVessel = { type: string; capacity_ml: number };
type PosedVessel = SizedVessel & Pick<VesselState, 'position' | 'rotationY' | 'rotationZ'>;

/** Model-local coordinates remain convenient for shared meshes/particles.
 * This affine transform gives them one physical world scale. Anchor the
 * modeled bottom so capacity changes do not move an existing support contact. */
export function vesselBodyTransform(v: SizedVessel) {
  const volume = vesselInterior(v.type).volume;
  const scale = v.capacity_ml > 0 && Number.isFinite(v.capacity_ml) && volume > 0
    ? Math.cbrt(v.capacity_ml / (volume * CENTIMETERS_PER_SCENE_UNIT ** 3)) : 1;
  return { scale, offsetY: vesselOuterDimensions(v.type).bottomY * (1 - scale),
    metersPerLocalUnit: METERS_PER_SCENE_UNIT * scale };
}

export function vesselLocalToWorld(v: PosedVessel, point: readonly [number, number, number]): [number, number, number] {
  const { scale, offsetY } = vesselBodyTransform(v), tilt = v.rotationZ ?? 0, yaw = v.rotationY ?? 0;
  const x = point[0] * scale, y = point[1] * scale + offsetY, z = point[2] * scale;
  const rx = x * Math.cos(tilt) - y * Math.sin(tilt), ry = x * Math.sin(tilt) + y * Math.cos(tilt);
  return [v.position[0] + rx * Math.cos(yaw) + z * Math.sin(yaw), v.position[1] + ry,
    v.position[2] - rx * Math.sin(yaw) + z * Math.cos(yaw)];
}

export function vesselWorldToLocal(v: PosedVessel, point: readonly [number, number, number]): [number, number, number] {
  const { scale, offsetY } = vesselBodyTransform(v), tilt = v.rotationZ ?? 0, yaw = v.rotationY ?? 0;
  const dx = point[0] - v.position[0], dy = point[1] - v.position[1], dz = point[2] - v.position[2];
  const x = dx * Math.cos(yaw) - dz * Math.sin(yaw), z = dx * Math.sin(yaw) + dz * Math.cos(yaw);
  return [(x * Math.cos(tilt) + dy * Math.sin(tilt)) / scale,
    (-x * Math.sin(tilt) + dy * Math.cos(tilt) - offsetY) / scale, z / scale];
}

export function vesselWorldDimensions(v: SizedVessel) {
  const dimensions = vesselOuterDimensions(v.type), { scale, offsetY } = vesselBodyTransform(v);
  return { topY: dimensions.topY * scale + offsetY, bottomY: dimensions.bottomY,
    rimRadius: dimensions.rimRadius * scale, baseRadius: dimensions.baseRadius * scale, height: dimensions.height * scale };
}

export function vesselWorldContours(v: SizedVessel) {
  const contours = vesselContours(v.type), { scale, offsetY } = vesselBodyTransform(v);
  const convert = (points: typeof contours.outer) => points.map(([r, y]) => [r * scale, y * scale + offsetY] as const);
  return { outer: convert(contours.outer), inner: convert(contours.inner) };
}
