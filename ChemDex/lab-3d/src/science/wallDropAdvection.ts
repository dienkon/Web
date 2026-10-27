import type { ContourPoint } from './vesselContours';
import { METERS_PER_SCENE_UNIT as scale } from './sceneUnits';
import { wallDropMotion, wallSurfaceSection, wallHeightAtMeridian } from './wallDropletGeometry';

/** Piecewise-exact advection for the existing quasi-steady drop closure.
 * Mass/T stay fixed during this transport stage. Each straight wall segment
 * has constant force/drag/speed. Split time at corners and recompute mobility;
 * a lower segment may pin the drop. Horizontal rim dynamics remain unsolved. */
export function advanceWallDrop(mass_g: number, temperature_c: number, points: readonly ContourPoint[],
  initialY: number, dt_s: number, options: {
    lowerBoundaryMeridian?: number;
    sectionAt?: (y: number) => ReturnType<typeof wallSurfaceSection>;
  } = {}) {
  const sectionAt = options.sectionAt ?? ((y: number) => wallSurfaceSection(points,y));
  let frame = sectionAt(initialY);
  const result = { ...wallDropMotion(mass_g,temperature_c,frame.metric), y: initialY,
    distance_m: 0, movingTime_s: 0 };
  if (![initialY,dt_s].every(Number.isFinite) || dt_s<0 || Number.isNaN(options.lowerBoundaryMeridian)) {
    result.speed_m_s=0;result.motionLimit='invalid-advection-input';return result;
  }
  let remaining=dt_s;
  const stop=(options.lowerBoundaryMeridian ?? -Infinity)+result.contactRadius_m/scale;
  // Downward travel can cross each contour height at most once, plus the
  // first/last metric extension. There is no timestep or distance cutoff.
  for(let crossing=0;remaining>0 && crossing<points.length+2;crossing++){
    if(result.motionLimit || !(result.speed_m_s>0) || frame.meridian<=stop) return result;
    let lowerY=-Infinity;
    for(let i=1;i<points.length;i++){
      const y0=points[i-1][1],y1=points[i][1];
      if(y1>y0 && y0<result.y) lowerY=Math.max(lowerY,y0);
    }
    const corner=Number.isFinite(lowerY)?sectionAt(lowerY).meridian:-Infinity;
    const boundary=Math.max(stop,corner);
    const available=frame.meridian-boundary;
    const proposed=result.speed_m_s*remaining/scale;
    if(proposed<available || !Number.isFinite(boundary)){
      result.y=wallHeightAtMeridian(points,frame.meridian-proposed);
      result.distance_m+=proposed*scale;result.movingTime_s+=remaining;return result;
    }
    const travelTime=available*scale/result.speed_m_s;
    result.y=boundary===corner?lowerY:wallHeightAtMeridian(points,boundary);
    result.distance_m+=available*scale;result.movingTime_s+=travelTime;
    remaining=Math.max(0,remaining-travelTime);
    if(boundary===stop) return result;
    frame=sectionAt(result.y);
    Object.assign(result,wallDropMotion(mass_g,temperature_c,frame.metric));
  }
  return result;
}
