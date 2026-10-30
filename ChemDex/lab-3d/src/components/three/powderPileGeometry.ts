import * as THREE from 'three';
import { solidSupportFloor, vesselInterior } from '../../science/vesselDimensions';

/** Illustrative 28-degree repose angle and 55% packing. Only the envelope is
 * resolved; individual grains are below scene resolution. Integrate the same
 * revolved contour we render, including rounded glassware bottoms. */
export function createPowderPileGeometry(type: string, bulkSceneVolume: number, maximumRadius: number) {
  const interior = vesselInterior(type), slope = Math.tan(28 * Math.PI / 180);
  const limit = Math.min(interior.maximumRadius * 0.86, maximumRadius);
  const profile = (peak: number) => {
    let low = 0, high = limit;
    for (let i = 0; i < 24; i++) {
      const r = (low + high) / 2;
      if (peak - slope * r >= solidSupportFloor(type, r)) low = r; else high = r;
    }
    const radius = (low + high) / 2;
    const points = Array.from({ length: 25 }, (_, i) => {
      const r = radius * i / 24;
      return new THREE.Vector2(r, solidSupportFloor(type, r));
    });
    points.push(new THREE.Vector2(radius, Math.max(points.at(-1)!.y, peak - slope * radius)), new THREE.Vector2(0, peak));
    return points;
  };
  const volume = (points: THREE.Vector2[]) => Math.abs(points.slice(1).reduce((sum, b, i) => {
    const a = points[i];
    return sum + Math.PI * (b.y - a.y) * (a.x * a.x + a.x * b.x + b.x * b.x) / 3;
  }, 0));
  let low = interior.floorY, high = interior.topY;
  for (let i = 0; i < 32; i++) {
    const peak = (low + high) / 2;
    if (volume(profile(peak)) < bulkSceneVolume) low = peak; else high = peak;
  }
  return new THREE.LatheGeometry(profile((low + high) / 2), 48);
}
