import { vesselContours, type ContourPoint } from './vesselContours';

export interface VesselInterior {
  points: readonly ContourPoint[];
  floorY: number;
  height: number;
  topY: number;
  volume: number;
  maximumRadius: number;
}
const interiors = new Map<string, VesselInterior>();
const supported = new Set(['beaker', 'flask', 'cylinder', 'test_tube', 'watch_glass',
  'evaporating_dish', 'crucible', 'petri_dish', 'volumetric_flask', 'separatory_funnel',
  'filter_funnel', 'mortar_pestle', 'condenser', 'wash_bottle', 'burette', 'reagent_bottle']);
const frustum = (a: number, b: number, height: number) => Math.PI * height * (a * a + a * b + b * b) / 3;

/** Linear interpolation along the exact polyline revolved by the glass mesh. */
export function contourRadius(points: readonly ContourPoint[], y: number): number {
  let radius = points[0]?.[0] ?? 0;
  for (let i = 1; i < points.length; i++) {
    const [r0, y0] = points[i - 1], [r1, y1] = points[i];
    if (y1 <= y0) { if (y >= y1) radius = r1; continue; }
    if (y < y0) return radius;
    if (y <= y1) return r0 + (r1 - r0) * (y - y0) / (y1 - y0);
    radius = r1;
  }
  return radius;
}

/** Exact integral of pi*r(y)^2 for each straight contour segment. */
export function contourVolumeBelow(points: readonly ContourPoint[], levelY: number): number {
  let volume = 0;
  for (let i = 1; i < points.length; i++) {
    const [r0, y0] = points[i - 1], [r1, y1] = points[i];
    if (y1 <= y0 || levelY <= y0) continue;
    const height = Math.min(y1, levelY) - y0;
    const endRadius = r0 + (r1 - r0) * height / (y1 - y0);
    volume += frustum(r0, endRadius, height);
  }
  return volume;
}

export function vesselInterior(type: string): VesselInterior {
  const key = supported.has(type) ? type : 'beaker';
  const cached = interiors.get(key);
  if (cached) return cached;
  // Stock bottle has its own modeled body, separate from placed glassware.
  const contour: readonly ContourPoint[] = key === 'reagent_bottle'
    ? [[0, -0.92], [0.35, -0.92], [0.35, 0.2], [0.14, 0.5], [0.14, 0.95]]
    : vesselContours(key).inner;
  // Dry outlet stems below a closed stopcock/filter are not reservoir capacity.
  const cutoff = key === 'separatory_funnel' ? -0.45 : key === 'filter_funnel' ? -0.1 : contour[0][1];
  const points: ContourPoint[] = [[0, cutoff], [contourRadius(contour, cutoff), cutoff],
    ...contour.filter(([, y]) => y > cutoff)];
  const topY = points[points.length - 1][1];
  const result = { points, floorY: cutoff, topY, height: topY - cutoff,
    volume: contourVolumeBelow(points, topY), maximumRadius: Math.max(...points.map(([r]) => r)) };
  interiors.set(key, result);
  return result;
}

export function liquidGeometry(type: string) {
  const { floorY, height } = vesselInterior(type);
  return { floorY, height };
}

export function liquidLevelForVolume(type: string, volume_ml: number, capacity_ml: number): number {
  const interior = vesselInterior(type);
  if (!(volume_ml > 0) || !(capacity_ml > 0)) return interior.floorY;
  if (volume_ml >= capacity_ml) return interior.topY;
  let remaining = interior.volume * volume_ml / capacity_ml;
  for (let i = 1; i < interior.points.length; i++) {
    const [r0, y0] = interior.points[i - 1], [r1, y1] = interior.points[i];
    if (!(y1 > y0)) continue;
    const volume = frustum(r0, r1, y1 - y0);
    if (remaining > volume) { remaining -= volume; continue; }
    const slope = (r1 - r0) / (y1 - y0);
    const radius = Math.cbrt(Math.max(0, r0 ** 3 + 3 * slope * remaining / Math.PI));
    const denominator = Math.PI * (r0 * r0 + r0 * radius + radius * radius);
    const height = denominator > 0 ? 3 * remaining / denominator : 0;
    return Math.max(y0, Math.min(y1, y0 + height));
  }
  return interior.topY;
}

/** Scene volume per mL, calibrated against the entire reservoir interior.
 * This is a model capacity, not certified volumetric-glassware calibration. */
export function solidSceneVolume(vessel: { type: string; capacity_ml: number }, volume_ml: number): number {
  return Math.max(0, volume_ml) * vesselInterior(vessel.type).volume / Math.max(1e-9, vessel.capacity_ml);
}

export function vesselInnerRadius(type: string, heightAboveBase: number): number {
  const interior = vesselInterior(type);
  return contourRadius(interior.points, interior.floorY + heightAboveBase);
}

export function solidSupportFloor(type: string, horizontalRadius: number): number {
  const interior = vesselInterior(type);
  for (let i = 1; i < interior.points.length; i++) {
    const [r0, y0] = interior.points[i - 1], [r1, y1] = interior.points[i];
    if (r0 >= horizontalRadius) return y0;
    if (r1 >= horizontalRadius && r1 > r0) return y0 + (y1 - y0) * (horizontalRadius - r0) / (r1 - r0);
  }
  return interior.floorY;
}

export function solidBlockDimensions(vessel: { type: string; capacity_ml: number }, volume_ml: number) {
  const volume = solidSceneVolume(vessel, volume_ml);
  const width = Math.min(Math.cbrt(volume * 2), vesselInterior(vessel.type).maximumRadius * Math.SQRT2 * 0.96);
  return { width, height: width > 0 ? volume / (width * width) : 0,
    floorY: solidSupportFloor(vessel.type, width / Math.SQRT2) };
}
