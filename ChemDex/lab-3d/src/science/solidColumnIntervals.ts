import { vesselInterior } from './vesselDimensions';

/** Height intervals containing an entire vertical cylinder at the given
 * radial reach from the vessel axis. Linear walls make endpoint clipping
 * exact for this conservative envelope. No material scale is changed. */
export function solidColumnIntervals(type: string, radialReach: number, floorOverride?: number, openTop = false): [number, number][] {
  const interior = vesselInterior(type), floor = Math.max(interior.floorY, floorOverride ?? interior.floorY);
  const intervals: [number, number][] = [];
  const append = (a: number, b: number) => {
    if (!(b > a)) return;
    const last = intervals.at(-1);
    if (last && a <= last[1] + interior.height * 1e-12) last[1] = Math.max(last[1], b);
    else intervals.push([a, b]);
  };
  for (let i = 1; i < interior.points.length; i++) {
    const [r0, y0] = interior.points[i - 1], [r1, y1] = interior.points[i];
    if (!(y1 > y0) || y1 <= floor) continue;
    let a = Math.max(floor, y0), b = y1;
    if (r0 === r1) { if (r0 < radialReach) continue; }
    else {
      const crossing = y0 + (radialReach - r0) / (r1 - r0) * (y1 - y0);
      if (r1 > r0) a = Math.max(a, crossing); else b = Math.min(b, crossing);
    }
    append(a, b);
  }
  if (openTop && radialReach <= interior.points.at(-1)![0]) append(Math.max(floor, interior.topY), Infinity);
  return intervals;
}
