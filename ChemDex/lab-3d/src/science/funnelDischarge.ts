import type { VesselState } from '../types/chemistry';
import { phaseDensities, phaseVolumes, separatedLayers } from './liquidLayers';
import { solveStockLiquidSurface } from './stockLiquidSurface';
import { getVesselProfile } from '../pour/physics/profiles';
import { solveLevel } from '../pour/physics/retained';
import { vesselContours } from './vesselContours';
import { vesselInterior } from './vesselDimensions';
import { GRAVITY_M_S2, metersPerModelUnit } from './sceneUnits';
import type { Point3 } from './clippedSolidVolume';
import { segArea } from '../pour/physics/roundPlaneVolume';

export interface PortFlux { flow_ml_s: number; wetArea_model2: number; speed_m_s: number }
export interface FunnelDischarge {
  basis: 'vented-inertial-port-reference';
  displacementBasis: 'stock-mesh-envelope-reference' | 'liquid-only-reference';
  aqueous: PortFlux; organic: PortFlux; total_ml_s: number;
  portY: number; outletY: number; radius: number; lowerOffset: number; topOffset: number;
  normal: Point3; coefficient: number;
}
// Gauss–Legendre 24 with a double sine map smooths both circular edges
// and a zero-pressure endpoint inside the port.
const ORDER = 24;
const rule: { x: number; w: number }[] = [];
for (let i = 1; i <= ORDER; i++) {
  let x = Math.cos(Math.PI * (i - 0.25) / (ORDER + 0.5)), derivative = 0;
  for (let j = 0; j < 20; j++) {
    let a = 1, b = x;
    for (let k = 2; k <= ORDER; k++) { const next = ((2 * k - 1) * x * b - (k - 1) * a) / k; a = b; b = next; }
    derivative = ORDER * (x * b - a) / (x * x - 1);
    const d = b / derivative; x -= d; if (Math.abs(d) < 1e-15) break;
  }
  rule.push({ x, w: 2 / ((1 - x * x) * derivative * derivative) });
}

/** Integrate Cd*sqrt(2gH) over a circular port strip. H(s)=head-slope*s
 * in MODEL units, s is horizontal projection across the disk. Boundaries
 * split at the interface, free surface and zero pressure. No minimum Q. */
export function circularPortFlux(radius: number, low: number, high: number, head: number,
  slope: number, meters: number, coefficient = 0.62): PortFlux {
  const zero = { flow_ml_s: 0, wetArea_model2: 0, speed_m_s: 0 };
  if (![radius, low, high, head, slope, meters, coefficient].every(Number.isFinite)
    || radius <= 0 || meters <= 0 || coefficient <= 0 || slope < 0) return zero;
  low = Math.max(-radius, low); high = Math.min(radius, high);
  if (slope > 0) high = Math.min(high, head / slope);
  else if (!(head > 0)) return zero;
  if (!(high > low)) return zero;
  if (slope === 0) {
    const area = low > 0 ? segArea(radius, -low) - segArea(radius, -high) : segArea(radius, high) - segArea(radius, low);
    const speed = Math.sqrt(2 * GRAVITY_M_S2 * head * meters);
    return { flow_ml_s: coefficient * area * meters * meters * speed * 1e6, wetArea_model2: area, speed_m_s: speed };
  }
  const start = Math.asin(low / radius), end = Math.asin(high / radius);
  let area = 0, flux = 0;
  for (const p of rule) {
    const t = (p.x + 1) * Math.PI / 4, u = start + (end - start) * Math.sin(t) ** 2, s = radius * Math.sin(u);
    const da = 2 * radius * radius * Math.cos(u) ** 2 * (end - start) * Math.sin(2 * t) * Math.PI / 4 * p.w;
    const speed = Math.sqrt(2 * GRAVITY_M_S2 * Math.max(0, head - slope * s) * meters);
    area += da; flux += da * speed;
  }
  return { flow_ml_s: coefficient * flux * meters * meters * 1e6, wetArea_model2: area,
    speed_m_s: area > 0 ? flux / area : 0 };
}

/** Vented, primed-stem inertial reference, not calibrated stopcock hydraulics.
 * Pressure is integrated separately in each phase; a tilted port may expose
 * both fluids or be dry. Stem bore comes from the actual glass contour.
 * Neglects viscosity, capillarity, air entry, losses beyond assumed Cd and
 * pipe two-phase coupling. Stocks keep their current static reference pose. */
export function calculateFunnelDischarge(vessel: VesselState, localUp?: Point3): FunnelDischarge {
  const theta = vessel.rotationZ ?? 0, rawNormal = localUp ?? [Math.sin(theta), Math.cos(theta), 0];
  const norm = Math.hypot(...rawNormal), n: [number, number, number] = norm > 0 && Number.isFinite(norm)
    ? rawNormal.map(x => x / norm) as [number, number, number] : [0, 1, 0];
  const profile = getVesselProfile(vessel.type, vessel.capacity_ml), interior = vesselInterior(vessel.type);
  const stem = vesselContours(vessel.type).inner.filter(([, y]) => y < interior.floorY);
  const radii = stem.filter(([r]) => r > 0).map(([r]) => r), radius = radii.length ? Math.min(...radii) : 0;
  const portY = interior.floorY, outletY = stem.length ? Math.min(...stem.map(([, y]) => y)) : portY;
  const empty = (): PortFlux => ({ flow_ml_s: 0, wetArea_model2: 0, speed_m_s: 0 });
  const result: FunnelDischarge = { basis: 'vented-inertial-port-reference', displacementBasis: 'liquid-only-reference',
    aqueous: empty(), organic: empty(), total_ml_s: 0, portY, outletY, radius, lowerOffset: portY, topOffset: portY,
    normal: n, coefficient: 0.62 };
  if (vessel.type !== 'separatory_funnel' || !(vessel.capacity_ml > 0) || !Number.isFinite(norm) || !(norm > 0)
    || !Number.isFinite(radius) || !Number.isFinite(outletY) || vessel.isSealed || vessel.isShattered
    || !vessel.stopcockOpen || !(vessel.volume_ml > 0)) return result;
  const volumes = phaseVolumes(vessel), densities = phaseDensities(vessel), layers = separatedLayers(vessel);
  if ((volumes.aqueous > 0 && !(densities.aqueous > 0)) || (volumes.organic > 0 && !(densities.organic > 0))) return result;
  const density = Math.max(densities.aqueous, densities.organic), horizontal = Math.hypot(n[0], n[2]);
  const tilt = Math.atan2(horizontal, n[1]);
  const surface = (amount: number) => solveStockLiquidSurface(vessel, n, density, amount);
  const top = surface(vessel.volume_ml), lower = surface(layers.lowerVolume_ml);
  const c2 = top?.c ?? solveLevel(profile, tilt, vessel.volume_ml).c;
  const c1 = lower?.c ?? solveLevel(profile, tilt, layers.lowerVolume_ml).c;
  result.topOffset = c2; result.lowerOffset = c1;
  if (top) result.displacementBasis = top.basis;
  const rho1 = densities[layers.lower], upper = layers.lower === 'organic' ? 'aqueous' : 'organic';
  const rho2 = layers.upperVolume_ml > 0 ? densities[upper] : rho1;
  const center = n[1] * portY, drop = n[1] * (portY - outletY), meters = metersPerModelUnit(profile);
  if (horizontal < 1e-15) {
    if (!(c2 > center)) return result;
    const phase = c1 > center ? layers.lower : upper;
    const head = c1 > center ? c1 - center + rho2 / rho1 * (c2 - c1) + drop : c2 - center + drop;
    result[phase] = circularPortFlux(radius, -radius, radius, head, 0, meters);
  } else {
    const interfaceS = (c1 - center) / horizontal, topS = (c2 - center) / horizontal;
    result[layers.lower] = circularPortFlux(radius, -radius, Math.min(interfaceS, topS),
      c1 - center + rho2 / rho1 * (c2 - c1) + drop, horizontal, meters);
    if (layers.upperVolume_ml > 0) result[upper] = circularPortFlux(radius, interfaceS, topS, c2 - center + drop, horizontal, meters);
  }
  result.total_ml_s = result.aqueous.flow_ml_s + result.organic.flow_ml_s;
  return result;
}
