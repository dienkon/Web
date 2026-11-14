import type { VesselState } from '../types/chemistry';
import { getWorldVesselProfile } from '../pour/physics/profiles';
import { vesselWorldLiquidSurfaceY } from './vesselGeometry';
import { canStirVessel } from './stirring';

// A 16.8 cm glass rod, 2.45 mm in diameter, in the shared 3.5 cm scene scale.
export const STIRRING_ROD_LENGTH = 4.8;
export const STIRRING_ROD_RADIUS = 0.035;

/** The origin is the lower end of the rod. Keep the entire shaft within the
 * narrowest neck along its path, rather than orbiting its centre through glass. */
export function stirringRodPose(vessel: VesselState, phase: number) {
  if (!canStirVessel(vessel)) return null;
  const profile = getWorldVesselProfile(vessel.type, vessel.capacity_ml);
  const surface = vesselWorldLiquidSurfaceY(vessel);
  const rim = profile.baseY + profile.H;
  const clearance = STIRRING_ROD_RADIUS * 1.5;
  const depth = surface - profile.baseY;
  const tipY = Math.max(profile.baseY + clearance, profile.baseY + depth * 0.28,
    rim + 0.6 - STIRRING_ROD_LENGTH);
  if (!Number.isFinite(tipY) || tipY + clearance >= surface) return null;
  let narrowest = Math.min(profile.mouthR, profile.r(tipY - STIRRING_ROD_RADIUS));
  for (const [r, y] of profile.contour ?? []) {
    if (y >= tipY - STIRRING_ROD_RADIUS && y <= rim) narrowest = Math.min(narrowest, r);
  }
  const usableRadius = narrowest - clearance;
  if (!(usableRadius > 0)) return null;
  const orbitRadius = Math.min(usableRadius * 0.6, 0.35);
  return { tip: [vessel.position[0] + Math.cos(phase) * orbitRadius,
    vessel.position[1] + tipY, vessel.position[2] + Math.sin(phase) * orbitRadius] as [number, number, number],
    rimY: vessel.position[1] + rim, orbitRadius };
}
