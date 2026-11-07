import { Matrix4, Quaternion, Vector3 } from 'three';
import { clippedSolidVolume, type Point3, type SolidClipPlane } from '../science/clippedSolidVolume';
import { vesselBodyTransform } from '../science/vesselScale';
import { vesselInterior } from '../science/vesselDimensions';
import { METERS_PER_SCENE_UNIT as U } from '../science/sceneUnits';
import type { StockImmersion, StockImmersionVessel } from '../science/stockImmersion';
import { compiledBox } from './fluids';

/** Pieces relative to the rigid vessel origin, in SI. The same shapes drive
 * displaced volume in rendering, capacity and source flow. */
export function dynamicImmersion(vessel: StockImmersionVessel): StockImmersion | null {
  if (!vessel.dynamicSolids?.length) return null;
  const t = vesselBodyTransform(vessel), top = (vesselInterior(vessel.type).topY * t.scale + t.offsetY) * U;
  const pieces = vessel.dynamicSolids.map(s => {
    const mesh = compiledBox(s.dimensions_m);
    const matrix = new Matrix4().compose(new Vector3(...s.position_m), new Quaternion(...s.rotation), new Vector3(1, 1, 1));
    return { mesh, matrix, inverse: matrix.clone().invert() };
  });
  const clip = (p: typeof pieces[number], n: Point3, c: number, includeSurface = true): number => {
    const convert = (normal: Point3, offset: number): SolidClipPlane => {
      const e = p.matrix.elements, [x, y, z] = normal;
      return { normal: [e[0] * x + e[1] * y + e[2] * z, e[4] * x + e[5] * y + e[6] * z, e[8] * x + e[9] * y + e[10] * z],
        offset: offset - x * e[12] - y * e[13] - z * e[14] };
    };
    const planes = includeSurface ? [convert(n, c), convert([0, 1, 0], top)] : [convert([0, 1, 0], top)];
    const h2 = n[0] ** 2 + n[2] ** 2;
    let origin: Vector3;
    if (!includeSurface) origin = new Vector3(0, top, 0);
    else if (h2 < 1e-16) {
      if (n[1] < 0) return Math.max(0, clip(p, n, c, false) - clip(p, [0, 1, 0], -c, true));
      planes.splice(0, 2, convert([0, 1, 0], Math.min(top, c / n[1])));
      origin = new Vector3(0, Math.min(top, c / n[1]), 0);
    } else {
      const factor = (c - n[1] * top) / h2;
      origin = new Vector3(n[0] * factor, top, n[2] * factor);
    }
    origin.applyMatrix4(p.inverse);
    return clippedSolidVolume(p.mesh, planes, origin.toArray() as [number, number, number]) * 1e6;
  };
  return { basis: 'dynamic-solid-reference', insideVolume_ml: pieces.reduce((sum, p) => sum + clip(p, [0, 1, 0], top, false), 0),
    displacementMl: (normal, offset) => {
      const c = (offset * t.scale + normal[1] * t.offsetY) * U;
      return pieces.reduce((sum, p) => sum + clip(p, normal, c), 0);
    } };
}
