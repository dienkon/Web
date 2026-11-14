import type { VesselProfile } from '../../pour/physics/profiles';
import { liquidLevelForVolume } from '../../science/vesselDimensions';
import type { LiquidPlane, Point3 } from './liquidParticleFrame';
import { createPolygonBedVolume } from './polygonBedVolume';

/** First contact for a new bed, including a glass wall that becomes the floor
 * when the vessel lies on its side. The support of a linear lathe contour is
 * attained at a contour endpoint. No positive sediment mass is invented. */
export function sedimentSupportPlane(profile: VesselProfile, normal: Point3): LiquidPlane {
  const horizontal = Math.hypot(normal[0], normal[2]);
  const offset = Math.min(...(profile.contour ?? [[profile.r(profile.baseY), profile.baseY],
    [profile.mouthR, profile.baseY + profile.H]]).map(([r, y]) => normal[1] * y - horizontal * r));
  return { normal: [...normal], offset };
}

export function sedimentPlane(profile: VesselProfile, volume_ml: number, normal: Point3): LiquidPlane {
  const tilt = Math.atan2(Math.hypot(normal[0], normal[2]), normal[1]);
  const factor = 48 * Math.sin(2 * Math.PI / 48) / (2 * Math.PI);
  if (tilt < 1e-8) return { normal: [...normal], offset: liquidLevelForVolume(profile.type, volume_ml / factor, profile.capacity_ml) };
  const target = volume_ml / profile.sceneScale ** 3;
  const volumeBelow = createPolygonBedVolume(profile, normal);
  let low = Infinity, high = -Infinity;
  for (const [r, y] of profile.contour ?? []) {
    const h = Math.hypot(normal[0], normal[2]) * r;
    low = Math.min(low, normal[1] * y - h); high = Math.max(high, normal[1] * y + h);
  }
  for (let i = 0; i < 40; i++) {
    const mid = (low + high) / 2;
    if (volumeBelow(mid) < target) low = mid; else high = mid;
  }
  return { normal: [...normal], offset: (low + high) / 2 };
}
